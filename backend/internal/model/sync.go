package model

import (
	"time"

	"github.com/google/uuid"
)

// SyncRequest represents a client's sync request
type SyncRequest struct {
	LastSyncTimestamp time.Time      `json:"lastSyncTimestamp"`
	Recipes           []Recipe       `json:"recipes,omitempty"`
	PantryItems       []PantryItem   `json:"pantryItems,omitempty"`
	ShoppingLists     []ShoppingList `json:"shoppingLists,omitempty"`
	ShoppingItems     []ShoppingItem `json:"shoppingItems,omitempty"`
}

// SyncResponse represents the server's sync response
type SyncResponse struct {
	ServerTimestamp time.Time      `json:"serverTimestamp"`
	Recipes         []Recipe       `json:"recipes,omitempty"`
	PantryItems     []PantryItem   `json:"pantryItems,omitempty"`
	ShoppingLists   []ShoppingList `json:"shoppingLists,omitempty"`
	ShoppingItems   []ShoppingItem `json:"shoppingItems,omitempty"`
	Conflicts       []Conflict     `json:"conflicts,omitempty"`
}

// Conflict represents a sync conflict
type Conflict struct {
	ResourceType string    `json:"resourceType"` // "recipe", "pantry_item", "shopping_list", "shopping_item"
	ResourceID   uuid.UUID `json:"resourceId"`
	Resolution   string    `json:"resolution"` // "server_wins", "client_wins", "merged"
	Reason       string    `json:"reason"`
}

// ConflictResolution defines how conflicts are resolved
type ConflictResolution string

const (
	ServerWins ConflictResolution = "server_wins"
	ClientWins ConflictResolution = "client_wins"
	Merged     ConflictResolution = "merged"
)

// ResourceType defines the type of resource being synced
type ResourceType string

const (
	ResourceTypeRecipe       ResourceType = "recipe"
	ResourceTypePantryItem   ResourceType = "pantry_item"
	ResourceTypeShoppingList ResourceType = "shopping_list"
	ResourceTypeShoppingItem ResourceType = "shopping_item"
)
