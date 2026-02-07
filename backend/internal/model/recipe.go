package model

import (
	"time"

	"github.com/google/uuid"
)

// RecipeNutrition represents nutritional information per serving
type RecipeNutrition struct {
	Calories   int      `json:"calories"`             // kcal per serving
	Protein    int      `json:"protein"`              // grams
	Carbs      int      `json:"carbs"`                // grams
	Fat        int      `json:"fat"`                  // grams
	Fiber      int      `json:"fiber,omitempty"`      // grams
	Sugar      int      `json:"sugar,omitempty"`      // grams
	Sodium     int      `json:"sodium,omitempty"`     // mg
	Tags       []string `json:"tags,omitempty"`       // e.g., "high-protein", "low-carb", "keto-friendly"
	Confidence float64  `json:"confidence,omitempty"` // AI confidence score 0-1
}

// DietaryInfo contains dietary flags for filtering
type DietaryInfo struct {
	IsVegetarian bool     `json:"isVegetarian,omitempty"`
	IsVegan      bool     `json:"isVegan,omitempty"`
	IsGlutenFree bool     `json:"isGlutenFree,omitempty"`
	IsDairyFree  bool     `json:"isDairyFree,omitempty"`
	IsNutFree    bool     `json:"isNutFree,omitempty"`
	IsKeto       bool     `json:"isKeto,omitempty"`
	IsHalal      bool     `json:"isHalal,omitempty"`
	IsKosher     bool     `json:"isKosher,omitempty"`
	Allergens    []string `json:"allergens,omitempty"` // e.g., ["gluten", "dairy", "nuts"]
	MealTypes    []string `json:"mealTypes,omitempty"` // e.g., ["breakfast", "lunch", "dinner"]
}

