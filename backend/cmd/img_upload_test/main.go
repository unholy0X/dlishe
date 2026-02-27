// Smoke test for Cookidoo image upload flow.
//
// Usage:
//
//	COOKIDOO_EMAIL=x@x.com COOKIDOO_PASSWORD=xxx go run ./cmd/img_upload_test/ \
//	  -img /path/to/image.jpg \
//	  -recipe 01KJEEDX93ZYR2PKGDRRKMAQ3M
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	authBaseURL     = "https://ch.tmmobile.vorwerk-digital.com/ciam/auth/token"
	authBasicHeader = "Basic a3VwZmVyd2Vyay1jbGllbnQtbndvdDpMczUwT04xd295U3FzMWRDZEpnZQ=="
	cloudinaryURL   = "https://api-eu.cloudinary.com/v1_1/vorwerk-users-gc/image/upload"
	cloudinaryKey   = "993585863591145"
	uploadPreset    = "prod-customer-recipe-signed"
	customCoords    = "0,5,1000,990"
	locale          = "fr-FR"
	country         = "fr"
)

func main() {
	imgPath := flag.String("img", "", "Path to image file (required)")
	recipeID := flag.String("recipe", "", "Cookidoo recipe ID (required)")
	flag.Parse()

	if *imgPath == "" || *recipeID == "" {
		fmt.Fprintln(os.Stderr, "Usage: -img /path/to/image.jpg -recipe RECIPE_ID")
		os.Exit(1)
	}

	email := os.Getenv("COOKIDOO_EMAIL")
	password := os.Getenv("COOKIDOO_PASSWORD")
	if email == "" || password == "" {
		fmt.Fprintln(os.Stderr, "Set COOKIDOO_EMAIL and COOKIDOO_PASSWORD env vars")
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Step 1 — Authenticate
	fmt.Println("Step 1: Authenticating with Cookidoo...")
	token, err := login(ctx, email, password)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Login failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("  ✓ Token obtained (%.20s...)\n", token)

	// Step 2 — Get upload signature
	fmt.Println("Step 2: Getting upload signature...")
	ts := time.Now().Unix()
	sig, err := getSignature(ctx, token, ts)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Signature failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("  ✓ Signature: %s\n", sig)

	// Step 3 — Upload image to Cloudinary
	fmt.Printf("Step 3: Uploading image %s to Cloudinary...\n", *imgPath)
	publicID, err := uploadToCloudinary(ctx, *imgPath, sig, ts)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Cloudinary upload failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("  ✓ Cloudinary public_id: %s\n", publicID)

	// Step 4 — PATCH recipe with image
	fmt.Printf("Step 4: Patching recipe %s with image...\n", *recipeID)
	if err := patchRecipeImage(ctx, token, *recipeID, publicID+".jpg"); err != nil {
		fmt.Fprintf(os.Stderr, "Patch failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("  ✓ Recipe updated with image!")
	fmt.Printf("\nView: https://cookidoo.%s/created-recipes/%s/%s\n", country, locale, *recipeID)
}

// ── Step 1: Auth ──────────────────────────────────────────────────────────────

func login(ctx context.Context, email, password string) (string, error) {
	data := url.Values{}
	data.Set("grant_type", "password")
	data.Set("username", email)
	data.Set("password", password)
	data.Set("client_id", "kupferwerk-client-nwot")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, authBaseURL,
		strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", authBasicHeader)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("auth HTTP %d: %s", resp.StatusCode, body)
	}

	var tok struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(body, &tok); err != nil {
		return "", fmt.Errorf("parse token: %w", err)
	}
	if tok.AccessToken == "" {
		return "", fmt.Errorf("empty access token in response: %s", body)
	}
	return tok.AccessToken, nil
}

// ── Step 2: Signature ─────────────────────────────────────────────────────────

func getSignature(ctx context.Context, token string, ts int64) (string, error) {
	endpoint := fmt.Sprintf("https://cookidoo.%s/created-recipes/%s/image/signature",
		country, locale)

	payload := map[string]any{
		"timestamp":          ts,
		"source":             "uw",
		"custom_coordinates": customCoords,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Printf("  [debug] signature response HTTP %d: %s\n", resp.StatusCode, respBody)

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("signature HTTP %d: %s", resp.StatusCode, respBody)
	}

	var sig struct {
		Signature string `json:"signature"`
	}
	if err := json.Unmarshal(respBody, &sig); err != nil {
		return "", fmt.Errorf("parse signature: %w", err)
	}
	if sig.Signature == "" {
		return "", fmt.Errorf("empty signature in response")
	}
	return sig.Signature, nil
}

// ── Step 3: Cloudinary upload ─────────────────────────────────────────────────

func uploadToCloudinary(ctx context.Context, imgPath, sig string, ts int64) (string, error) {
	imgFile, err := os.Open(imgPath)
	if err != nil {
		return "", fmt.Errorf("open image: %w", err)
	}
	defer imgFile.Close()

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)

	fields := map[string]string{
		"upload_preset":      uploadPreset,
		"source":             "uw",
		"signature":          sig,
		"timestamp":          strconv.FormatInt(ts, 10),
		"api_key":            cloudinaryKey,
		"custom_coordinates": customCoords,
	}
	for k, v := range fields {
		if err := w.WriteField(k, v); err != nil {
			return "", fmt.Errorf("write field %s: %w", k, err)
		}
	}

	part, err := w.CreateFormFile("file", filepath.Base(imgPath))
	if err != nil {
		return "", fmt.Errorf("create form file: %w", err)
	}
	if _, err := io.Copy(part, imgFile); err != nil {
		return "", fmt.Errorf("copy image: %w", err)
	}
	w.Close()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cloudinaryURL, &buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Origin", "https://widget.cloudinary.com")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Printf("  [debug] cloudinary response HTTP %d\n", resp.StatusCode)

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("cloudinary HTTP %d: %s", resp.StatusCode, respBody)
	}

	var result struct {
		PublicID string `json:"public_id"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parse cloudinary response: %w", err)
	}
	if result.PublicID == "" {
		return "", fmt.Errorf("empty public_id in cloudinary response: %s", respBody)
	}
	return result.PublicID, nil
}

// ── Step 4: Patch recipe ──────────────────────────────────────────────────────

func patchRecipeImage(ctx context.Context, token, recipeID, imagePublicID string) error {
	endpoint := fmt.Sprintf("https://cookidoo.%s/created-recipes/%s/%s",
		country, locale, recipeID)

	payload := map[string]any{
		"image":            imagePublicID,
		"isImageOwnedByUser": true,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Printf("  [debug] patch response HTTP %d: %.200s\n", resp.StatusCode, respBody)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("patch HTTP %d: %s", resp.StatusCode, respBody)
	}
	return nil
}
