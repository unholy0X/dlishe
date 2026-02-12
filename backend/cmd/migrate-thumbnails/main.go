// Command migrate-thumbnails downloads all external recipe thumbnails
// (TikTok CDN, etc.) and replaces the DB URLs with local ones.
//
// Usage:
//
//	DATABASE_URL=postgres://... BASE_URL=https://api.dlishe.com THUMBNAIL_DIR=/data/thumbnails go run ./cmd/migrate-thumbnails
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
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

	// Select all recipes with external thumbnail URLs (not already migrated)
	localPrefix := baseURL + "/api/v1/thumbnails/"
	rows, err := db.Query(`
		SELECT id, thumbnail_url
		FROM recipes
		WHERE thumbnail_url IS NOT NULL
		  AND thumbnail_url != ''
		  AND thumbnail_url NOT LIKE $1
	`, localPrefix+"%")
	if err != nil {
		log.Fatalf("Failed to query recipes: %v", err)
	}

	type recipe struct {
		id           string
		thumbnailURL string
	}

	var recipes []recipe
	for rows.Next() {
		var r recipe
		if err := rows.Scan(&r.id, &r.thumbnailURL); err != nil {
			log.Fatalf("Failed to scan row: %v", err)
		}
		recipes = append(recipes, r)
	}
	rows.Close()

	total := len(recipes)
	log.Printf("Found %d recipes with external thumbnails to migrate", total)

	var success, failed, skipped int

	for i, r := range recipes {
		url := strings.TrimSpace(r.thumbnailURL)
		if url == "" {
			skipped++
			continue
		}

		log.Printf("[%d/%d] Downloading thumbnail for recipe %s ...", i+1, total, r.id)

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		localURL, err := dl.Download(ctx, url)
		cancel()

		if err != nil {
			log.Printf("  FAILED: %v", err)
			failed++
			continue
		}

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
