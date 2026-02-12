package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// ThumbnailHandler serves locally-stored recipe thumbnails.
type ThumbnailHandler struct {
	dir string
}

// NewThumbnailHandler creates a handler that serves thumbnails from dir.
func NewThumbnailHandler(dir string) *ThumbnailHandler {
	return &ThumbnailHandler{dir: dir}
}

// Serve handles GET /api/v1/thumbnails/{filename}
func (h *ThumbnailHandler) Serve(w http.ResponseWriter, r *http.Request) {
	// Extract filename from the last path segment
	filename := filepath.Base(r.URL.Path)

	// Sanitize: reject anything with path separators or dots that could escape
	if filename == "" || filename == "." || filename == ".." || strings.ContainsAny(filename, "/\\") {
		http.Error(w, "invalid filename", http.StatusBadRequest)
		return
	}

	fullPath := filepath.Join(h.dir, filename)

	// Verify the resolved path is still within the thumbnail directory
	absDir, _ := filepath.Abs(h.dir)
	absPath, _ := filepath.Abs(fullPath)
	if !strings.HasPrefix(absPath, absDir+string(os.PathSeparator)) {
		http.Error(w, "invalid filename", http.StatusBadRequest)
		return
	}

	// Set cache headers — thumbnails are immutable (UUID filenames)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")

	http.ServeFile(w, r, fullPath)
}
