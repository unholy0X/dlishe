package model

import (
	"time"

	"github.com/google/uuid"
)

// Recipe represents a recipe in DishFlow
type Recipe struct {
	ID             uuid.UUID          `json:"id" db:"id"`
	UserID         uuid.UUID          `json:"userId" db:"user_id"`
	Title          string             `json:"title" db:"title"`
	Description    *string            `json:"description,omitempty" db:"description"`
	Servings       *int               `json:"servings,omitempty" db:"servings"`
	PrepTime       *int               `json:"prepTime,omitempty" db:"prep_time"`       // minutes
	CookTime       *int               `json:"cookTime,omitempty" db:"cook_time"`       // minutes
	Difficulty     *string            `json:"difficulty,omitempty" db:"difficulty"`    // easy, medium, hard
	Cuisine        *string            `json:"cuisine,omitempty" db:"cuisine"`
	ThumbnailURL   *string            `json:"thumbnailUrl,omitempty" db:"thumbnail_url"`
	SourceType     string             `json:"sourceType" db:"source_type"` // manual, video, ai, photo
	SourceURL      *string            `json:"sourceUrl,omitempty" db:"source_url"`
	SourceMetadata map[string]any     `json:"sourceMetadata,omitempty" db:"source_metadata"`
	Tags           []string           `json:"tags,omitempty" db:"tags"`
	IsFavorite     bool               `json:"isFavorite" db:"is_favorite"`
	SyncVersion    int                `json:"syncVersion" db:"sync_version"`
	CreatedAt      time.Time          `json:"createdAt" db:"created_at"`
	UpdatedAt      time.Time          `json:"updatedAt" db:"updated_at"`
	DeletedAt      *time.Time         `json:"-" db:"deleted_at"`

	// Related data (not stored in recipes table)
	Ingredients    []RecipeIngredient `json:"ingredients,omitempty"`
	Steps          []RecipeStep       `json:"steps,omitempty"`
}

// RecipeIngredient represents an ingredient in a recipe
type RecipeIngredient struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	RecipeID       uuid.UUID  `json:"recipeId" db:"recipe_id"`
	Name           string     `json:"name" db:"name"`
	Quantity       *float64   `json:"quantity,omitempty" db:"quantity"`
	Unit           *string    `json:"unit,omitempty" db:"unit"`
	Category       string     `json:"category" db:"category"` // dairy, produce, proteins, etc.
	IsOptional     bool       `json:"isOptional" db:"is_optional"`
	Notes          *string    `json:"notes,omitempty" db:"notes"`
	VideoTimestamp *int       `json:"videoTimestamp,omitempty" db:"video_timestamp"` // seconds
	SortOrder      int        `json:"sortOrder" db:"sort_order"`
	CreatedAt      time.Time  `json:"createdAt" db:"created_at"`
}

// RecipeStep represents a step in a recipe
type RecipeStep struct {
	ID                  uuid.UUID  `json:"id" db:"id"`
	RecipeID            uuid.UUID  `json:"recipeId" db:"recipe_id"`
	StepNumber          int        `json:"stepNumber" db:"step_number"`
	Instruction         string     `json:"instruction" db:"instruction"`
	DurationSeconds     *int       `json:"durationSeconds,omitempty" db:"duration_seconds"`
	Technique           *string    `json:"technique,omitempty" db:"technique"`
	Temperature         *string    `json:"temperature,omitempty" db:"temperature"`
	VideoTimestampStart *int       `json:"videoTimestampStart,omitempty" db:"video_timestamp_start"`
	VideoTimestampEnd   *int       `json:"videoTimestampEnd,omitempty" db:"video_timestamp_end"`
	CreatedAt           time.Time  `json:"createdAt" db:"created_at"`
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

// Ingredient categories (matching DishFlow mobile app)
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