// Recipe represents a recipe in DLISHE
type Recipe struct {
	ID             uuid.UUID        `json:"id" db:"id"`
	UserID         uuid.UUID        `json:"userId" db:"user_id"`
	Title          string           `json:"title" db:"title"`
	Description    *string          `json:"description,omitempty" db:"description"`
	Servings       *int             `json:"servings,omitempty" db:"servings"`
	PrepTime       *int             `json:"prepTime,omitempty" db:"prep_time"`    // minutes
	CookTime       *int             `json:"cookTime,omitempty" db:"cook_time"`    // minutes
	Difficulty     *string          `json:"difficulty,omitempty" db:"difficulty"` // easy, medium, hard
	Cuisine        *string          `json:"cuisine,omitempty" db:"cuisine"`
	ThumbnailURL   *string          `json:"thumbnailUrl,omitempty" db:"thumbnail_url"`
	SourceType     string           `json:"sourceType" db:"source_type"` // manual, video, ai, photo, cloned
	SourceURL      *string          `json:"sourceUrl,omitempty" db:"source_url"`
	SourceRecipeID *uuid.UUID       `json:"sourceRecipeId,omitempty" db:"source_recipe_id"` // ID of original recipe if cloned
	SourceMetadata map[string]any   `json:"sourceMetadata,omitempty" db:"source_metadata"`
	Tags           []string         `json:"tags,omitempty" db:"tags"`
	IsPublic       bool             `json:"isPublic" db:"is_public"` // Public/suggested recipes visible to all users
	IsFavorite     bool             `json:"isFavorite" db:"is_favorite"`
	Nutrition      *RecipeNutrition `json:"nutrition,omitempty" db:"nutrition"`      // Nutritional info per serving
	DietaryInfo    *DietaryInfo     `json:"dietaryInfo,omitempty" db:"dietary_info"` // Dietary flags for filtering
	SyncVersion    int              `json:"syncVersion" db:"sync_version"`
	CreatedAt      time.Time        `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time        `json:"updatedAt" db:"updated_at"`
	DeletedAt      *time.Time       `json:"-" db:"deleted_at"`

	// Computed fields (for list views without loading full relations)
	IngredientCount int `json:"ingredientCount,omitempty"`
	StepCount       int `json:"stepCount,omitempty"`

	// Related data (not stored in recipes table, loaded on GetByID)
	Ingredients []RecipeIngredient `json:"ingredients,omitempty"`
	Steps       []RecipeStep       `json:"steps,omitempty"`
}

// RecipeIngredient represents an ingredient in a recipe
type RecipeIngredient struct {
	ID             uuid.UUID `json:"id" db:"id"`
	RecipeID       uuid.UUID `json:"recipeId" db:"recipe_id"`
	Name           string    `json:"name" db:"name"`
	Quantity       *float64  `json:"quantity,omitempty" db:"quantity"`
	Unit           *string   `json:"unit,omitempty" db:"unit"`
	Category       string    `json:"category" db:"category"`         // dairy, produce, proteins, etc.
	Section        string    `json:"section,omitempty" db:"section"` // e.g. "Dough", "Sauce", "Main"
	IsOptional     bool      `json:"isOptional" db:"is_optional"`
	Notes          *string   `json:"notes,omitempty" db:"notes"`
	VideoTimestamp *int      `json:"videoTimestamp,omitempty" db:"video_timestamp"` // seconds
	SortOrder      int       `json:"sortOrder" db:"sort_order"`
	CreatedAt      time.Time `json:"createdAt" db:"created_at"`
}

// RecipeStep represents a step in a recipe
type RecipeStep struct {
	ID                  uuid.UUID `json:"id" db:"id"`
	RecipeID            uuid.UUID `json:"recipeId" db:"recipe_id"`
	StepNumber          int       `json:"stepNumber" db:"step_number"`
	Instruction         string    `json:"instruction" db:"instruction"`
	DurationSeconds     *int      `json:"durationSeconds,omitempty" db:"duration_seconds"`
	Technique           *string   `json:"technique,omitempty" db:"technique"`
	Temperature         *string   `json:"temperature,omitempty" db:"temperature"`
	VideoTimestampStart *int      `json:"videoTimestampStart,omitempty" db:"video_timestamp_start"`
	VideoTimestampEnd   *int      `json:"videoTimestampEnd,omitempty" db:"video_timestamp_end"`
	CreatedAt           time.Time `json:"createdAt" db:"created_at"`
}

// RecipeShare represents a shared recipe between users
type RecipeShare struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	RecipeID       uuid.UUID  `json:"recipeId" db:"recipe_id"`
	OwnerID        uuid.UUID  `json:"ownerId" db:"owner_id"`
	RecipientID    *uuid.UUID `json:"recipientId,omitempty" db:"recipient_id"`
	RecipientEmail *string    `json:"recipientEmail,omitempty" db:"recipient_email"`
	CreatedAt      time.Time  `json:"createdAt" db:"created_at"`
	AcceptedAt     *time.Time `json:"acceptedAt,omitempty" db:"accepted_at"`
}

// Ingredient categories (matching DLISHE mobile app)
var IngredientCategories = []string{
	"dairy",
	"produce",
	"proteins",
	"bakery",
	"pantry",
	"spices",
	"condiments",
	"beverages",
	"snacks",
	"frozen",
	"household",
	"other",
}

// MealTypes for recipe categorization
var MealTypes = []string{
	"breakfast",
	"lunch",
	"dinner",
	"snack",
	"dessert",
}

// DietaryRestrictions for filtering
var DietaryRestrictions = []string{
	"vegetarian",
	"vegan",
	"keto",
	"halal",
	"kosher",
	"pescatarian",
	"paleo",
}

// Allergens/Intolerances for filtering
var Allergens = []string{
	"gluten",
	"dairy",
	"lactose",
	"nuts",
	"peanuts",
	"shellfish",
	"eggs",
	"soy",
	"fish",
	"pork",
	"sesame",
}

// NutritionTags for categorizing recipes by nutrition
var NutritionTags = []string{
	"low-calorie",   // < 300 cal/serving
	"high-protein",  // > 25g protein/serving
	"low-carb",      // < 20g carbs/serving
	"keto-friendly", // < 10g net carbs
	"low-fat",       // < 10g fat/serving
	"high-fiber",    // > 8g fiber/serving
	"low-sodium",    // < 400mg sodium
}

// ValidateCategory checks if a category is valid
func ValidateCategory(category string) bool {
	for _, c := range IngredientCategories {
		if c == category {
			return true
		}
	}
	return false
}

// TotalTime returns prep + cook time
func (r *Recipe) TotalTime() int {
	total := 0
	if r.PrepTime != nil {
		total += *r.PrepTime
	}
	if r.CookTime != nil {
		total += *r.CookTime
	}
	return total
}

// NewRecipe creates a new recipe with default values
func NewRecipe(userID uuid.UUID, title string) *Recipe {
	return &Recipe{
		ID:          uuid.New(),
		UserID:      userID,
		Title:       title,
		SourceType:  "manual",
		IsFavorite:  false,
		SyncVersion: 1,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
}
