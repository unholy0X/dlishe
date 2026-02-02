package model

import (
	"testing"
)

// TestNormalizeURL verifies URL normalization handles various edge cases
func TestNormalizeURL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		// TikTok Tests
		{
			name:     "TikTok with trailing malformed characters",
			input:    `https://www.tiktok.com/@eitan/video/7582352058645302558%22,`,
			expected: "https://tiktok.com/@eitan/video/7582352058645302558",
		},
		{
			name:     "TikTok clean URL",
			input:    "https://www.tiktok.com/@eitan/video/7582352058645302558",
			expected: "https://tiktok.com/@eitan/video/7582352058645302558",
		},
		{
			name:     "TikTok with query params",
			input:    "https://www.tiktok.com/@eitan/video/7582352058645302558?is_copy_url=1&is_from_webapp=1",
			expected: "https://tiktok.com/@eitan/video/7582352058645302558",
		},
		{
			name:     "TikTok mobile URL",
			input:    "https://m.tiktok.com/@eitan/video/7582352058645302558",
			expected: "https://tiktok.com/@eitan/video/7582352058645302558",
		},

		// YouTube Tests
		{
			name:     "YouTube with timestamp",
			input:    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42",
			expected: "https://youtube.com/watch?v=dQw4w9WgXcQ",
		},
		{
			name:     "YouTube with share identifier",
			input:    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123",
			expected: "https://youtube.com/watch?v=dQw4w9WgXcQ",
		},
		{
			name:     "YouTube short URL",
			input:    "https://youtu.be/dQw4w9WgXcQ",
			expected: "https://youtube.com/watch?v=dQw4w9WgXcQ",
		},
		{
			name:     "YouTube short URL with timestamp",
			input:    "https://youtu.be/dQw4w9WgXcQ?t=42",
			expected: "https://youtube.com/watch?v=dQw4w9WgXcQ",
		},
		{
			name:     "YouTube Shorts URL",
			input:    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
			expected: "https://youtube.com/watch?v=dQw4w9WgXcQ",
		},
		{
			name:     "YouTube mobile URL",
			input:    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
			expected: "https://youtube.com/watch?v=dQw4w9WgXcQ",
		},

		// Trailing garbage tests
		{
			name:     "URL with trailing quote and comma",
			input:    `https://example.com/video",`,
			expected: "https://example.com/video",
		},
		{
			name:     "URL with trailing spaces",
			input:    "  https://example.com/video  ",
			expected: "https://example.com/video",
		},

		// Tracking parameters
		{
			name:     "URL with UTM parameters",
			input:    "https://example.com/article?utm_source=twitter&utm_campaign=spring",
			expected: "https://example.com/article",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := NormalizeURL(tt.input)
			if result != tt.expected {
				t.Errorf("NormalizeURL(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

// TestNormalizeURL_SameHash verifies that variations produce same hash
func TestNormalizeURL_SameHash(t *testing.T) {
	tests := []struct {
		name string
		urls []string
	}{
		{
			name: "TikTok variations should hash to same value",
			urls: []string{
				`https://www.tiktok.com/@eitan/video/7582352058645302558%22,`,
				"https://www.tiktok.com/@eitan/video/7582352058645302558",
				"https://m.tiktok.com/@eitan/video/7582352058645302558",
				"https://www.tiktok.com/@eitan/video/7582352058645302558?is_copy_url=1",
			},
		},
		{
			name: "YouTube variations should hash to same value",
			urls: []string{
				"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
				"https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42",
				"https://youtu.be/dQw4w9WgXcQ",
				"https://m.youtube.com/watch?v=dQw4w9WgXcQ",
				"https://www.youtube.com/shorts/dQw4w9WgXcQ",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if len(tt.urls) < 2 {
				t.Fatal("Need at least 2 URLs to compare")
			}

			// Normalize all URLs
			normalized := make([]string, len(tt.urls))
			hashes := make([]string, len(tt.urls))
			for i, url := range tt.urls {
				normalized[i] = NormalizeURL(url)
				hashes[i] = HashURL(normalized[i])
			}

			// All hashes should be equal
			firstHash := hashes[0]
			for i := 1; i < len(hashes); i++ {
				if hashes[i] != firstHash {
					t.Errorf("URL %q (normalized: %q) hash %q != first URL %q (normalized: %q) hash %q",
						tt.urls[i], normalized[i], hashes[i],
						tt.urls[0], normalized[0], firstHash)
				}
			}
		})
	}
}
