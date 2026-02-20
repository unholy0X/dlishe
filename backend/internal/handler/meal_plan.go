package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
)

// MealPlanRepository defines the interface for meal plan persistence
type MealPlanRepository interface {
	GetOrCreateByWeek(ctx context.Context, userID uuid.UUID, weekStart time.Time) (*model.MealPlan, error)
	GetByID(ctx context.Context, planID, userID uuid.UUID) (*model.MealPlan, error)
	UpdateTitle(ctx context.Context, planID, userID uuid.UUID, title string) (*model.MealPlan, error)
	AddEntry(ctx context.Context, planID uuid.UUID, input *model.MealPlanEntryInput) (*model.MealPlanEntry, error)
	RemoveEntry(ctx context.Context, planID, entryID uuid.UUID) error
	GetPlanRecipeIngredients(ctx context.Context, planID uuid.UUID) ([]model.RecipeIngredient, []string, error)
}

// MealPlanHandler handles meal plan HTTP requests
type MealPlanHandler struct {
	mealPlanRepo MealPlanRepository
	shoppingRepo ShoppingRepository
	pantryRepo   PantryRepository
}

// NewMealPlanHandler creates a new meal plan handler
func NewMealPlanHandler(mealPlanRepo MealPlanRepository, shoppingRepo ShoppingRepository, pantryRepo PantryRepository) *MealPlanHandler {
	return &MealPlanHandler{
		mealPlanRepo: mealPlanRepo,
		shoppingRepo: shoppingRepo,
		pantryRepo:   pantryRepo,
	}
}

// mondayOf returns the Monday of the week containing the given date
func mondayOf(t time.Time) time.Time {
	weekday := int(t.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	monday := t.AddDate(0, 0, -(weekday - 1))
	return time.Date(monday.Year(), monday.Month(), monday.Day(), 0, 0, 0, 0, time.UTC)
}

// GetCurrentWeek handles GET /api/v1/meal-plans/current
func (h *MealPlanHandler) GetCurrentWeek(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	weekStart := mondayOf(time.Now().UTC())
	plan, err := h.mealPlanRepo.GetOrCreateByWeek(ctx, user.ID, weekStart)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, plan)
}

// GetByWeek handles GET /api/v1/meal-plans/week/{date}
func (h *MealPlanHandler) GetByWeek(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	dateStr := chi.URLParam(r, "date")
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		response.BadRequest(w, "Invalid date format, expected YYYY-MM-DD")
		return
	}

	weekStart := mondayOf(date)
	plan, err := h.mealPlanRepo.GetOrCreateByWeek(ctx, user.ID, weekStart)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, plan)
}

