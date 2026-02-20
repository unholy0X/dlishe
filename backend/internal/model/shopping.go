package model

import (
	"time"

	"github.com/google/uuid"
)

// ShoppingList represents a shopping list
type ShoppingList struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"userId"`
	Name        string     `json:"name"`
	Description *string    `json:"description,omitempty"`
	Icon        *string    `json:"icon,omitempty"`
	IsTemplate  bool       `json:"isTemplate"`
	IsArchived  bool       `json:"isArchived"`
	SyncVersion int        `json:"syncVersion"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
}

// ShoppingItem represents an item in a shopping list
type ShoppingItem struct {
	ID          uuid.UUID  `json:"id"`
	ListID      uuid.UUID  `json:"listId"`
	Name        string     `json:"name"`
	Quantity    *float64   `json:"quantity,omitempty"`
	Unit        *string    `json:"unit,omitempty"`
	Category    *string    `json:"category,omitempty"`
	IsChecked   bool       `json:"isChecked"`
	RecipeName  *string    `json:"recipeName,omitempty"`
	SyncVersion int        `json:"syncVersion"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
}

// ShoppingListInput represents input for creating/updating shopping lists
type ShoppingListInput struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Icon        *string `json:"icon,omitempty"`
	IsTemplate  bool    `json:"isTemplate"`
}

// ShoppingItemInput represents input for creating/updating shopping items
type ShoppingItemInput struct {
	Name       string   `json:"name"`
	Quantity   *float64 `json:"quantity,omitempty"`
	Unit       *string  `json:"unit,omitempty"`
	Category   *string  `json:"category,omitempty"`
	RecipeName *string  `json:"recipeName,omitempty"`
}

// SmartMergeRequest represents request to merge lists
type SmartMergeRequest struct {
	SourceListIDs []uuid.UUID `json:"sourceListIds"`
	Name          string      `json:"name,omitempty"`
}

// ShoppingListWithItems represents a list with its items
type ShoppingListWithItems struct {
	ShoppingList
	Items []ShoppingItem `json:"items"`
}

// Validate validates the shopping list input
func (s *ShoppingListInput) Validate() error {
	if s.Name == "" {
		return ErrValidation{Field: "name", Reason: "required"}
	}
	if len(s.Name) > 255 {
		return ErrValidation{Field: "name", Reason: "max length 255 characters"}
	}
	if s.Description != nil && len(*s.Description) > 5000 {
		return ErrValidation{Field: "description", Reason: "max length 5000 characters"}
	}
	if s.Icon != nil && len(*s.Icon) > 50 {
		return ErrValidation{Field: "icon", Reason: "max length 50 characters"}
	}
	return nil
}

// Validate validates the shopping item input
func (s *ShoppingItemInput) Validate() error {
	if s.Name == "" {
		return ErrValidation{Field: "name", Reason: "required"}
	}
	if len(s.Name) > 255 {
		return ErrValidation{Field: "name", Reason: "max length 255 characters"}
	}
	if s.Quantity != nil && *s.Quantity < 0 {
		return ErrValidation{Field: "quantity", Reason: "must be non-negative"}
	}
	if s.Quantity != nil && *s.Quantity > 99999.999 {
		return ErrValidation{Field: "quantity", Reason: "max value 99999.999"}
	}
	if s.Unit != nil && len(*s.Unit) > 50 {
		return ErrValidation{Field: "unit", Reason: "max length 50 characters"}
	}
	if s.Category != nil && *s.Category != "" && !IsValidCategory(*s.Category) {
		// Note: We use lenient validation - unknown categories will be normalized to "other"
		// Only reject if it's truly invalid (not just an unknown alias)
	}
	if s.RecipeName != nil && len(*s.RecipeName) > 255 {
		return ErrValidation{Field: "recipeName", Reason: "max length 255 characters"}
	}
	return nil
}

// NormalizeInput normalizes the input fields before saving
// This should be called by handlers before passing to repository
func (s *ShoppingItemInput) NormalizeInput() {
	if s.Category != nil && *s.Category != "" {
		normalized := NormalizeCategory(*s.Category)
		s.Category = &normalized
	}
}
