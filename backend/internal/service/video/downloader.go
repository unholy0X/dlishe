package video

import (
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

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
	"youtube.com":     true,
	"www.youtube.com": true,
	"youtu.be":        true,
	"m.youtube.com":   true,
	"tiktok.com":      true,
	"www.tiktok.com":  true,
	"vm.tiktok.com":   true,
	"instagram.com":   true,
	"www.instagram.com": true,
	"facebook.com":    true,
	"www.facebook.com": true,
	"fb.watch":        true,
	"vimeo.com":       true,
	"www.vimeo.com":   true,
	"twitter.com":     true,
	"x.com":           true,
	"reddit.com":      true,
	"www.reddit.com":  true,
	"v.redd.it":       true,
}

// dangerousCharsRegex matches shell metacharacters and control chars
var dangerousCharsRegex = regexp.MustCompile(`[;&|$` + "`" + `\\!(){}\[\]<>*?#~]`)

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
// Returns: (videoPath, thumbnailPath, error)
func (d *Downloader) Download(rawURL string) (string, string, error) {
	// SECURITY: Strict URL validation to prevent command injection
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

	// Prepare yt-dlp command
	// SECURITY: exec.Command does NOT use shell, so each arg is passed directly
	// This means shell metacharacters in rawURL won't be interpreted
	// But we still validate above for defense in depth
	//
	// -f best: best quality
	// -S res:720: cap resolution at 720p to save processing time/bandwidth (Gemini doesn't need 4K)
	// --write-thumbnail: extract video thumbnail
	// --convert-thumbnails jpg: convert thumbnail to JPG format
	// --force-overwrites: overwrite if exists
	// --no-playlist: only download single video, not entire playlist
	// -o ...: output template
	cmd := exec.Command("yt-dlp",
		"-f", "b[ext=mp4]/best[ext=mp4]/best",
		"-S", "res:720",
		"--write-thumbnail",
		"--convert-thumbnails", "jpg",
		"--force-overwrites",
		"--no-playlist",
		"-o", outputPath,
		rawURL,
	)

	// Capture output for debugging
	var stderr strings.Builder
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
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

	// Find video file (not thumbnail)
	var videoPath string
	var thumbnailPath string
	for _, match := range videoMatches {
		if strings.HasSuffix(match, ".jpg") {
			thumbnailPath = match
		} else {
			videoPath = match
		}
	}

	if videoPath == "" {
		return "", "", fmt.Errorf("video file not found")
	}

	// Return both paths (thumbnail might be empty if extraction failed)
	return videoPath, thumbnailPath, nil
}

// Cleanup removes the temporary file
func (d *Downloader) Cleanup(path string) error {
	return os.Remove(path)
}
