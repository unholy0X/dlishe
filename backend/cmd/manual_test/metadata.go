package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/dishflow/backend/internal/service/video"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run main.go <video_url>")
		os.Exit(1)
	}

	url := os.Args[1]
	fmt.Printf("Fetching metadata for: %s\n", url)

	downloader := video.NewDownloader(os.TempDir())
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	meta, err := downloader.GetMetadata(ctx, url)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("------------------------------------------------")
	fmt.Printf("Title:       %s\n", meta.Title)
	fmt.Printf("Uploader:    %s\n", meta.Uploader)
	fmt.Printf("Duration:    %d seconds\n", meta.Duration)
	fmt.Printf("Description:\n%s\n", meta.Description)
	fmt.Println("------------------------------------------------")
}
