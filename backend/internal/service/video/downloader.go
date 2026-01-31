package video

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
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

// Download downloads a video from a URL to a temporary file
// It uses yt-dlp to handle various video platforms (YouTube, TikTok, etc.)
func (d *Downloader) Download(url string) (string, error) {
	// Simple validation
	if url == "" {
		return "", fmt.Errorf("empty URL")
	}

	// Create temp file path template
	// yt-dlp will add extension, so we just provide base name
	baseFilename := fmt.Sprintf("video_%s", uuid.New().String())
	outputPath := filepath.Join(d.tempDir, baseFilename+".%(ext)s")

	// Ensure temp dir exists
	if err := os.MkdirAll(d.tempDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	// Prepare yt-dlp command
	// -f best: best quality
	// -S res:720: cap resolution at 720p to save processing time/bandwidth (Gemini doesn't need 4K)
	// --force-overwrites: overwrite if exists
	// -o ...: output template
	cmd := exec.Command("yt-dlp",
		"-f", "b[ext=mp4]/best[ext=mp4]/best",
		"-S", "res:720",
		"--force-overwrites",
		"-o", outputPath,
		url,
	)

	// Capture output for debugging
	var stderr strings.Builder
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("yt-dlp failed: %v, stderr: %s", err, stderr.String())
	}

	// Find the file that was created (since extension might vary)
	// We look for files matching the base filename in tempDir
	matches, err := filepath.Glob(filepath.Join(d.tempDir, baseFilename+".*"))
	if err != nil {
		return "", fmt.Errorf("failed to find downloaded file: %w", err)
	}
	if len(matches) == 0 {
		return "", fmt.Errorf("download successful but file not found")
	}

	// Return the first match
	return matches[0], nil
}

// Cleanup removes the temporary file
func (d *Downloader) Cleanup(path string) error {
	return os.Remove(path)
}
