package video

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

// InstagramDownloader downloads Instagram reels/videos using yt-dlp with cookies.
// Instagram requires authentication for all server-side access (even public posts),
// so a Netscape-format cookies file must be provided.
type InstagramDownloader struct {
	tempDir     string
	cookiesPath string // path to Netscape-format cookies.txt
}

// shortcodeRegex extracts the shortcode from various Instagram URL formats:
//   - instagram.com/reel/ABC123
//   - instagram.com/reels/ABC123
//   - instagram.com/p/ABC123
//   - instagram.com/username/reel/ABC123
var shortcodeRegex = regexp.MustCompile(`instagram\.com/(?:[A-Za-z0-9_.]+/)?(?:p|reels?)/([A-Za-z0-9_-]+)`)

// NewInstagramDownloader creates a new Instagram downloader.
// cookiesPath should point to a Netscape-format cookies.txt file with Instagram session.
func NewInstagramDownloader(tempDir, cookiesPath string) *InstagramDownloader {
	return &InstagramDownloader{
		tempDir:     tempDir,
		cookiesPath: cookiesPath,
	}
}

// IsConfigured returns true if the cookies file exists and is readable.
func (d *InstagramDownloader) IsConfigured() bool {
	if d.cookiesPath == "" {
		return false
	}
	info, err := os.Stat(d.cookiesPath)
	return err == nil && !info.IsDir() && info.Size() > 0
}

// ExtractShortcode pulls the shortcode from an Instagram URL.
func ExtractShortcode(rawURL string) (string, error) {
	matches := shortcodeRegex.FindStringSubmatch(rawURL)
	if len(matches) < 2 {
		return "", fmt.Errorf("could not extract shortcode from URL: %s", rawURL)
	}
	return matches[1], nil
}

// Download downloads an Instagram reel/video using yt-dlp with cookies.
// Returns (videoPath, thumbnailURL, error).
func (d *InstagramDownloader) Download(ctx context.Context, rawURL string) (string, string, error) {
	if !d.IsConfigured() {
		return "", "", fmt.Errorf("Instagram cookies not configured — set INSTAGRAM_COOKIES_PATH to a Netscape-format cookies.txt file")
	}

	if err := os.MkdirAll(d.tempDir, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	baseFilename := fmt.Sprintf("ig_%s", uuid.New().String())
	outputPath := filepath.Join(d.tempDir, baseFilename+".%(ext)s")

	// Get thumbnail URL first (best-effort)
	thumbnailURL := d.getThumbnailURL(ctx, rawURL)

	// Download with yt-dlp using cookies
	cmd := exec.CommandContext(ctx, "yt-dlp",
		"--cookies", d.cookiesPath,
		"-f", "b[ext=mp4]/best[ext=mp4]/best",
		"-S", "res:720",
		"--force-overwrites",
		"--no-playlist",
		"-o", outputPath,
		rawURL,
	)

	var stderr strings.Builder
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		// Cleanup partial files
		matches, _ := filepath.Glob(filepath.Join(d.tempDir, baseFilename+".*"))
		for _, m := range matches {
			os.Remove(m)
		}

		stderrStr := stderr.String()
		if strings.Contains(stderrStr, "login") || strings.Contains(stderrStr, "authentication") {
			return "", "", fmt.Errorf("Instagram cookies expired — please refresh the cookies file")
		}
		if strings.Contains(stderrStr, "Private") || strings.Contains(stderrStr, "private") {
			return "", "", fmt.Errorf("this Instagram post is private or has been deleted")
		}
		return "", "", fmt.Errorf("yt-dlp Instagram download failed: %v, stderr: %s", err, stderrStr)
	}

	// Find the downloaded file
	videoMatches, err := filepath.Glob(filepath.Join(d.tempDir, baseFilename+".*"))
	if err != nil || len(videoMatches) == 0 {
		return "", "", fmt.Errorf("download succeeded but file not found")
	}

	var videoPath string
	for _, match := range videoMatches {
		if !strings.HasSuffix(match, ".jpg") && !strings.HasSuffix(match, ".webp") {
			videoPath = match
			break
		}
	}
	if videoPath == "" {
		return "", "", fmt.Errorf("video file not found after download")
	}

	return videoPath, thumbnailURL, nil
}

// GetMetadata fetches video metadata using yt-dlp with cookies.
func (d *InstagramDownloader) GetMetadata(ctx context.Context, rawURL string) (*VideoMetadata, error) {
	if !d.IsConfigured() {
		return nil, fmt.Errorf("Instagram cookies not configured")
	}

	cmd := exec.CommandContext(ctx, "yt-dlp",
		"--cookies", d.cookiesPath,
		"--dump-json",
		"--no-playlist",
		rawURL,
	)

	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("failed to fetch Instagram metadata: %v, stderr: %s", err, stderr.String())
	}

	var ytdlpData struct {
		Title       string  `json:"title"`
		Description string  `json:"description"`
		Duration    float64 `json:"duration"`
		Uploader    string  `json:"uploader"`
	}

	if err := json.Unmarshal([]byte(stdout.String()), &ytdlpData); err != nil {
		return nil, fmt.Errorf("failed to parse metadata JSON: %w", err)
	}

	return &VideoMetadata{
		Title:       ytdlpData.Title,
		Description: ytdlpData.Description,
		Duration:    int(ytdlpData.Duration),
		Uploader:    ytdlpData.Uploader,
	}, nil
}

// Cleanup removes the temporary video file.
func (d *InstagramDownloader) Cleanup(path string) error {
	return os.Remove(path)
}

// getThumbnailURL extracts the thumbnail URL (best-effort, non-fatal).
func (d *InstagramDownloader) getThumbnailURL(ctx context.Context, rawURL string) string {
	cmd := exec.CommandContext(ctx, "yt-dlp",
		"--cookies", d.cookiesPath,
		"--get-thumbnail",
		rawURL,
	)

	var stdout strings.Builder
	cmd.Stdout = &stdout

	if err := cmd.Run(); err != nil {
		return ""
	}
	return strings.TrimSpace(stdout.String())
}
