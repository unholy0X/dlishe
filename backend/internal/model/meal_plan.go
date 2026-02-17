package model

import (
	"time"

	"github.com/google/uuid"
)

// MealPlan represents a weekly meal plan
type MealPlan struct {
	ID        uuid.UUID       `json:"id"`
	UserID    uuid.UUID       `json:"userId"`
	WeekStart time.Time       `json:"weekStart"`
	Title     *string         `json:"title,omitempty"`
	Entries   []MealPlanEntry `json:"entries"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

// MealPlanEntry represents a recipe assigned to a day/meal slot
type MealPlanEntry struct {
	ID           uuid.UUID `json:"id"`
	PlanID       uuid.UUID `json:"planId"`
	RecipeID     uuid.UUID `json:"recipeId"`
	DayIndex     int       `json:"dayIndex"`
	MealType     string    `json:"mealType"`
	SortOrder    int       `json:"sortOrder"`
	RecipeTitle  *string   `json:"recipeTitle,omitempty"`
	ThumbnailURL *string   `json:"thumbnailUrl,omitempty"`
	PrepTime     *int      `json:"prepTime,omitempty"`
	CookTime     *int      `json:"cookTime,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
}

// MealPlanEntryInput represents input for adding an entry
type MealPlanEntryInput struct {
	RecipeID uuid.UUID `json:"recipeId"`
	DayIndex int       `json:"dayIndex"`
	MealType string    `json:"mealType"`
}

// Validate validates the entry input
func (e *MealPlanEntryInput) Validate() error {
	if e.RecipeID == uuid.Nil {
		return ErrValidation{Field: "recipeId", Reason: "required"}
	}
	if e.DayIndex < 0 || e.DayIndex > 6 {
		return ErrValidation{Field: "dayIndex", Reason: "must be between 0 and 6"}
	}
	switch e.MealType {
	case "breakfast", "lunch", "dinner", "snack":
	default:
		return ErrValidation{Field: "mealType", Reason: "must be breakfast, lunch, dinner, or snack"}
	}
	return nil
}
