package cookidoo

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// imageFetchClient is a dedicated HTTP client for fetching recipe thumbnails.
// It blocks connections to private/internal IPs (SSRF protection) and uses
// a separate timeout from the Cookidoo API client so a slow image fetch
// cannot delay the main recipe-publish flow.
var imageFetchClient = &http.Client{
	Timeout: 30 * time.Second,
	Transport: &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, fmt.Errorf("invalid address: %w", err)
			}
			ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
			if err != nil {
				return nil, err
			}
			if len(ips) == 0 {
				return nil, fmt.Errorf("no IP addresses resolved for %s", host)
			}
			for _, ip := range ips {
				if isPrivateImageIP(ip.IP) {
					return nil, fmt.Errorf("blocked: request to private/internal IP %s", ip.IP)
				}
			}
			// Dial the verified IP directly to prevent DNS rebinding attacks.
			dialer := &net.Dialer{Timeout: 10 * time.Second}
			return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].IP.String(), port))
		},
	},
}

// isPrivateImageIP returns true if the IP is in a private, loopback, or link-local range.
func isPrivateImageIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() || ip.IsUnspecified()
}

const (
	cloudinaryURL  = "https://api-eu.cloudinary.com/v1_1/vorwerk-users-gc/image/upload"
	cloudinaryKey  = "993585863591145"
	uploadPreset   = "prod-customer-recipe-signed"
	customCoords   = "0,5,1000,990"
)

// uploadImage uploads the image at imageURL to Cookidoo via a 3-step flow:
//  1. Get a signed upload token from Cookidoo's signature endpoint.
//  2. Upload the image (by URL) to Cloudinary using the signed preset.
//  3. PATCH the created recipe with the resulting Cloudinary public_id.
func (p *Pool) uploadImage(ctx context.Context, token, recipeID, imageURL string) error {
	ts := time.Now().Unix()

	sig, err := p.getUploadSignature(ctx, token, ts)
	if err != nil {
		return fmt.Errorf("get upload signature: %w", err)
	}

	publicID, err := p.uploadToCloudinary(ctx, imageURL, sig, ts)
	if err != nil {
		return fmt.Errorf("cloudinary upload: %w", err)
	}

	if err := p.patchRecipeImage(ctx, token, recipeID, publicID+".jpg"); err != nil {
		return fmt.Errorf("patch recipe image: %w", err)
	}

	p.logger.Info("cookidoo image uploaded", "recipe_id", recipeID, "public_id", publicID)
	return nil
}

// getUploadSignature requests a Cloudinary upload signature from Cookidoo's server.
func (p *Pool) getUploadSignature(ctx context.Context, token string, ts int64) (string, error) {
	endpoint := fmt.Sprintf("%s/image/signature", p.baseURL())

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

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if err := checkStatus(resp); err != nil {
		return "", err
	}

	var sig struct {
		Signature string `json:"signature"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&sig); err != nil {
		return "", fmt.Errorf("decode signature: %w", err)
	}
	if sig.Signature == "" {
		return "", fmt.Errorf("empty signature in response")
	}
	return sig.Signature, nil
}

// uploadToCloudinary downloads the image from imageURL, then uploads the raw bytes
// to Cloudinary as a multipart file — identical to the smoke test that passed.
func (p *Pool) uploadToCloudinary(ctx context.Context, imageURL, sig string, ts int64) (string, error) {
	// Step 1: validate URL scheme before making any network request.
	parsedURL, err := url.Parse(imageURL)
	if err != nil || parsedURL.Scheme != "https" {
		return "", fmt.Errorf("thumbnail URL must use HTTPS scheme, got %q", parsedURL.Scheme)
	}

	// Step 1b: download the thumbnail bytes using the SSRF-safe client.
	// The imageFetchClient blocks connections to private/internal IPs and is
	// separate from the Cookidoo API client to prevent interference.
	fetchReq, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return "", fmt.Errorf("build fetch request: %w", err)
	}
	fetchResp, err := imageFetchClient.Do(fetchReq)
	if err != nil {
		return "", fmt.Errorf("fetch image: %w", err)
	}
	defer fetchResp.Body.Close()
	if fetchResp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("fetch image HTTP %d", fetchResp.StatusCode)
	}
	// Cap image size at 10 MB to prevent excessive memory use.
	imgBytes, err := io.ReadAll(io.LimitReader(fetchResp.Body, 10<<20))
	if err != nil {
		return "", fmt.Errorf("read image bytes: %w", err)
	}

	// Step 2: build multipart body — same field order as the smoke test.
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

	part, err := w.CreateFormFile("file", "image.jpg")
	if err != nil {
		return "", fmt.Errorf("create form file: %w", err)
	}
	if _, err := io.Copy(part, bytes.NewReader(imgBytes)); err != nil {
		return "", fmt.Errorf("write image bytes: %w", err)
	}
	w.Close()

	// Step 3: POST to Cloudinary.
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cloudinaryURL, &buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Origin", "https://widget.cloudinary.com")
	req.Header.Set("X-Requested-With", "XMLHttpRequest")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 32*1024))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("cloudinary HTTP %d: %s", resp.StatusCode, respBody)
	}

	var result struct {
		PublicID string `json:"public_id"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("decode cloudinary response: %w", err)
	}
	if result.PublicID == "" {
		return "", fmt.Errorf("empty public_id in cloudinary response")
	}
	return result.PublicID, nil
}

// patchRecipeImage patches a Cookidoo recipe with a Cloudinary image public_id.
func (p *Pool) patchRecipeImage(ctx context.Context, token, recipeID, imagePublicID string) error {
	endpoint := fmt.Sprintf("%s/%s", p.baseURL(), recipeID)

	payload := map[string]any{
		"image":             imagePublicID,
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

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return checkStatus(resp)
}
