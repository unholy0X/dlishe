package sync

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/repository/postgres"
)

// Service handles synchronization logic
type Service struct {
	recipeRepo   *postgres.RecipeRepository
	pantryRepo   *postgres.PantryRepository
	shoppingRepo *postgres.ShoppingRepository
	resolver     *ConflictResolver
}

// NewService creates a new sync service
func NewService(
	recipeRepo *postgres.RecipeRepository,
	pantryRepo *postgres.PantryRepository,
	shoppingRepo *postgres.ShoppingRepository,
) *Service {
	return &Service{
		recipeRepo:   recipeRepo,
		pantryRepo:   pantryRepo,
		shoppingRepo: shoppingRepo,
		resolver:     NewConflictResolver(),
	}
}

// Sync processes a sync request and returns the response
func (s *Service) Sync(ctx context.Context, userID uuid.UUID, req *model.SyncRequest) (*model.SyncResponse, error) {
	response := &model.SyncResponse{
		ServerTimestamp: time.Now().UTC(),
		Conflicts:       []model.Conflict{},
	}

	// Process recipes
	if err := s.syncRecipes(ctx, userID, req.Recipes, response); err != nil {
		return nil, err
	}

	// Process pantry items
	if err := s.syncPantryItems(ctx, userID, req.PantryItems, response); err != nil {
		return nil, err
	}

	// Process shopping lists
	if err := s.syncShoppingLists(ctx, userID, req.ShoppingLists, response); err != nil {
		return nil, err
	}

	// Process shopping items
	if err := s.syncShoppingItems(ctx, userID, req.ShoppingItems, response); err != nil {
		return nil, err
	}

	// Get server changes since last sync
	if err := s.getServerChanges(ctx, userID, req.LastSyncTimestamp, response); err != nil {
		return nil, err
	}

	return response, nil
}

// syncRecipes processes recipe changes from client
func (s *Service) syncRecipes(ctx context.Context, userID uuid.UUID, clientRecipes []model.Recipe, response *model.SyncResponse) error {
	for _, clientRecipe := range clientRecipes {
		// Get server version if it exists
		serverRecipe, err := s.recipeRepo.GetByID(ctx, clientRecipe.ID)
		if err != nil && err != model.ErrNotFound {
			return err
		}

		// New recipe from client
		if err == model.ErrNotFound {
			// Ensure user ID matches
			clientRecipe.UserID = userID
			if err := s.recipeRepo.Upsert(ctx, &clientRecipe); err != nil {
				return err
			}
			continue
		}

		// Check if conflict resolution needed
		if s.resolver.ShouldResolve(clientRecipe.SyncVersion, serverRecipe.SyncVersion, clientRecipe.DeletedAt, serverRecipe.DeletedAt) {
			winner, conflict := s.resolver.ResolveRecipe(&clientRecipe, serverRecipe)
			response.Conflicts = append(response.Conflicts, *conflict)

			// If client wins, update server
			if conflict.Resolution == string(model.ClientWins) {
				winner.UserID = userID
				if err := s.recipeRepo.Upsert(ctx, winner); err != nil {
					return err
				}
			}
		}
	}

	return nil
}

// syncPantryItems processes pantry item changes from client
func (s *Service) syncPantryItems(ctx context.Context, userID uuid.UUID, clientItems []model.PantryItem, response *model.SyncResponse) error {
	for _, clientItem := range clientItems {
		// Get server version if it exists
		serverItem, err := s.pantryRepo.Get(ctx, clientItem.ID, userID)
		if err != nil && err != model.ErrNotFound {
			return err
		}

		// New item from client
		if err == model.ErrNotFound {
			// Create via repository (it will handle the insert)
			input := &model.PantryItemInput{
				Name:     clientItem.Name,
				Category: clientItem.Category,
				Quantity: clientItem.Quantity,
				Unit:     clientItem.Unit,
			}
			if _, err := s.pantryRepo.Create(ctx, userID, input); err != nil {
				return err
			}
			continue
		}

		// Check if conflict resolution needed
		if s.resolver.ShouldResolve(clientItem.SyncVersion, serverItem.SyncVersion, clientItem.DeletedAt, serverItem.DeletedAt) {
			winner, conflict := s.resolver.ResolvePantryItem(&clientItem, serverItem)
			response.Conflicts = append(response.Conflicts, *conflict)

			// If client wins, update server
			if conflict.Resolution == string(model.ClientWins) {
				input := &model.PantryItemInput{
					Name:     winner.Name,
					Category: winner.Category,
					Quantity: winner.Quantity,
					Unit:     winner.Unit,
				}
				if _, err := s.pantryRepo.Update(ctx, winner.ID, userID, input); err != nil {
					return err
				}
			}
		}
	}

	return nil
}