// UpdatePlan handles PUT /api/v1/meal-plans/{id}
func (h *MealPlanHandler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	planID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid plan ID")
		return
	}

	var input struct {
		Title string `json:"title"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if len(input.Title) > 100 {
		response.ValidationFailed(w, "title", "max length 100 characters")
		return
	}

	plan, err := h.mealPlanRepo.UpdateTitle(ctx, planID, user.ID, input.Title)
	if err == model.ErrNotFound {
		response.NotFound(w, "Meal plan")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, plan)
}

// AddEntry handles POST /api/v1/meal-plans/{id}/entries
func (h *MealPlanHandler) AddEntry(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	planID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid plan ID")
		return
	}

	// Verify user owns the plan
	_, err = h.mealPlanRepo.GetByID(ctx, planID, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Meal plan")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	var input model.MealPlanEntryInput
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

	entry, err := h.mealPlanRepo.AddEntry(ctx, planID, &input)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
			response.Conflict(w, "Recipe already added to this slot")
			return
		}
		if strings.Contains(err.Error(), "foreign key") || strings.Contains(err.Error(), "violates foreign key") {
			response.BadRequest(w, "Recipe not found")
			return
		}
		response.InternalError(w)
		return
	}

	response.Created(w, entry)
}

// RemoveEntry handles DELETE /api/v1/meal-plans/{id}/entries/{entryId}
func (h *MealPlanHandler) RemoveEntry(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	planID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid plan ID")
		return
	}

	entryIDStr := chi.URLParam(r, "entryId")
	entryID, err := uuid.Parse(entryIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid entry ID")
		return
	}

	// Verify user owns the plan
	_, err = h.mealPlanRepo.GetByID(ctx, planID, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Meal plan")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	err = h.mealPlanRepo.RemoveEntry(ctx, planID, entryID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Meal plan entry")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// GenerateShoppingList handles POST /api/v1/meal-plans/{id}/generate-list
func (h *MealPlanHandler) GenerateShoppingList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	planID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid plan ID")
		return
	}

	// Verify user owns the plan
	plan, err := h.mealPlanRepo.GetByID(ctx, planID, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Meal plan")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	// Parse optional body (e.g. localized list name from the client)
	var generateReq struct {
		Name string `json:"name"`
	}
	if r.ContentLength > 0 {
		_ = json.NewDecoder(r.Body).Decode(&generateReq)
	}

	if len(plan.Entries) == 0 {
		response.BadRequest(w, "Meal plan has no entries")
		return
	}

	// Get all recipe ingredients from the plan
	ingredients, _, err := h.mealPlanRepo.GetPlanRecipeIngredients(ctx, planID)
	if err != nil {
		response.InternalError(w)
		return
	}

	if len(ingredients) == 0 {
		response.BadRequest(w, "No ingredients found in meal plan recipes")
		return
	}

	// Get user's pantry items for deduction
	pantryItems, err := h.pantryRepo.ListAll(ctx, user.ID)
	if err != nil {
		response.InternalError(w)
		return
	}

	// Build pantry lookup (lowercase name -> item)
	pantryLookup := make(map[string]model.PantryItem)
	for _, item := range pantryItems {
		pantryLookup[strings.ToLower(strings.TrimSpace(item.Name))] = item
	}

	// Aggregate ingredients by (name, category), merging quantities
	type ingredientKey struct {
		name     string
		category string
	}
	aggregated := make(map[ingredientKey]*model.ShoppingItemInput)

	for _, ing := range ingredients {
		category := model.NormalizeCategory(ing.Category)
		qty, unit := model.ToShoppingUnit(ing.Quantity, ing.Unit)

		key := ingredientKey{
			name:     strings.ToLower(strings.TrimSpace(ing.Name)),
			category: category,
		}

		if existing, found := aggregated[key]; found {
			if existing.Quantity != nil && qty != nil && existing.Unit != nil && unit != nil &&
				strings.EqualFold(*existing.Unit, *unit) {
				total := *existing.Quantity + *qty
				existing.Quantity = &total
			}
		} else {
			aggregated[key] = &model.ShoppingItemInput{
				Name:     strings.TrimSpace(ing.Name),
				Quantity: qty,
				Unit:     unit,
				Category: &category,
			}
		}
	}

	// Subtract pantry items
	for key, item := range aggregated {
		if pantryItem, found := pantryLookup[key.name]; found {
			if item.Quantity != nil && pantryItem.Quantity != nil &&
				item.Unit != nil && pantryItem.Unit != nil &&
				strings.EqualFold(*item.Unit, *pantryItem.Unit) {
				remaining := *item.Quantity - *pantryItem.Quantity
				if remaining <= 0 {
					delete(aggregated, key)
					continue
				}
				item.Quantity = &remaining
			} else if pantryItem.Quantity == nil {
				// Pantry has the item without quantity — assume they have enough
				delete(aggregated, key)
			}
		}
	}

	if len(aggregated) == 0 {
		response.OK(w, map[string]interface{}{
			"message": "All ingredients are already in your pantry",
			"listId":  nil,
		})
		return
	}

	// Convert to slice
	var itemInputs []*model.ShoppingItemInput
	for _, input := range aggregated {
		itemInputs = append(itemInputs, input)
	}

	// Create shopping list
	// Use client-provided name (localized) or fall back to default English
	listName := generateReq.Name
	if listName == "" {
		weekStr := plan.WeekStart.Format("Jan 2")
		listName = fmt.Sprintf("Meal Plan — Week of %s", weekStr)
	}
	listInput := &model.ShoppingListInput{
		Name: listName,
	}

	result, err := h.shoppingRepo.CreateListWithItems(ctx, user.ID, listInput, itemInputs)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.Created(w, map[string]interface{}{
		"listId": result.ID,
		"list":   result,
	})
}
