package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

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
	aiService    ai.ShoppingListAnalyzer
}

// NewShoppingHandler creates a new shopping handler
func NewShoppingHandler(shoppingRepo ShoppingRepository, recipeRepo RecipeRepository, aiService ai.ShoppingListAnalyzer) *ShoppingHandler {
	return &ShoppingHandler{
		shoppingRepo: shoppingRepo,
		recipeRepo:   recipeRepo,
		aiService:    aiService,
	}
}

// ===== Shopping Lists =====

// ListLists handles GET /api/v1/shopping-lists
func (h *ShoppingHandler) ListLists(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	includeArchived := r.URL.Query().Get("includeArchived") == "true"

	lists, err := h.shoppingRepo.ListLists(ctx, claims.UserID, includeArchived)
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
func (h *ShoppingHandler) GetList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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
		listWithItems, err := h.shoppingRepo.GetListWithItems(ctx, id, claims.UserID)
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
		list, err := h.shoppingRepo.GetList(ctx, id, claims.UserID)
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
func (h *ShoppingHandler) CreateList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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

	list, err := h.shoppingRepo.CreateList(ctx, claims.UserID, &input)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.Created(w, list)
}

// UpdateList handles PUT /api/v1/shopping-lists/{id}
func (h *ShoppingHandler) UpdateList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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

	list, err := h.shoppingRepo.UpdateList(ctx, id, claims.UserID, &input)
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
func (h *ShoppingHandler) DeleteList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	err = h.shoppingRepo.DeleteList(ctx, id, claims.UserID)
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
func (h *ShoppingHandler) ArchiveList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	err = h.shoppingRepo.ArchiveList(ctx, id, claims.UserID, true)
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
func (h *ShoppingHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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
	_, err = h.shoppingRepo.GetList(ctx, listID, claims.UserID)
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
func (h *ShoppingHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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
	_, err = h.shoppingRepo.GetList(ctx, listID, claims.UserID)
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
func (h *ShoppingHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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
	_, err = h.shoppingRepo.GetList(ctx, listID, claims.UserID)
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
func (h *ShoppingHandler) ToggleItemChecked(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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
	_, err = h.shoppingRepo.GetList(ctx, listID, claims.UserID)
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
func (h *ShoppingHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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
	_, err = h.shoppingRepo.GetList(ctx, listID, claims.UserID)
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
func (h *ShoppingHandler) AddFromRecipe(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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
	_, err = h.shoppingRepo.GetList(ctx, listID, claims.UserID)
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

	// Add each ingredient as a shopping item
	var addedItems []*model.ShoppingItem
	var warnings []string

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

		recipeName := recipe.Title
		// Normalize category to ensure it matches validation rules (lowercase)
		category := strings.ToLower(ingredient.Category)
		input := &model.ShoppingItemInput{
			Name:       ingredient.Name,
			Quantity:   ingredient.Quantity,
			Unit:       ingredient.Unit,
			Category:   &category,
			RecipeName: &recipeName,
		}

		item, err := h.shoppingRepo.CreateItem(ctx, listID, input)
		if err != nil {
			fmt.Printf("Failed to create item %s: %v\n", ingredient.Name, err)

			// Try with category "other" if it failed (likely validation)
			// This handles cases where recipe category doesn't match shopping list categories
			fallbackCategory := "other"
			input.Category = &fallbackCategory
			item, err = h.shoppingRepo.CreateItem(ctx, listID, input)

			if err != nil {
				fmt.Printf("Failed retry with 'other' for item %s: %v\n", ingredient.Name, err)
				warnings = append(warnings, fmt.Sprintf("Failed to add '%s': %v", ingredient.Name, err))
				continue
			}
		}
		addedItems = append(addedItems, item)
	}

	response.OK(w, map[string]interface{}{
		"items":    addedItems,
		"count":    len(addedItems),
		"warnings": warnings,
	})
}

// AnalyzeAddFromRecipe handles POST /api/v1/shopping-lists/{id}/analyze-add-recipe
func (h *ShoppingHandler) AnalyzeAddFromRecipe(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)

	if h.aiService == nil {
		response.BadRequest(w, "AI service not available")
		return
	}

	idStr := chi.URLParam(r, "id")
	listID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	var req struct {
		RecipeID uuid.UUID `json:"recipeId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Get List
	list, err := h.shoppingRepo.GetListWithItems(ctx, listID, claims.UserID)
	if err != nil {
		response.InternalError(w)
		return
	}

	// Get Recipe
	recipe, err := h.recipeRepo.GetByID(ctx, req.RecipeID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Recipe")
		return
	}

	// Create a temporary list with combined items for analysis
	simulatedList := *list
	// We need to clone items slice to avoid mutating original if we were using a pointer (we passed by value but slice is ref)
	// But appending to simulatedList.Items (slice) will likely allocate new array if cap exceeded.
	// To be safe, let's just append.

	var proposedItems []model.ShoppingItem
	for _, ing := range recipe.Ingredients {
		// Mock a shopping item
		// Handle loop variable scoping for category pointer
		cat := ing.Category
		mockItem := model.ShoppingItem{
			ID:       uuid.New(),
			Name:     ing.Name,
			Quantity: ing.Quantity,
			Unit:     ing.Unit,
			Category: &cat,
		}
		simulatedList.Items = append(simulatedList.Items, mockItem)
		proposedItems = append(proposedItems, mockItem)
	}

	// Analyze
	analysis, err := h.aiService.AnalyzeShoppingList(ctx, simulatedList)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, map[string]interface{}{
		"analysis":      analysis,
		"proposedItems": proposedItems,
	})
}

// CompleteList handles POST /api/v1/shopping-lists/{id}/complete
func (h *ShoppingHandler) CompleteList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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
	_, err = h.shoppingRepo.GetList(ctx, id, claims.UserID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	err = h.shoppingRepo.CompleteList(ctx, id, claims.UserID)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// AnalyzeList handles POST /api/v1/shopping-lists/{id}/analyze
func (h *ShoppingHandler) AnalyzeList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	if h.aiService == nil {
		response.BadRequest(w, "AI service not available")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid list ID")
		return
	}

	// Verify user owns the list and get items
	listWithItems, err := h.shoppingRepo.GetListWithItems(ctx, id, claims.UserID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Shopping list")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	// Analyze
	analysis, err := h.aiService.AnalyzeShoppingList(ctx, *listWithItems)
	if err != nil {
		// Log error
		response.InternalError(w)
		return
	}

	response.OK(w, analysis)
}
