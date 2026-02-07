package video

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

// VideoMetadata contains basic information about the video
type VideoMetadata struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Duration    int    `json:"duration"` // seconds
	Uploader    string `json:"uploader"`
}

// Downloader handles downloading videos from URLs
type Downloader struct {
	tempDir string
}

// NewDownloader creates a new video downloader
func NewDownloader(tempDir string) *Downloader {
	return &Downloader{
		tempDir: tempDir,
	}
}

// allowedHosts is a whitelist of allowed video hosting platforms
var allowedHosts = map[string]bool{
	"youtube.com":       true,
	"www.youtube.com":   true,
	"youtu.be":          true,
	"m.youtube.com":     true,
	"tiktok.com":        true,
	"www.tiktok.com":    true,
	"vm.tiktok.com":     true,
	"instagram.com":     true,
	"www.instagram.com": true,
	"facebook.com":      true,
	"www.facebook.com":  true,
	"fb.watch":          true,
	"vimeo.com":         true,
	"www.vimeo.com":     true,
	"twitter.com":       true,
	"x.com":             true,
	"reddit.com":        true,
	"www.reddit.com":    true,
	"v.redd.it":         true,
}

// dangerousCharsRegex matches shell metacharacters that should definitely NOT be in a URL provided to exec
// We allow ? & = # which are standard URL characters
// We block ; | $ ` ( ) { } < > which are shell control operators
var dangerousCharsRegex = regexp.MustCompile(`[;|$` + "`" + `(){}<>]`)

// validateURL performs strict URL validation to prevent command injection
func validateURL(rawURL string) error {
	if rawURL == "" {
		return fmt.Errorf("empty URL")
	}

	// Check for dangerous shell characters
	if dangerousCharsRegex.MatchString(rawURL) {
		return fmt.Errorf("URL contains invalid characters")
	}

	// Check for newlines/carriage returns (command injection via line breaks)
	if strings.ContainsAny(rawURL, "\n\r") {
		return fmt.Errorf("URL contains invalid characters")
	}

	// Parse URL
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}

	// Must be http or https
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("URL must use http or https scheme")
	}

	// Must have a host
	if parsed.Host == "" {
		return fmt.Errorf("URL must have a host")
	}

	// Extract hostname (without port)
	hostname := parsed.Hostname()

	// Check against whitelist
	if !allowedHosts[hostname] {
		return fmt.Errorf("video platform not supported: %s", hostname)
	}

	// Additional safety: URL length limit
	if len(rawURL) > 2048 {
		return fmt.Errorf("URL too long")
	}

	return nil
}

