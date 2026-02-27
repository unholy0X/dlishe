// Package cookidoo provides a client for the Cookidoo Created Recipes API.
//
// It manages a pool of Cookidoo accounts to work around the 150-recipe-per-account
// limit. Tokens are refreshed automatically in the background every 11 hours
// (access tokens expire at 12 hours). Round-robin is used to spread recipe
// creation across accounts.
package cookidoo

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	// authBaseURL is Vorwerk's CIAM token endpoint (client credentials are
	// embedded in the official Thermomix app and publicly documented).
	authBaseURL = "https://ch.tmmobile.vorwerk-digital.com/ciam/auth/token"

	// authBasicHeader is the Base64-encoded "client_id:client_secret" for the
	// official Thermomix app client. These are hardcoded in the app binary and
	// publicly documented in the cookidoo-api open-source library.
	authBasicHeader = "Basic a3VwZmVyd2Vyay1jbGllbnQtbndvdDpMczUwT04xd295U3FzMWRDZEpnZQ=="

	clientID = "kupferwerk-client-nwot"

	// tokenRefreshInterval is how often background refresh runs (before 12h expiry).
	tokenRefreshInterval = 11 * time.Hour
)

// AccountCredentials holds login details for a single Cookidoo account.
type AccountCredentials struct {
	Email    string
	Password string
}

// account is a runtime account entry with its live token state.
type account struct {
	mu           sync.RWMutex
	email        string
	password     string
	accessToken  string
	refreshToken string
	expiresAt    time.Time
}

func (a *account) getAccessToken() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.accessToken
}

func (a *account) setTokens(access, refresh string, expiresIn int) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.accessToken = access
	a.refreshToken = refresh
	a.expiresAt = time.Now().Add(time.Duration(expiresIn) * time.Second)
}

// Pool manages multiple Cookidoo accounts and distributes recipe creation
// across them using round-robin selection.
type Pool struct {
	accounts   []*account
	counter    atomic.Uint64
	locale     string // e.g. "fr-FR"
	country    string // e.g. "fr"
	httpClient *http.Client
	logger     *slog.Logger
}

// NewPool creates a Pool, performs initial login for all accounts, and starts
// the background token refresh goroutine. ctx is used only for the initial login
// calls; background refresh runs until the returned Pool is no longer referenced.
func NewPool(ctx context.Context, creds []AccountCredentials, locale, country string, logger *slog.Logger) (*Pool, error) {
	if len(creds) == 0 {
		return nil, fmt.Errorf("cookidoo: at least one account is required")
	}

	p := &Pool{
		locale:  locale,
		country: country,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		logger: logger,
	}

	for _, c := range creds {
		a := &account{email: c.Email, password: c.Password}
		if err := p.login(ctx, a); err != nil {
			return nil, fmt.Errorf("cookidoo: initial login failed for %s: %w", c.Email, err)
		}
		p.accounts = append(p.accounts, a)
	}

	go p.refreshLoop()

	return p, nil
}

// CreateRecipe posts a recipe to the Cookidoo Created Recipes API and returns
// the public shareable URL. The recipe is created as PRIVATE first, then
// immediately patched to PUBLIC (two API calls, as required by Cookidoo).
func (p *Pool) CreateRecipe(ctx context.Context, recipe ThermomixRecipe) (string, error) {
	a := p.pickAccount()
	token := a.getAccessToken()

	// Step 1: create an empty recipe shell to obtain an ID.
	recipeID, err := p.postCreate(ctx, token, recipe.Name)
	if err != nil {
		return "", fmt.Errorf("cookidoo: create recipe: %w", err)
	}

	// Step 2: fill in all fields and publish.
	// Wrap string slices into typed RecipeItem objects as the API requires.
	recipe.WorkStatus = "PUBLIC"
	if err := p.patchRecipe(ctx, token, recipeID, recipe); err != nil {
		return "", fmt.Errorf("cookidoo: patch recipe %s: %w", recipeID, err)
	}

	// Step 3 (best-effort): upload thumbnail image if provided.
	if recipe.ThumbnailURL != "" {
		if err := p.uploadImage(ctx, token, recipeID, recipe.ThumbnailURL); err != nil {
			p.logger.Warn("cookidoo: image upload failed (non-fatal)", "recipe_id", recipeID, "err", err)
		}
	}

	publicURL := p.publicURL(recipeID)
	p.logger.Info("cookidoo recipe created", "id", recipeID, "account", a.email, "url", publicURL)
	return publicURL, nil
}

