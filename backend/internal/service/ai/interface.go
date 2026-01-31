package ai

import (
	"context"

	"github.com/dishflow/backend/internal/model"
)

// ExtractionRequest contains the parameters for recipe extraction
type ExtractionRequest struct {
	VideoURL    string `json:"videoUrl"`
	Language    string `json:"language"`    // "en", "fr", "es", "auto"
	DetailLevel string `json:"detailLevel"` // "quick", "detailed"
}

// ExtractedIngredient represents an ingredient extracted from a video
type ExtractedIngredient struct {
	Name           string  `json:"name"`
	Quantity       string  `json:"quantity"` // Keep as string to handle "1/2", "1-2", etc.
	Unit           string  `json:"unit"`
	Category       string  `json:"category"`
	IsOptional     bool    `json:"isOptional"`
	Notes          string  `json:"notes"`
	VideoTimestamp float64 `json:"videoTimestamp"` // minutes (float) from LLM
}

// ExtractedStep represents a step extracted from a video
type ExtractedStep struct {
	StepNumber          int     `json:"stepNumber"`
	Instruction         string  `json:"instruction"`
	DurationSeconds     int     `json:"durationSeconds"`
	Technique           string  `json:"technique"`
	Temperature         string  `json:"temperature"`
	VideoTimestampStart float64 `json:"videoTimestampStart"`
	VideoTimestampEnd   float64 `json:"videoTimestampEnd"`
}

// ExtractionResult contains the extracted recipe data
type ExtractionResult struct {
	Title       string                `json:"title"`
	Description string                `json:"description"`
	Servings    int                   `json:"servings"`
	PrepTime    int                   `json:"prepTime"`   // minutes
	CookTime    int                   `json:"cookTime"`   // minutes
	Difficulty  string                `json:"difficulty"` // easy, medium, hard
	Cuisine     string                `json:"cuisine"`
	Ingredients []ExtractedIngredient `json:"ingredients"`
	Steps       []ExtractedStep       `json:"steps"`
	Tags        []string              `json:"tags"`
	Thumbnail   string                `json:"thumbnail,omitempty"`
}

// ProgressCallback is called with progress updates during extraction
type ProgressCallback func(status model.JobStatus, progress int, message string)

// RecipeExtractor defines the interface for AI-powered recipe extraction
type RecipeExtractor interface {
	// ExtractRecipe extracts a recipe from a video URL
	ExtractRecipe(ctx context.Context, req ExtractionRequest, onProgress ProgressCallback) (*ExtractionResult, error)

	// ValidateURL validates if a URL is supported for extraction
	ValidateURL(url string) error

	// IsAvailable checks if the AI service is available
	IsAvailable(ctx context.Context) bool
}

// Supported video platforms
var SupportedPlatforms = []string{
	"youtube.com",
	"youtu.be",
	"tiktok.com",
	"instagram.com",
	"facebook.com",
}

// IsSupportedPlatform checks if a URL is from a supported platform
func IsSupportedPlatform(url string) bool {
	for _, platform := range SupportedPlatforms {
		if containsIgnoreCase(url, platform) {
			return true
		}
	}
	return false
}

func containsIgnoreCase(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr ||
			len(s) > len(substr) &&
				(containsAt(s, substr, 0) || containsIn(s, substr)))
}

func containsAt(s, substr string, start int) bool {
	if start+len(substr) > len(s) {
		return false
	}
	for i := 0; i < len(substr); i++ {
		c1 := s[start+i]
		c2 := substr[i]
		if c1 != c2 && c1 != c2+32 && c1 != c2-32 {
			return false
		}
	}
	return true
}

func containsIn(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if containsAt(s, substr, i) {
			return true
		}
	}
	return false
}
