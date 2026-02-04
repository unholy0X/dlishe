package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/service/ai"
)

// ShoppingHandler handles shopping list-related HTTP requests
type ShoppingHandler struct {
	shoppingRepo ShoppingRepository
	recipeRepo   RecipeRepository
	userRepo     UserRepository
	aiService    ai.ShoppingListAnalyzer
}

// NewShoppingHandler creates a new shopping handler
func NewShoppingHandler(shoppingRepo ShoppingRepository, recipeRepo RecipeRepository, userRepo UserRepository, aiService ai.ShoppingListAnalyzer) *ShoppingHandler {
	return &ShoppingHandler{
		shoppingRepo: shoppingRepo,
		recipeRepo:   recipeRepo,
		userRepo:     userRepo,
		aiService:    aiService,
	}
}

// ===== Shopping Lists =====

// ListLists handles GET /api/v1/shopping-lists
// @Summary List shopping lists
// @Description Get all shopping lists for the current user
// @Tags Shopping
// @Produce json
// @Security BearerAuth
// @Param includeArchived query bool false "Include archived lists" default(false)
// @Success 200 {object} SwaggerShoppingListsResponse "List of shopping lists"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /shopping-lists [get]
func (h *ShoppingHandler) ListLists(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	includeArchived := r.URL.Query().Get("includeArchived") == "true"

	lists, err := h.shoppingRepo.ListLists(ctx, user.ID, includeArchived)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, map[string]interface{}{
		"lists": lists,
		"count": len(lists),
	})
}

// GetList handles GET /api/v1/shopping-lists/{id}
// @Summary Get shopping list by ID
// @Description Get a shopping list with optional items
// @Tags Shopping
// @Produce json
// @Security BearerAuth
// @Param id path string true "Shopping list UUID"
// @Param includeItems query bool false "Include list items" default(false)
// @Success 200 {object} SwaggerShoppingListWithItems "Shopping list details"
// @Failure 400 {object} SwaggerErrorResponse "Invalid list ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Shopping list not found"
// @Router /shopping-lists/{id} [get]
func (h *ShoppingHandler) GetList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	// Check if we should include items
	includeItems := r.URL.Query().Get("includeItems") == "true"

	if includeItems {
		listWithItems, err := h.shoppingRepo.GetListWithItems(ctx, id, user.ID)
		if err == model.ErrNotFound {
			response.NotFound(w, "Shopping list")
			return
		}
		if err != nil {
			response.InternalError(w)
			return
		}
		response.OK(w, listWithItems)
	} else {
		list, err := h.shoppingRepo.GetList(ctx, id, user.ID)
		if err == model.ErrNotFound {
			response.NotFound(w, "Shopping list")
			return
		}
		if err != nil {
			response.InternalError(w)
			return
		}
		response.OK(w, list)
	}
}

// CreateList handles POST /api/v1/shopping-lists
// @Summary Create a shopping list
// @Description Create a new shopping list
// @Tags Shopping
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body SwaggerShoppingListInput true "Shopping list data"
// @Success 201 {object} SwaggerShoppingList "Shopping list created"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request body"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /shopping-lists [post]
func (h *ShoppingHandler) CreateList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var input model.ShoppingListInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if err := input.Validate(); err != nil {
		if valErr, ok := err.(model.ErrValidation); ok {
			response.ValidationFailed(w, valErr.Field, valErr.Reason)
			return
		}
		response.BadRequest(w, err.Error())
		return
	}

	list, err := h.shoppingRepo.CreateList(ctx, user.ID, &input)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.Created(w, list)
}

// UpdateList handles PUT /api/v1/shopping-lists/{id}
// @Summary Update a shopping list
// @Description Update an existing shopping list's details
// @Tags Shopping
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Shopping list UUID"
// @Param request body SwaggerShoppingListInput true "Updated list data"
// @Success 200 {object} SwaggerShoppingList "Shopping list updated"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request body"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Shopping list not found"
// @Router /shopping-lists/{id} [put]
func (h *ShoppingHandler) UpdateList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	var input model.ShoppingListInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if err := input.Validate(); err != nil {
		if valErr, ok := err.(model.ErrValidation); ok {
			response.ValidationFailed(w, valErr.Field, valErr.Reason)
			return
		}
		response.BadRequest(w, err.Error())
		return
	}

	list, err := h.shoppingRepo.UpdateList(ctx, id, user.ID, &input)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, list)
}

