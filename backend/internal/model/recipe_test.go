package model

import (
	"testing"

	"github.com/google/uuid"
)

func TestValidateCategory(t *testing.T) {
	tests := []struct {
		category string
		valid    bool
	}{
		{"dairy", true},
		{"produce", true},
		{"proteins", true},
		{"bakery", true},
		{"pantry", true},
		{"spices", true},
		{"condiments", true},
		{"beverages", true},
		{"snacks", true},
		{"frozen", true},
		{"household", true},
		{"other", true},
		{"invalid", false},
		{"", false},
		{"DAIRY", false}, // case sensitive
		{"Produce", false},
		{"unknown-category", false},
	}

	for _, tt := range tests {
		t.Run(tt.category, func(t *testing.T) {
			result := ValidateCategory(tt.category)
			if result != tt.valid {
				t.Errorf("ValidateCategory(%q) = %v, want %v", tt.category, result, tt.valid)
			}
		})
	}
}

func TestIngredientCategories(t *testing.T) {
	expected := []string{
		"dairy", "produce", "proteins", "bakery", "pantry",
		"spices", "condiments", "beverages", "snacks", "frozen",
		"household", "other",
	}

	if len(IngredientCategories) != len(expected) {
		t.Errorf("Expected %d categories, got %d", len(expected), len(IngredientCategories))
	}

	for _, cat := range expected {
		found := false
		for _, c := range IngredientCategories {
			if c == cat {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Missing category: %s", cat)
		}
	}
}

func TestRecipeTotalTime(t *testing.T) {
	tests := []struct {
		name     string
		prepTime *int
		cookTime *int
		expected int
	}{
		{
			name:     "both times set",
			prepTime: intPtr(15),
			cookTime: intPtr(30),
			expected: 45,
		},
		{
			name:     "only prep time",
			prepTime: intPtr(20),
			cookTime: nil,
			expected: 20,
		},
		{
			name:     "only cook time",
			prepTime: nil,
			cookTime: intPtr(25),
			expected: 25,
		},
		{
			name:     "both nil",
			prepTime: nil,
			cookTime: nil,
			expected: 0,
		},
		{
			name:     "zero values",
			prepTime: intPtr(0),
			cookTime: intPtr(0),
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recipe := &Recipe{
				PrepTime: tt.prepTime,
				CookTime: tt.cookTime,
			}

			result := recipe.TotalTime()
			if result != tt.expected {
				t.Errorf("TotalTime() = %d, want %d", result, tt.expected)
			}
		})
	}
}

func TestNewRecipe(t *testing.T) {
	userID := uuid.New()
	title := "Test Recipe"

	recipe := NewRecipe(userID, title)

	if recipe == nil {
		t.Fatal("Expected non-nil recipe")
	}
	if recipe.ID == uuid.Nil {
		t.Error("Recipe ID should be generated")
	}
	if recipe.UserID != userID {
		t.Errorf("UserID = %s, want %s", recipe.UserID, userID)
	}
	if recipe.Title != title {
		t.Errorf("Title = %s, want %s", recipe.Title, title)
	}
	if recipe.SourceType != "manual" {
		t.Errorf("SourceType = %s, want 'manual'", recipe.SourceType)
	}
	if recipe.IsFavorite {
		t.Error("IsFavorite should be false by default")
	}
	if recipe.SyncVersion != 1 {
		t.Errorf("SyncVersion = %d, want 1", recipe.SyncVersion)
	}
	if recipe.CreatedAt.IsZero() {
		t.Error("CreatedAt should be set")
	}
	if recipe.UpdatedAt.IsZero() {
		t.Error("UpdatedAt should be set")
	}
}

func intPtr(i int) *int {
	return &i
}