// Download downloads a video from a URL to a temporary file
// It uses yt-dlp to handle various video platforms (YouTube, TikTok, etc.)
// Returns: (videoPath, thumbnailURL, error)
// NOTE: thumbnailURL is the CDN link, not a local file path
// Context is used to cancel download if job is cancelled or times out
func (d *Downloader) Download(ctx context.Context, rawURL string) (string, string, error) {
	// Validate URL to prevent command injection
	if err := validateURL(rawURL); err != nil {
		return "", "", fmt.Errorf("invalid URL: %w", err)
	}

	// Create temp file path template
	// yt-dlp will add extension, so we just provide base name
	baseFilename := fmt.Sprintf("video_%s", uuid.New().String())
	outputPath := filepath.Join(d.tempDir, baseFilename+".%(ext)s")

	// Ensure temp dir exists
	if err := os.MkdirAll(d.tempDir, 0755); err != nil {
		return "", "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	// First, get the thumbnail URL without downloading
	thumbnailURL, err := d.getThumbnailURL(ctx, rawURL)
	if err != nil {
		// Log but don't fail - thumbnail is optional
		thumbnailURL = ""
	}

	// Prepare yt-dlp command with context for cancellation
	// exec.CommandContext safely passes args without shell
	// This means shell metacharacters in rawURL won't be interpreted
	// But we still validate above for defense in depth
	//
	// CRITICAL: Using CommandContext ensures that if the job is cancelled,
	// the yt-dlp process is terminated, preventing orphaned processes
	//
	// -f best: best quality
	// -S res:720: cap resolution at 720p to save processing time/bandwidth (Gemini doesn't need 4K)
	// --no-playlist: only download single video, not entire playlist
	// -o ...: output template
	cmd := exec.CommandContext(ctx, "yt-dlp",
		"-f", "b[ext=mp4]/best[ext=mp4]/best",
		"-S", "res:720",
		"--force-overwrites",
		"--no-playlist",
		"-o", outputPath,
		rawURL,
	)

	// Capture output for debugging
	var stderr strings.Builder
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		// potential partial file might exist, cleanup attempt
		// We use a glob because yt-dlp might have appended a part extension
		// Best effort cleanup
		matches, _ := filepath.Glob(outputPath + "*")
		for _, m := range matches {
			os.Remove(m)
		}

		return "", "", fmt.Errorf("yt-dlp failed: %v, stderr: %s", err, stderr.String())
	}

	// Find the video file that was created
	videoMatches, err := filepath.Glob(filepath.Join(d.tempDir, baseFilename+".*"))
	if err != nil {
		return "", "", fmt.Errorf("failed to find downloaded file: %w", err)
	}
	if len(videoMatches) == 0 {
		return "", "", fmt.Errorf("download successful but file not found")
	}

	// Find video file
	var videoPath string
	for _, match := range videoMatches {
		// Skip any thumbnails that might have been downloaded accidentally
		if !strings.HasSuffix(match, ".jpg") && !strings.HasSuffix(match, ".webp") {
			videoPath = match
			break
		}
	}

	if videoPath == "" {
		return "", "", fmt.Errorf("video file not found")
	}

	// Return video path and thumbnail CDN URL
	return videoPath, thumbnailURL, nil
}

// getThumbnailURL extracts the thumbnail CDN URL using yt-dlp
// Context ensures the process can be cancelled if the job is cancelled
func (d *Downloader) getThumbnailURL(ctx context.Context, rawURL string) (string, error) {
	cmd := exec.CommandContext(ctx, "yt-dlp", "--get-thumbnail", rawURL)

	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("failed to get thumbnail URL: %v, stderr: %s", err, stderr.String())
	}

	thumbnailURL := strings.TrimSpace(stdout.String())
	if thumbnailURL == "" {
		return "", fmt.Errorf("empty thumbnail URL returned")
	}

	return thumbnailURL, nil
}

// Cleanup removes the temporary file
func (d *Downloader) Cleanup(path string) error {
	return os.Remove(path)
}

// GetMetadata fetches video metadata without downloading the video
func (d *Downloader) GetMetadata(ctx context.Context, rawURL string) (*VideoMetadata, error) {
	// Validate URL
	if err := validateURL(rawURL); err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	// Use yt-dlp --dump-json to get metadata
	cmd := exec.CommandContext(ctx, "yt-dlp",
		"--dump-json",
		"--no-playlist",
		rawURL,
	)

	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("failed to fetch metadata: %v, stderr: %s", err, stderr.String())
	}

	// Parse JSON output
	// yt-dlp returns a single JSON object for the video
	output := stdout.String()

	// Create a temp struct to match yt-dlp output fields
	var ytdlpData struct {
		Title       string  `json:"title"`
		Description string  `json:"description"`
		Duration    float64 `json:"duration"` // yt-dlp can return float
		Uploader    string  `json:"uploader"`
	}

	if err := json.Unmarshal([]byte(output), &ytdlpData); err != nil {
		return nil, fmt.Errorf("failed to parse metadata JSON: %w", err)
	}

	return &VideoMetadata{
		Title:       ytdlpData.Title,
		Description: ytdlpData.Description,
		Duration:    int(ytdlpData.Duration),
		Uploader:    ytdlpData.Uploader,
	}, nil
}