// DeleteList handles DELETE /api/v1/shopping-lists/{id}
// @Summary Delete a shopping list
// @Description Delete a shopping list and all its items
// @Tags Shopping
// @Security BearerAuth
// @Param id path string true "Shopping list UUID"
// @Success 204 "Shopping list deleted"
// @Failure 400 {object} SwaggerErrorResponse "Invalid list ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Shopping list not found"
// @Router /shopping-lists/{id} [delete]
func (h *ShoppingHandler) DeleteList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	err = h.shoppingRepo.DeleteList(ctx, id, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// ArchiveList handles POST /api/v1/shopping-lists/{id}/archive
// @Summary Archive a shopping list
// @Description Mark a shopping list as archived
// @Tags Shopping
// @Security BearerAuth
// @Param id path string true "Shopping list UUID"
// @Success 204 "Shopping list archived"
// @Failure 400 {object} SwaggerErrorResponse "Invalid list ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Shopping list not found"
// @Router /shopping-lists/{id}/archive [post]
func (h *ShoppingHandler) ArchiveList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	err = h.shoppingRepo.ArchiveList(ctx, id, user.ID, true)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// ===== Shopping Items =====

// ListItems handles GET /api/v1/shopping-lists/{id}/items
// @Summary List shopping list items
// @Description Get all items in a shopping list
// @Tags Shopping
// @Produce json
// @Security BearerAuth
// @Param id path string true "Shopping list UUID"
// @Success 200 {object} SwaggerShoppingItemsResponse "List of items"
// @Failure 400 {object} SwaggerErrorResponse "Invalid list ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Shopping list not found"
// @Router /shopping-lists/{id}/items [get]
func (h *ShoppingHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	listIDStr := chi.URLParam(r, "id")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	// Verify user owns the list
	_, err = h.shoppingRepo.GetList(ctx, listID, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	items, err := h.shoppingRepo.ListItems(ctx, listID)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, map[string]interface{}{
		"items": items,
		"count": len(items),
	})
}

// CreateItem handles POST /api/v1/shopping-lists/{id}/items
// @Summary Add item to shopping list
// @Description Add a new item to a shopping list
// @Tags Shopping
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Shopping list UUID"
// @Param request body SwaggerShoppingItemInput true "Item data"
// @Success 201 {object} SwaggerShoppingItem "Item created"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request body"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Shopping list not found"
// @Router /shopping-lists/{id}/items [post]
func (h *ShoppingHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	listIDStr := chi.URLParam(r, "id")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	// Verify user owns the list
	_, err = h.shoppingRepo.GetList(ctx, listID, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	var input model.ShoppingItemInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if err := input.Validate(); err != nil {
		if valErr, ok := err.(model.ErrValidation); ok {
			response.ValidationFailed(w, valErr.Field, valErr.Reason)
			return
		}
		response.BadRequest(w, err.Error())
		return
	}

	item, err := h.shoppingRepo.CreateItem(ctx, listID, &input)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.Created(w, item)
}

// UpdateItem handles PUT /api/v1/shopping-lists/{id}/items/{itemId}
// @Summary Update a shopping item
// @Description Update an existing item in a shopping list
// @Tags Shopping
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Shopping list UUID"
// @Param itemId path string true "Shopping item UUID"
// @Param request body SwaggerShoppingItemInput true "Updated item data"
// @Success 200 {object} SwaggerShoppingItem "Item updated"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request body"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Shopping list or item not found"
// @Router /shopping-lists/{id}/items/{itemId} [put]
func (h *ShoppingHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	listIDStr := chi.URLParam(r, "id")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	itemIDStr := chi.URLParam(r, "itemId")
	itemID, err := uuid.Parse(itemIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid item ID")
		return
	}

	// Verify user owns the list
	_, err = h.shoppingRepo.GetList(ctx, listID, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	var input model.ShoppingItemInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if err := input.Validate(); err != nil {
		if valErr, ok := err.(model.ErrValidation); ok {
			response.ValidationFailed(w, valErr.Field, valErr.Reason)
			return
		}
		response.BadRequest(w, err.Error())
		return
	}

	item, err := h.shoppingRepo.UpdateItem(ctx, itemID, listID, &input)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping item")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, item)
}

// ToggleItemChecked handles POST /api/v1/shopping-lists/{id}/items/{itemId}/check
// @Summary Toggle item checked status
// @Description Mark or unmark a shopping item as checked
// @Tags Shopping
// @Produce json
// @Security BearerAuth
// @Param id path string true "Shopping list UUID"
// @Param itemId path string true "Shopping item UUID"
// @Success 200 {object} SwaggerShoppingItem "Item with updated checked status"
// @Failure 400 {object} SwaggerErrorResponse "Invalid ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Shopping list or item not found"
// @Router /shopping-lists/{id}/items/{itemId}/check [post]
func (h *ShoppingHandler) ToggleItemChecked(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	listIDStr := chi.URLParam(r, "id")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	itemIDStr := chi.URLParam(r, "itemId")
	itemID, err := uuid.Parse(itemIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid item ID")
		return
	}

	// Verify user owns the list
	_, err = h.shoppingRepo.GetList(ctx, listID, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	item, err := h.shoppingRepo.ToggleItemChecked(ctx, itemID, listID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping item")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, item)
}

// DeleteItem handles DELETE /api/v1/shopping-lists/{id}/items/{itemId}
// @Summary Delete a shopping item
// @Description Remove an item from a shopping list
// @Tags Shopping
// @Security BearerAuth
// @Param id path string true "Shopping list UUID"
// @Param itemId path string true "Shopping item UUID"
// @Success 204 "Item deleted"
// @Failure 400 {object} SwaggerErrorResponse "Invalid ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Shopping list or item not found"
// @Router /shopping-lists/{id}/items/{itemId} [delete]
func (h *ShoppingHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	listIDStr := chi.URLParam(r, "id")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	itemIDStr := chi.URLParam(r, "itemId")
	itemID, err := uuid.Parse(itemIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid item ID")
		return
	}

	// Verify user owns the list
	_, err = h.shoppingRepo.GetList(ctx, listID, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	err = h.shoppingRepo.DeleteItem(ctx, itemID, listID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping item")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// AddFromRecipe handles POST /api/v1/shopping-lists/{id}/add-from-recipe
// @Summary Add recipe ingredients to shopping list
// @Description Add all or selected ingredients from a recipe to the shopping list
// @Tags Shopping
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Shopping list UUID"
// @Param request body SwaggerAddFromRecipeRequest true "Recipe and optional ingredient filter"
// @Success 200 {object} SwaggerAddFromRecipeResponse "Added items"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request body"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Shopping list or recipe not found"
// @Failure 409 {object} SwaggerErrorResponse "Recipe already added"
// @Router /shopping-lists/{id}/add-from-recipe [post]
func (h *ShoppingHandler) AddFromRecipe(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	listIDStr := chi.URLParam(r, "id")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	// Verify user owns the list
	_, err = h.shoppingRepo.GetList(ctx, listID, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	var req struct {
		RecipeID    uuid.UUID `json:"recipeId"`
		Ingredients []string  `json:"ingredients"` // Optional: if present, only add these
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Get the recipe
	recipe, err := h.recipeRepo.GetByID(ctx, req.RecipeID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Recipe")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	// Idempotency check: verify recipe hasn't already been added to this list
	alreadyExists, err := h.shoppingRepo.HasRecipeItems(ctx, listID, recipe.Title)
	if err != nil {
		response.InternalError(w)
		return
	}
	if alreadyExists {
		response.ErrorJSON(w, http.StatusConflict, "RECIPE_ALREADY_ADDED",
			"This recipe has already been added to the shopping list", nil)
		return
	}

	// Prepare batch of items to add with aggregation
	// This ensures duplicate ingredients (same name, unit, category) are merged
	type ingredientKey struct {
		name     string
		unit     string
		category string
	}

	aggregated := make(map[ingredientKey]*model.ShoppingItemInput)
	recipeName := recipe.Title

	for _, ingredient := range recipe.Ingredients {
		// If filtered list is provided, skip if not in list
		if len(req.Ingredients) > 0 {
			found := false
			for _, name := range req.Ingredients {
				// Robust matching: trim and case-insensitive
				if strings.EqualFold(strings.TrimSpace(name), strings.TrimSpace(ingredient.Name)) {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		// Normalize category using centralized validation
		category := model.NormalizeCategory(ingredient.Category)

		// Get unit for aggregation key
		unit := ""
		if ingredient.Unit != nil {
			unit = *ingredient.Unit
		}

		// Create aggregation key
		key := ingredientKey{
			name:     strings.TrimSpace(ingredient.Name),
			unit:     unit,
			category: category,
		}

		// Aggregate or create new entry
		if existing, found := aggregated[key]; found {
			// Merge quantities if both exist
			if existing.Quantity != nil && ingredient.Quantity != nil {
				total := *existing.Quantity + *ingredient.Quantity
				existing.Quantity = &total
			} else if ingredient.Quantity != nil {
				existing.Quantity = ingredient.Quantity
			}
		} else {
			// Create new entry
			aggregated[key] = &model.ShoppingItemInput{
				Name:       strings.TrimSpace(ingredient.Name),
				Quantity:   ingredient.Quantity,
				Unit:       ingredient.Unit,
				Category:   &category,
				RecipeName: &recipeName,
			}
		}
	}

	// Convert aggregated map to slice
	var itemInputs []*model.ShoppingItemInput
	for _, input := range aggregated {
		itemInputs = append(itemInputs, input)
	}

	// Use transaction to add all items atomically
	// This prevents partial failures leaving the list in an inconsistent state
	tx, err := h.shoppingRepo.BeginTransaction(ctx)
	if err != nil {
		response.InternalError(w)
		return
	}
	defer tx.Rollback()

	addedItems, err := h.shoppingRepo.CreateItemBatch(ctx, tx, listID, itemInputs)
	if err != nil {
		response.LogAndError(w, http.StatusInternalServerError, "BULK_INSERT_FAILED",
			"Failed to add recipe ingredients to shopping list", err)
		return
	}

	if err := tx.Commit(); err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, map[string]interface{}{
		"items": addedItems,
		"count": len(addedItems),
	})
}

// SmartMergeList handles POST /api/v1/shopping-lists/smart-merge
// @Summary Smart merge multiple shopping lists using AI
// @Description Uses AI to merge duplicates, normalize units, and categorize items from multiple lists into a NEW list
// @Tags Shopping
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body model.SmartMergeRequest true "Source list IDs"
// @Success 200 {object} SwaggerShoppingListWithItems "New merged list"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 403 {object} SwaggerErrorResponse "Forbidden (Access denied to some lists)"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /shopping-lists/smart-merge [post]
func (h *ShoppingHandler) SmartMergeList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse request body
	var req model.SmartMergeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if len(req.SourceListIDs) == 0 {
		response.BadRequest(w, "At least one source list ID is required")
		return
	}

	// Verify ownership of all lists
	// This prevents users from merging lists they don't own
	owned, err := h.shoppingRepo.VerifyListsOwnership(ctx, user.ID, req.SourceListIDs)
	if err != nil {
		response.InternalError(w)
		return
	}
	if !owned {
		response.ErrorJSON(w, http.StatusForbidden, "ACCESS_DENIED", "You do not have access to one or more provided lists", nil)
		return
	}

	// Fetch all items from all source lists
	items, err := h.shoppingRepo.ListItemsInLists(ctx, req.SourceListIDs)
	if err != nil {
		response.InternalError(w)
		return
	}

	if len(items) == 0 {
		response.BadRequest(w, "Source lists contain no items to merge")
		return
	}

	// AI Processing: Merge items
	// Fetch user to get preference, defaulting to metric if unavailable
	var preferredSystem = "metric"
	dbUser, err := h.userRepo.GetByID(ctx, user.ID)
	if err == nil && dbUser.PreferredUnitSystem != "" {
		preferredSystem = dbUser.PreferredUnitSystem
	}

	// Call AI service with user's preferred unit system
	mergedItems, err := h.aiService.SmartMergeItems(ctx, items, preferredSystem)
	if err != nil {
		response.LogAndError(w, http.StatusInternalServerError, "AI_PROCESSING_FAILED", "Failed to merge items", err)
		return
	}

	// normalize inputs just in case AI missed something (e.g. categories)
	for i := range mergedItems {
		mergedItems[i].NormalizeInput()
	}

	// Create NEW Shopping List
	// Name format: "Smart Merge: [Date]"
	timeStr := time.Now().Format("Jan 02, 15:04")
	listInput := &model.ShoppingListInput{
		Name:        "Smart Merge: " + timeStr,
		Description: ptr("Automatically merged from " + strings.Join(uuidSliceToStrings(req.SourceListIDs), ", ")),
	}
	// Simplified description
	count := len(req.SourceListIDs)
	desc := "Merged from " + strings.Join(stringSlice("list(s)"), "")
	if count == 1 {
		desc = "Optimized copy of original list"
	}
	listInput.Description = &desc

	// Convert structs to pointers
	var itemPtrs []*model.ShoppingItemInput
	for i := range mergedItems {
		itemPtrs = append(itemPtrs, &mergedItems[i])
	}

	// Create list and items atomically
	result, err := h.shoppingRepo.CreateListWithItems(ctx, user.ID, listInput, itemPtrs)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, result)
}

// Helper functions for formatting
func uuidSliceToStrings(ids []uuid.UUID) []string {
	strs := make([]string, len(ids))
	for i, id := range ids {
		strs[i] = id.String()
	}
	return strs
}

func stringSlice(s string) []string {
	return []string{s} // Just dummy for the closure logic above
}

// CompleteList handles POST /api/v1/shopping-lists/{id}/complete
// @Summary Complete a shopping list
// @Description Mark all items as checked and archive the list
// @Tags Shopping
// @Security BearerAuth
// @Param id path string true "Shopping list UUID"
// @Success 204 "Shopping list completed"
// @Failure 400 {object} SwaggerErrorResponse "Invalid list ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Shopping list not found"
// @Router /shopping-lists/{id}/complete [post]
func (h *ShoppingHandler) CompleteList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	// Verify user owns the list
	_, err = h.shoppingRepo.GetList(ctx, id, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	err = h.shoppingRepo.CompleteList(ctx, id, user.ID)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// ptr returns a pointer to the given value
func ptr[T any](v T) *T {
	return &v
}