// publicURL returns the shareable Cookidoo link for a created recipe ID.
func (p *Pool) publicURL(recipeID string) string {
	return fmt.Sprintf("https://cookidoo.%s/created-recipes/public/recipes/%s/%s",
		p.country, p.locale, recipeID)
}

// baseURL returns the Created Recipes API base URL for this pool's locale.
func (p *Pool) baseURL() string {
	return fmt.Sprintf("https://cookidoo.%s/created-recipes/%s", p.country, p.locale)
}

// postCreate calls POST /created-recipes/{locale} with just the recipe name
// and returns the new recipe ID.
func (p *Pool) postCreate(ctx context.Context, token, name string) (string, error) {
	body, _ := json.Marshal(createRecipeRequest{RecipeName: name})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL(), bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	p.setHeaders(req, token)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if err := checkStatus(resp); err != nil {
		return "", err
	}

	var out createRecipeResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", fmt.Errorf("decode create response: %w", err)
	}
	if out.RecipeID == "" {
		return "", fmt.Errorf("cookidoo returned empty recipe ID")
	}
	return out.RecipeID, nil
}

// patchRecipe calls PATCH /created-recipes/{locale}/{id} with the full recipe body.
func (p *Pool) patchRecipe(ctx context.Context, token, recipeID string, recipe ThermomixRecipe) error {
	body, err := json.Marshal(recipe)
	if err != nil {
		return err
	}

	endpoint := fmt.Sprintf("%s/%s", p.baseURL(), recipeID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	p.setHeaders(req, token)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return checkStatus(resp)
}

// setHeaders applies the required headers for Cookidoo API calls.
func (p *Pool) setHeaders(req *http.Request, token string) {
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
}

// pickAccount returns the next account in round-robin order.
func (p *Pool) pickAccount() *account {
	idx := p.counter.Add(1) - 1
	return p.accounts[idx%uint64(len(p.accounts))]
}

// refreshLoop runs every tokenRefreshInterval and refreshes all account tokens.
func (p *Pool) refreshLoop() {
	ticker := time.NewTicker(tokenRefreshInterval)
	defer ticker.Stop()
	for range ticker.C {
		for _, a := range p.accounts {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			if err := p.refreshToken(ctx, a); err != nil {
				p.logger.Error("cookidoo token refresh failed, retrying with password login",
					"account", a.email, "err", err)
				// Fallback to full re-login if refresh token is stale.
				if err2 := p.login(ctx, a); err2 != nil {
					p.logger.Error("cookidoo re-login failed", "account", a.email, "err", err2)
				}
			}
			cancel()
		}
	}
}

// login performs a full ROPC password login and stores the tokens on the account.
func (p *Pool) login(ctx context.Context, a *account) error {
	data := url.Values{}
	data.Set("grant_type", "password")
	data.Set("username", a.email)
	data.Set("password", a.password)

	tok, err := p.doTokenRequest(ctx, data)
	if err != nil {
		return err
	}
	a.setTokens(tok.AccessToken, tok.RefreshToken, tok.ExpiresIn)
	return nil
}

// refreshToken uses the stored refresh token to get a new access token.
func (p *Pool) refreshToken(ctx context.Context, a *account) error {
	a.mu.RLock()
	rt := a.refreshToken
	a.mu.RUnlock()

	if rt == "" {
		return fmt.Errorf("no refresh token stored")
	}

	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", rt)
	data.Set("client_id", clientID)

	tok, err := p.doTokenRequest(ctx, data)
	if err != nil {
		return err
	}
	a.setTokens(tok.AccessToken, tok.RefreshToken, tok.ExpiresIn)
	return nil
}

// doTokenRequest sends a form POST to the Vorwerk CIAM token endpoint.
func (p *Pool) doTokenRequest(ctx context.Context, data url.Values) (*tokenResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, authBaseURL,
		strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", authBasicHeader)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if err := checkStatus(resp); err != nil {
		return nil, err
	}

	var tok tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tok); err != nil {
		return nil, fmt.Errorf("decode token response: %w", err)
	}
	if tok.AccessToken == "" {
		return nil, fmt.Errorf("empty access token in response")
	}
	return &tok, nil
}

// checkStatus returns an error if the HTTP response is not 2xx.
func checkStatus(resp *http.Response) error {
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
	return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
}
