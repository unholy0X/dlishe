package thumbnail

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

const maxSize = 5 << 20 // 5MB

// httpClient is a dedicated client with strict timeouts for thumbnail downloads.
var httpClient = &http.Client{
	Timeout: 15 * time.Second,
	Transport: &http.Transport{
		DialContext:           (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
		ResponseHeaderTimeout: 5 * time.Second,
		TLSHandshakeTimeout:  5 * time.Second,
	},
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 3 {
			return fmt.Errorf("too many redirects")
		}
		return nil
	},
}

// Downloader downloads remote thumbnails to local disk.
type Downloader struct {
	dir     string
	baseURL string
}

// NewDownloader creates a thumbnail downloader.
// dir is the local directory to store images.
// baseURL is the public base URL used to construct serving URLs (e.g. "https://api.example.com").
func NewDownloader(dir, baseURL string) *Downloader {
	return &Downloader{dir: dir, baseURL: strings.TrimRight(baseURL, "/")}
}

// EnsureDir creates the thumbnail directory if it doesn't exist.
func (d *Downloader) EnsureDir() error {
	return os.MkdirAll(d.dir, 0o755)
}

// Download fetches the image at url, saves it to disk, and returns the public serving URL.
// If the download fails, it returns an empty string and the error.
func (d *Downloader) Download(ctx context.Context, url string) (string, error) {
	if url == "" {
		return "", fmt.Errorf("empty URL")
	}

	// Upgrade http to https
	if strings.HasPrefix(url, "http://") {
		url = "https://" + url[7:]
	}

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch thumbnail: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	ct := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "image/") {
		return "", fmt.Errorf("not an image: %s", ct)
	}

	// Early rejection if Content-Length is provided and too large
	if resp.ContentLength > maxSize {
		return "", fmt.Errorf("image too large (%d bytes)", resp.ContentLength)
	}

	ext := extensionFromContentType(ct)
	filename := uuid.New().String() + ext

	limited := io.LimitReader(resp.Body, maxSize+1)

	outPath := filepath.Join(d.dir, filename)
	f, err := os.Create(outPath)
	if err != nil {
		return "", fmt.Errorf("create file: %w", err)
	}

	n, copyErr := io.Copy(f, limited)
	closeErr := f.Close()

	if copyErr != nil {
		os.Remove(outPath)
		return "", fmt.Errorf("write file: %w", copyErr)
	}
	if closeErr != nil {
		os.Remove(outPath)
		return "", fmt.Errorf("close file: %w", closeErr)
	}
	if n > maxSize {
		os.Remove(outPath)
		return "", fmt.Errorf("image too large (%d bytes)", n)
	}

	publicURL := d.baseURL + "/api/v1/thumbnails/" + filename
	return publicURL, nil
}

func extensionFromContentType(ct string) string {
	switch {
	case strings.Contains(ct, "jpeg"), strings.Contains(ct, "jpg"):
		return ".jpg"
	case strings.Contains(ct, "png"):
		return ".png"
	case strings.Contains(ct, "webp"):
		return ".webp"
	case strings.Contains(ct, "gif"):
		return ".gif"
	default:
		return ".jpg"
	}
}
