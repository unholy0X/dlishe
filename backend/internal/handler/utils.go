package handler

import (
	"fmt"
	"strings"
)

// detectMimeType detects image mime type from file magic bytes
func detectMimeType(data []byte) string {
	if len(data) < 4 {
		return "application/octet-stream"
	}

	// Check magic bytes
	if data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image/jpeg"
	}
	if data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
		return "image/png"
	}
	if len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP" {
		return "image/webp"
	}
	if data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46 {
		return "image/gif"
	}

	return "application/octet-stream"
}

// intPtr returns a pointer to an int
func intPtr(i int) *int {
	if i == 0 {
		return nil
	}
	return &i
}

// stringPtr returns a pointer to a string
func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// parseQuantity converts a string quantity to float64
// Handles: "1.5", "1/2", "1 1/2" (mixed fractions), "2-3" (takes first value)
func parseQuantity(s string) *float64 {
	if s == "" {
		return nil
	}

	s = strings.TrimSpace(s)

	// Try to parse as simple float first
	var f float64
	if _, err := fmt.Sscanf(s, "%f", &f); err == nil {
		// Check if there's a fraction part after (e.g., "1 1/2")
		parts := strings.Fields(s)
		if len(parts) == 2 {
			var num, denom float64
			if _, err := fmt.Sscanf(parts[1], "%f/%f", &num, &denom); err == nil && denom != 0 {
				f += num / denom
			}
		}
		return &f
	}

	// Try handling simple fractions like "1/2"
	var num, denom float64
	if _, err := fmt.Sscanf(s, "%f/%f", &num, &denom); err == nil && denom != 0 {
		f = num / denom
		return &f
	}

	// Try handling ranges like "2-3" (take the first value)
	if strings.Contains(s, "-") {
		parts := strings.Split(s, "-")
		if len(parts) >= 1 {
			if _, err := fmt.Sscanf(strings.TrimSpace(parts[0]), "%f", &f); err == nil {
				return &f
			}
		}
	}

	return nil
}
