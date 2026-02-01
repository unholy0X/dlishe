package sync

import (
	"time"

	"github.com/dishflow/backend/internal/model"
)

// ConflictResolver handles conflict resolution logic
type ConflictResolver struct{}

// NewConflictResolver creates a new conflict resolver
func NewConflictResolver() *ConflictResolver {
	return &ConflictResolver{}
}

// ResolveRecipe resolves conflicts for recipes (server-wins strategy)
func (r *ConflictResolver) ResolveRecipe(clientRecipe, serverRecipe *model.Recipe) (winner *model.Recipe, conflict *model.Conflict) {
	// Server always wins for recipes (they're too valuable to auto-merge)
	conflict = &model.Conflict{
		ResourceType: string(model.ResourceTypeRecipe),
		ResourceID:   serverRecipe.ID,
		Resolution:   string(model.ServerWins),
		Reason:       "Server version preserved for recipe safety",
	}
	return serverRecipe, conflict
}

// ResolvePantryItem resolves conflicts for pantry items (Last-Write-Wins)
func (r *ConflictResolver) ResolvePantryItem(clientItem, serverItem *model.PantryItem) (winner *model.PantryItem, conflict *model.Conflict) {
	// Last-Write-Wins based on updated_at timestamp
	if clientItem.UpdatedAt.After(serverItem.UpdatedAt) {
		conflict = &model.Conflict{
			ResourceType: string(model.ResourceTypePantryItem),
			ResourceID:   clientItem.ID,
			Resolution:   string(model.ClientWins),
			Reason:       "Client version is newer",
		}
		return clientItem, conflict
	}

	conflict = &model.Conflict{
		ResourceType: string(model.ResourceTypePantryItem),
		ResourceID:   serverItem.ID,
		Resolution:   string(model.ServerWins),
		Reason:       "Server version is newer",
	}
	return serverItem, conflict
}

// ResolveShoppingList resolves conflicts for shopping lists (Last-Write-Wins)
func (r *ConflictResolver) ResolveShoppingList(clientList, serverList *model.ShoppingList) (winner *model.ShoppingList, conflict *model.Conflict) {
	// Last-Write-Wins based on updated_at timestamp
	if clientList.UpdatedAt.After(serverList.UpdatedAt) {
		conflict = &model.Conflict{
			ResourceType: string(model.ResourceTypeShoppingList),
			ResourceID:   clientList.ID,
			Resolution:   string(model.ClientWins),
			Reason:       "Client version is newer",
		}
		return clientList, conflict
	}

	conflict = &model.Conflict{
		ResourceType: string(model.ResourceTypeShoppingList),
		ResourceID:   serverList.ID,
		Resolution:   string(model.ServerWins),
		Reason:       "Server version is newer",
	}
	return serverList, conflict
}

// ResolveShoppingItem resolves conflicts for shopping items (Last-Write-Wins)
func (r *ConflictResolver) ResolveShoppingItem(clientItem, serverItem *model.ShoppingItem) (winner *model.ShoppingItem, conflict *model.Conflict) {
	// Last-Write-Wins based on updated_at timestamp
	if clientItem.UpdatedAt.After(serverItem.UpdatedAt) {
		conflict = &model.Conflict{
			ResourceType: string(model.ResourceTypeShoppingItem),
			ResourceID:   clientItem.ID,
			Resolution:   string(model.ClientWins),
			Reason:       "Client version is newer",
		}
		return clientItem, conflict
	}

	conflict = &model.Conflict{
		ResourceType: string(model.ResourceTypeShoppingItem),
		ResourceID:   serverItem.ID,
		Resolution:   string(model.ServerWins),
		Reason:       "Server version is newer",
	}
	return serverItem, conflict
}

// ShouldResolve determines if a conflict needs resolution
// Returns true if both items exist and have different sync versions
func (r *ConflictResolver) ShouldResolve(clientVersion, serverVersion int, clientDeleted, serverDeleted *time.Time) bool {
	// If one is deleted and the other isn't, we need to resolve
	if (clientDeleted != nil) != (serverDeleted != nil) {
		return true
	}

	// If sync versions differ, we need to resolve
	return clientVersion != serverVersion
}
