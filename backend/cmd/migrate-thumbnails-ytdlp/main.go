// Command migrate-thumbnails-ytdlp recovers expired thumbnails by re-fetching
// them from the original video source URLs using yt-dlp.
//
// This handles recipes where the TikTok CDN thumbnail URL has expired (403).
// It uses source_url to call yt-dlp --get-thumbnail, downloads the fresh
// thumbnail, and updates the DB.
//
// Usage:
//
//	DATABASE_URL=postgres://... go run ./cmd/migrate-thumbnails-ytdlp
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/dishflow/backend/internal/service/thumbnail"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.dlishe.com"
	}
	thumbDir := os.Getenv("THUMBNAIL_DIR")
	if thumbDir == "" {
		thumbDir = "/data/thumbnails"
	}

	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	dl := thumbnail.NewDownloader(thumbDir, baseURL)
	if err := dl.EnsureDir(); err != nil {
		log.Fatalf("Failed to create thumbnail directory: %v", err)
	}

	// Select recipes that:
	// - have an external (non-local) thumbnail URL (i.e. expired TikTok CDN)
	// - have a source_url we can re-fetch from
	localPrefix := baseURL + "/api/v1/thumbnails/"
	rows, err := db.Query(`
		SELECT id, source_url, thumbnail_url
		FROM recipes
		WHERE source_url IS NOT NULL AND source_url != ''
		  AND (
		    thumbnail_url IS NULL
		    OR thumbnail_url = ''
		    OR thumbnail_url NOT LIKE $1
		  )
	`, localPrefix+"%")
	if err != nil {
		log.Fatalf("Failed to query recipes: %v", err)
	}

	type recipe struct {
		id           string
		sourceURL    string
		thumbnailURL sql.NullString
	}

	var recipes []recipe
	for rows.Next() {
		var r recipe
		if err := rows.Scan(&r.id, &r.sourceURL, &r.thumbnailURL); err != nil {
			log.Fatalf("Failed to scan row: %v", err)
		}
		recipes = append(recipes, r)
	}
	rows.Close()

	total := len(recipes)
	log.Printf("Found %d recipes with missing/expired thumbnails to recover via yt-dlp", total)

	var success, failed, skipped int

	for i, r := range recipes {
		sourceURL := strings.TrimSpace(r.sourceURL)
		if sourceURL == "" {
			skipped++
			continue
		}

		log.Printf("[%d/%d] Fetching thumbnail for recipe %s from %s ...", i+1, total, r.id, sourceURL)

		// Use yt-dlp to get a fresh thumbnail URL
		freshThumbURL, err := getThumbnailURL(sourceURL)
		if err != nil {
			log.Printf("  yt-dlp FAILED: %v", err)
			failed++
			continue
		}

		log.Printf("  Got fresh URL: %s", truncate(freshThumbURL, 80))

		// Download the thumbnail to local disk
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		localURL, err := dl.Download(ctx, freshThumbURL)
		cancel()

		if err != nil {
			log.Printf("  Download FAILED: %v", err)
			failed++
			continue
		}

		// Update the DB
		_, err = db.Exec(`UPDATE recipes SET thumbnail_url = $1 WHERE id = $2`, localURL, r.id)
		if err != nil {
			log.Printf("  DB UPDATE FAILED: %v", err)
			failed++
			continue
		}

		log.Printf("  OK -> %s", localURL)
		success++
	}

	fmt.Println()
	log.Printf("Migration complete: %d success, %d failed, %d skipped (out of %d)", success, failed, skipped, total)
}

// getThumbnailURL calls yt-dlp --get-thumbnail to fetch a fresh thumbnail URL.
func getThumbnailURL(videoURL string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "yt-dlp", "--get-thumbnail", "--no-playlist", videoURL)

	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("%v: %s", err, stderr.String())
	}

	url := strings.TrimSpace(stdout.String())
	if url == "" {
		return "", fmt.Errorf("empty thumbnail URL returned")
	}

	return url, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
