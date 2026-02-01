package handler

import (
	"testing"

	"github.com/dishflow/backend/internal/model"
)

// Mock repos would be needed, but for now we'll struggle with dependency injection
// or just unit test the logic if we extract it.
// Since we can't easily mock the entire repo struct without interfaces (which we have but manual mocking is verbose),
// let's try to verify the validation logic in model/shopping.go first, as that's the most likely culprit.

func TestShoppingItemInputValidation(t *testing.T) {
	recipeName := "Test Recipe"
	cat := "produce" // valid

	validInput := model.ShoppingItemInput{
		Name:       "Ground Beef",
		Category:   &cat,
		RecipeName: &recipeName,
	}

	if err := validInput.Validate(); err != nil {
		t.Errorf("Expected valid input to pass, got: %v", err)
	}

	// Test case insensitive category?
	// The validation function says: !isValidCategory(*s.Category)
	// And isValidCategory checks against a map.

	catInvalid := "Produce" // Capitalized
	invalidInput := model.ShoppingItemInput{
		Name:     "Ground Beef",
		Category: &catInvalid,
	}

	if err := invalidInput.Validate(); err == nil {
		// If this passes, my hypothesis is wrong. If it fails, we found the issue.
	} else {
		t.Logf("Capitalized category failed validation as expected: %v", err)
	}
}
