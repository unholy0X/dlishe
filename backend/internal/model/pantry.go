package model

import (
	"time"

	"github.com/google/uuid"
)

// PantryItem represents an item in the user's pantry
type PantryItem struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"userId"`
	Name           string     `json:"name"`
	Category       string     `json:"category"`
	Quantity       *float64   `json:"quantity,omitempty"`
	Unit           *string    `json:"unit,omitempty"`
	ExpirationDate *time.Time `json:"expirationDate,omitempty"`
	SyncVersion    int        `json:"syncVersion"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	DeletedAt      *time.Time `json:"deletedAt,omitempty"`
}

// PantryItemInput represents input for creating/updating pantry items
type PantryItemInput struct {
	Name           string     `json:"name"`
	Category       string     `json:"category"`
	Quantity       *float64   `json:"quantity,omitempty"`
	Unit           *string    `json:"unit,omitempty"`
	ExpirationDate *time.Time `json:"expirationDate,omitempty"`
}

// Validate validates the pantry item input
func (p *PantryItemInput) Validate() error {
	if p.Name == "" {
		return ErrValidation{Field: "name", Reason: "required"}
	}
	if len(p.Name) > 255 {
		return ErrValidation{Field: "name", Reason: "max length 255 characters"}
	}
	if p.Category == "" {
		return ErrValidation{Field: "category", Reason: "required"}
	}
	if !isValidCategory(p.Category) {
		return ErrValidation{Field: "category", Reason: "invalid category"}
	}
	if p.Quantity != nil && *p.Quantity < 0 {
		return ErrValidation{Field: "quantity", Reason: "must be non-negative"}
	}
	if p.Quantity != nil && *p.Quantity > 99999.999 {
		return ErrValidation{Field: "quantity", Reason: "max value 99999.999"}
	}
	if p.Unit != nil && len(*p.Unit) > 50 {
		return ErrValidation{Field: "unit", Reason: "max length 50 characters"}
	}
	return nil
}

// DishFlow's 12 ingredient categories
var validCategories = map[string]bool{
	"produce":    true,
	"proteins":   true,
	"dairy":      true,
	"grains":     true,
	"pantry":     true,
	"spices":     true,
	"condiments": true,
	"beverages":  true,
	"frozen":     true,
	"canned":     true,
	"baking":     true,
	"other":      true,
}

func isValidCategory(category string) bool {
	return validCategories[category]
}