// syncShoppingLists processes shopping list changes from client
func (s *Service) syncShoppingLists(ctx context.Context, userID uuid.UUID, clientLists []model.ShoppingList, response *model.SyncResponse) error {
	for _, clientList := range clientLists {
		// Get server version if it exists
		serverList, err := s.shoppingRepo.GetList(ctx, clientList.ID, userID)
		if err != nil && err != model.ErrNotFound {
			return err
		}

		// New list from client
		if err == model.ErrNotFound {
			input := &model.ShoppingListInput{
				Name:        clientList.Name,
				Description: clientList.Description,
				Icon:        clientList.Icon,
				IsTemplate:  clientList.IsTemplate,
			}
			if _, err := s.shoppingRepo.CreateList(ctx, userID, input); err != nil {
				return err
			}
			continue
		}

		// Check if conflict resolution needed
		if s.resolver.ShouldResolve(clientList.SyncVersion, serverList.SyncVersion, clientList.DeletedAt, serverList.DeletedAt) {
			winner, conflict := s.resolver.ResolveShoppingList(&clientList, serverList)
			response.Conflicts = append(response.Conflicts, *conflict)

			// If client wins, update server
			if conflict.Resolution == string(model.ClientWins) {
				input := &model.ShoppingListInput{
					Name:        winner.Name,
					Description: winner.Description,
					Icon:        winner.Icon,
					IsTemplate:  winner.IsTemplate,
				}
				if _, err := s.shoppingRepo.UpdateList(ctx, winner.ID, userID, input); err != nil {
					return err
				}
			}
		}
	}

	return nil
}

// syncShoppingItems processes shopping item changes from client
func (s *Service) syncShoppingItems(ctx context.Context, userID uuid.UUID, clientItems []model.ShoppingItem, response *model.SyncResponse) error {
	for _, clientItem := range clientItems {
		// Get server version if it exists
		serverItem, err := s.shoppingRepo.GetItem(ctx, clientItem.ID, clientItem.ListID)
		if err != nil && err != model.ErrNotFound {
			return err
		}

		// New item from client
		if err == model.ErrNotFound {
			input := &model.ShoppingItemInput{
				Name:       clientItem.Name,
				Quantity:   clientItem.Quantity,
				Unit:       clientItem.Unit,
				Category:   clientItem.Category,
				RecipeName: clientItem.RecipeName,
			}
			if _, err := s.shoppingRepo.CreateItem(ctx, clientItem.ListID, input); err != nil {
				return err
			}
			continue
		}

		// Check if conflict resolution needed
		if s.resolver.ShouldResolve(clientItem.SyncVersion, serverItem.SyncVersion, clientItem.DeletedAt, serverItem.DeletedAt) {
			winner, conflict := s.resolver.ResolveShoppingItem(&clientItem, serverItem)
			response.Conflicts = append(response.Conflicts, *conflict)

			// If client wins, update server
			if conflict.Resolution == string(model.ClientWins) {
				input := &model.ShoppingItemInput{
					Name:       winner.Name,
					Quantity:   winner.Quantity,
					Unit:       winner.Unit,
					Category:   winner.Category,
					RecipeName: winner.RecipeName,
				}
				if _, err := s.shoppingRepo.UpdateItem(ctx, winner.ID, winner.ListID, input); err != nil {
					return err
				}
			}
		}
	}

	return nil
}

// getServerChanges retrieves all changes from server since last sync
func (s *Service) getServerChanges(ctx context.Context, userID uuid.UUID, since time.Time, response *model.SyncResponse) error {
	// Get recipe changes
	recipes, err := s.recipeRepo.GetChangesSince(ctx, userID, since)
	if err != nil {
		return err
	}
	response.Recipes = recipes

	// Get pantry changes
	pantryItemsPtr, err := s.pantryRepo.GetChangesSince(ctx, userID, since)
	if err != nil {
		return err
	}
	// Convert []*PantryItem to []PantryItem
	pantryItems := make([]model.PantryItem, len(pantryItemsPtr))
	for i, item := range pantryItemsPtr {
		pantryItems[i] = *item
	}
	response.PantryItems = pantryItems

	// Get shopping list and item changes
	listsPtr, items, err := s.shoppingRepo.GetChangesSince(ctx, userID, since)
	if err != nil {
		return err
	}
	// Convert []*ShoppingList to []ShoppingList
	lists := make([]model.ShoppingList, len(listsPtr))
	for i, list := range listsPtr {
		lists[i] = *list
	}
	response.ShoppingLists = lists
	response.ShoppingItems = items

	return nil
}
