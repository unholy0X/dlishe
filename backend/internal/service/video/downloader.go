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
// Returns: (videoPath, thumbnailPath, error)
func (d *Downloader) Download(url string) (string, string, error) {
	// Simple validation
	if url == "" {
		return "", "", fmt.Errorf("empty URL")
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
	// -f best: best quality
	// -S res:720: cap resolution at 720p to save processing time/bandwidth (Gemini doesn't need 4K)
	// --write-thumbnail: extract video thumbnail
	// --convert-thumbnails jpg: convert thumbnail to JPG format
	// --force-overwrites: overwrite if exists
	// -o ...: output template
	cmd := exec.Command("yt-dlp",
		"-f", "b[ext=mp4]/best[ext=mp4]/best",
		"-S", "res:720",
		"--write-thumbnail",
		"--convert-thumbnails", "jpg",
		"--force-overwrites",
		"-o", outputPath,
		url,
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
