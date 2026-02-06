package ai

import (
	"context"
	"encoding/json"
	"strconv"

	"github.com/dishflow/backend/internal/model"
)

// ExtractionRequest contains the parameters for recipe extraction
type ExtractionRequest struct {
	VideoURL    string `json:"videoUrl"`
	Language    string `json:"language"`           // "en", "fr", "es", "auto"
	DetailLevel string `json:"detailLevel"`        // "quick", "detailed"
	Metadata    string `json:"metadata,omitempty"` // Extra context (e.g., video description, caption)
}

// ExtractedIngredient represents an ingredient extracted from a video
type ExtractedIngredient struct {
	Name           string  `json:"name"`
	Quantity       string  `json:"quantity"` // Keep as string to handle "1/2", "1-2", etc.
	Unit           string  `json:"unit"`
	Category       string  `json:"category"`
	Section        string  `json:"section"` // e.g. "Dough", "Sauce", "Main"
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
	NonRecipe   bool                  `json:"non_recipe,omitempty"` // Internal use: indicates rejected content
	Reason      string                `json:"reason,omitempty"`     // Internal use: reason for rejection
}

// UnmarshalJSON handles flexible type conversion for fields that might come as strings or ints
func (e *ExtractionResult) UnmarshalJSON(data []byte) error {
	// Create a temporary struct with string fields for flexible parsing
	type Alias ExtractionResult
	aux := &struct {
		ServingsRaw interface{} `json:"servings"`
		PrepTimeRaw interface{} `json:"prepTime"`
		CookTimeRaw interface{} `json:"cookTime"`
		*Alias
	}{
		Alias: (*Alias)(e),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Convert servings (could be string or int)
	switch v := aux.ServingsRaw.(type) {
	case float64:
		e.Servings = int(v)
	case string:
		if v != "" {
			parsed, _ := strconv.Atoi(v)
			e.Servings = parsed
		}
	}

	// Convert prepTime (could be string or int)
	switch v := aux.PrepTimeRaw.(type) {
	case float64:
		e.PrepTime = int(v)
	case string:
		if v != "" {
			parsed, _ := strconv.Atoi(v)
			e.PrepTime = parsed
		}
	}

	// Convert cookTime (could be string or int)
	switch v := aux.CookTimeRaw.(type) {
	case float64:
		e.CookTime = int(v)
	case string:
		if v != "" {
			parsed, _ := strconv.Atoi(v)
			e.CookTime = parsed
		}
	}

	return nil
}

// ProgressCallback is called with progress updates during extraction
type ProgressCallback func(status model.JobStatus, progress int, message string)

// RecipeExtractor defines the interface for AI-powered recipe extraction
type RecipeExtractor interface {
	// ExtractRecipe extracts a recipe from a video file (local path)
	ExtractRecipe(ctx context.Context, req ExtractionRequest, onProgress ProgressCallback) (*ExtractionResult, error)

	// ExtractFromWebpage extracts a recipe from a webpage URL (recipe blog, cooking site)
	ExtractFromWebpage(ctx context.Context, url string, onProgress ProgressCallback) (*ExtractionResult, error)

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
	// SmartMergeItems takes a list of raw items and returns a consolidated, categorized list
	SmartMergeItems(ctx context.Context, currentItems []model.ShoppingItem, preferredUnitSystem string) ([]model.ShoppingItemInput, error)
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
	Name        string   `json:"name"`
	Category    string   `json:"category"`
	Quantity    *float64 `json:"quantity,omitempty"`
	Unit        *string  `json:"unit,omitempty"`
	Confidence  float64  `json:"confidence"`            // Item-level confidence 0-1
	BoundingBox *BBox    `json:"boundingBox,omitempty"` // Location in image (optional)
}

// BBox represents a bounding box for item location
type BBox struct {
	X      float64 `json:"x"`      // Left edge (0-1 normalized)
	Y      float64 `json:"y"`      // Top edge (0-1 normalized)
	Width  float64 `json:"width"`  // Width (0-1 normalized)
	Height float64 `json:"height"` // Height (0-1 normalized)
}

// RecipeRecommender defines the interface for AI-powered recipe recommendations
type RecipeRecommender interface {
	// GetRecommendations returns recipe recommendations based on pantry items and filters
	GetRecommendations(ctx context.Context, req *RecommendationInput) (*RecommendationOutput, error)

	// EstimateNutrition estimates nutrition info for a recipe based on ingredients
	EstimateNutrition(ctx context.Context, ingredients []model.RecipeIngredient) (*model.RecipeNutrition, error)

	// SuggestSubstitutes suggests ingredient substitutes from pantry or common alternatives
	SuggestSubstitutes(ctx context.Context, ingredient string, pantryItems []string) ([]model.SubstituteSuggestion, error)
}

// RecipeEnricher defines the interface for AI-powered recipe enrichment
type RecipeEnricher interface {
	// EnrichRecipe adds nutrition, dietary info, and meal types to a recipe
	// This is a separate AI call focused on analysis rather than extraction
	EnrichRecipe(ctx context.Context, input *EnrichmentInput) (*EnrichmentResult, error)
}

// EnrichmentInput contains the recipe data to enrich
type EnrichmentInput struct {
	Title       string   `json:"title"`
	Servings    int      `json:"servings"`    // 0 if unknown (will estimate)
	Ingredients []string `json:"ingredients"` // Formatted as "quantity unit name"
	Steps       []string `json:"steps"`
	PrepTime    int      `json:"prepTime,omitempty"`
	CookTime    int      `json:"cookTime,omitempty"`
	Cuisine     string   `json:"cuisine,omitempty"`
}

// EnrichmentResult contains the enrichment data from AI
type EnrichmentResult struct {
	Nutrition        *NutritionEstimate   `json:"nutrition"`
	DietaryInfo      *DietaryInfoEstimate `json:"dietaryInfo"`
	ServingsEstimate *ServingsEstimate    `json:"servingsEstimate,omitempty"` // Only if input servings was 0
}

// NutritionEstimate contains estimated nutrition per serving
type NutritionEstimate struct {
	PerServing NutritionValues `json:"perServing"`
	Tags       []string        `json:"tags,omitempty"`
	Confidence float64         `json:"confidence"`
}

// NutritionValues contains the actual nutrition numbers
type NutritionValues struct {
	Calories int `json:"calories"`
	Protein  int `json:"protein"`
	Carbs    int `json:"carbs"`
	Fat      int `json:"fat"`
	Fiber    int `json:"fiber,omitempty"`
	Sugar    int `json:"sugar,omitempty"`
	Sodium   int `json:"sodium,omitempty"`
}

// DietaryInfoEstimate contains dietary flags and allergens
type DietaryInfoEstimate struct {
	IsVegetarian *bool    `json:"isVegetarian"`
	IsVegan      *bool    `json:"isVegan"`
	IsGlutenFree *bool    `json:"isGlutenFree"`
	IsDairyFree  *bool    `json:"isDairyFree"`
	IsNutFree    *bool    `json:"isNutFree"`
	IsKeto       *bool    `json:"isKeto"`
	IsHalal      *bool    `json:"isHalal,omitempty"`  // null if uncertain
	IsKosher     *bool    `json:"isKosher,omitempty"` // null if uncertain
	Allergens    []string `json:"allergens,omitempty"`
	MealTypes    []string `json:"mealTypes"`
	Confidence   float64  `json:"confidence"`
}

// ServingsEstimate contains estimated servings when extraction couldn't determine
type ServingsEstimate struct {
	Value      int     `json:"value"`
	Confidence float64 `json:"confidence"`
	Reasoning  string  `json:"reasoning"`
}

// MinConfidenceThreshold is the minimum confidence level to accept AI estimates
const MinConfidenceThreshold = 0.5

// RecommendationInput contains inputs for recipe recommendations
type RecommendationInput struct {
	Recipes     []*model.Recipe              // User's recipes with ingredients
	PantryItems []model.PantryItem           // User's pantry items
	Filters     *model.RecommendationRequest // Filters (mealType, diet, exclude, nutrition, etc.)
}

// RecommendationOutput contains the recommendation results
type RecommendationOutput struct {
	ReadyToCook   []model.RecipeRecommendation `json:"readyToCook"`   // 90-100% match
	AlmostReady   []model.RecipeRecommendation `json:"almostReady"`   // 70-89% match
	NeedsShopping []model.RecipeRecommendation `json:"needsShopping"` // 50-69% match
	Summary       model.RecommendationSummary  `json:"summary"`
	Filters       model.AppliedFilters         `json:"filters"`
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
