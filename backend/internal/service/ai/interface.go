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
	// ExtractRecipe extracts a recipe from a video file (local path)
	ExtractRecipe(ctx context.Context, req ExtractionRequest, onProgress ProgressCallback) (*ExtractionResult, error)

	// ExtractFromWebpage extracts a recipe from a webpage URL (recipe blog, cooking site)
	ExtractFromWebpage(ctx context.Context, url string) (*ExtractionResult, error)

	// ExtractFromImage extracts a recipe from an image (cookbook photo, screenshot)
	ExtractFromImage(ctx context.Context, imageData []byte, mimeType string) (*ExtractionResult, error)

	// RefineRecipe reviews and improves an extracted recipe (deduplication, standardization, etc.)
	RefineRecipe(ctx context.Context, rawRecipe *ExtractionResult) (*ExtractionResult, error)

	// ValidateURL validates if a URL is supported for extraction
	ValidateURL(url string) error

	// IsAvailable checks if the AI service is available
	IsAvailable(ctx context.Context) bool
}

// ShoppingListAnalyzer defines the interface for AI-powered shopping list analysis
type ShoppingListAnalyzer interface {
	AnalyzeShoppingList(ctx context.Context, list model.ShoppingListWithItems) (*ListAnalysisResult, error)
}

// ListAnalysisResult contains the analysis of a shopping list
type ListAnalysisResult struct {
	Suggestions           []ListSuggestion       `json:"suggestions"`
	MissingEssentials     []string               `json:"missingEssentials"`
	CategoryOptimizations []CategoryOptimization `json:"categoryOptimizations"`
}

// ListSuggestion represents a specific suggestion for the list
type ListSuggestion struct {
	Type        string   `json:"type"` // "duplicate", "merge", "general"
	Message     string   `json:"message"`
	ItemNames   []string `json:"itemNames,omitempty"`
	ActionLabel string   `json:"actionLabel,omitempty"`
}

// CategoryOptimization represents a suggestion to move items to a better category
type CategoryOptimization struct {
	ItemName        string `json:"itemName"`
	CurrentCategory string `json:"currentCategory"`
	NewCategory     string `json:"newCategory"`
	Reason          string `json:"reason"`
}

// PantryScanner defines the interface for AI-powered pantry scanning
type PantryScanner interface {
	// ScanPantry detects pantry items from an image (photo of fridge, pantry shelf, etc.)
	ScanPantry(ctx context.Context, imageData []byte, mimeType string) (*PantryScanResult, error)
}

// PantryScanResult contains the detected pantry items from an image
type PantryScanResult struct {
	Items      []ScannedPantryItem `json:"items"`
	Confidence float64             `json:"confidence"` // Overall confidence 0-1
	Notes      string              `json:"notes"`      // Any observations about the image
}

// ScannedPantryItem represents a single item detected in the pantry scan
type ScannedPantryItem struct {
	Name           string   `json:"name"`
	Category       string   `json:"category"`
	Quantity       *float64 `json:"quantity,omitempty"`
	Unit           *string  `json:"unit,omitempty"`
	ExpirationDays *int     `json:"expirationDays,omitempty"` // Estimated days until expiration
	Confidence     float64  `json:"confidence"`               // Item-level confidence 0-1
	BoundingBox    *BBox    `json:"boundingBox,omitempty"`    // Location in image (optional)
}

// BBox represents a bounding box for item location
type BBox struct {
	X      float64 `json:"x"`      // Left edge (0-1 normalized)
	Y      float64 `json:"y"`      // Top edge (0-1 normalized)
	Width  float64 `json:"width"`  // Width (0-1 normalized)
	Height float64 `json:"height"` // Height (0-1 normalized)
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
