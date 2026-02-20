package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/repository/postgres"
)

type RecipeHandler struct {
	repo             RecipeRepository
	adminEmails      []string
	inspiratorEmails []string
}

func NewRecipeHandler(repo RecipeRepository, adminEmails []string, inspiratorEmails []string) *RecipeHandler {
	return &RecipeHandler{repo: repo, adminEmails: adminEmails, inspiratorEmails: inspiratorEmails}
}

// Create handles POST /api/v1/recipes
// @Summary Create a new recipe
// @Description Create a new recipe with ingredients and steps
// @Tags Recipes
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body SwaggerRecipe true "Recipe data"
// @Success 201 {object} SwaggerRecipe "Recipe created successfully"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request body"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /recipes [post]
func (h *RecipeHandler) Create(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req model.Recipe
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields
	if req.Title == "" {
		response.BadRequest(w, "Title is required")
		return
	}

	// Validate numeric fields
	if req.Servings != nil && *req.Servings < 1 {
		response.BadRequest(w, "Servings must be at least 1")
		return
	}
	if req.PrepTime != nil && *req.PrepTime < 0 {
		response.BadRequest(w, "Prep time cannot be negative")
		return
	}
	if req.CookTime != nil && *req.CookTime < 0 {
		response.BadRequest(w, "Cook time cannot be negative")
		return
	}

	// Validate ingredients
	for i, ing := range req.Ingredients {
		if strings.TrimSpace(ing.Name) == "" {
			response.BadRequest(w, fmt.Sprintf("Ingredient %d: name is required", i+1))
			return
		}
		if ing.Quantity != nil && *ing.Quantity < 0 {
			response.BadRequest(w, fmt.Sprintf("Ingredient %d: quantity cannot be negative", i+1))
			return
		}
	}

	// Set user ID from context
	req.UserID = user.ID

	// Ensure ID is generated if not provided
	if req.ID == uuid.Nil {
		req.ID = uuid.New()
	}

	// Auto-public for admin users
	if model.IsAdminEmail(user.Email, h.adminEmails) {
		req.IsPublic = true
	}

	// Auto-featured for inspirator users (kept separate from public/suggested pool)
	if model.IsInspiratorEmail(user.Email, h.inspiratorEmails) {
		req.IsFeatured = true
		now := time.Now().UTC()
		req.FeaturedAt = &now
	}

	if err := h.repo.Create(r.Context(), &req); err != nil {
		response.InternalError(w)
		return
	}

	response.Created(w, req)
}

// Search handles GET /api/v1/recipes/search
// @Summary Search recipes
// @Description Search user's recipes by title, cuisine, description, or tags
// @Tags Recipes
// @Produce json
// @Security BearerAuth
// @Param q query string true "Search query (min 1 character)"
// @Param limit query int false "Max results (1-50)" default(10)
// @Success 200 {object} SwaggerSearchResponse "Search results"
// @Failure 400 {object} SwaggerErrorResponse "Missing or invalid query"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /recipes/search [get]
func (h *RecipeHandler) Search(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get search query - required parameter
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		response.BadRequest(w, "Search query 'q' is required")
		return
	}

	// Parse limit with sensible defaults and bounds
	limit := 10
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 50 {
			limit = val
		}
	}

	// Execute search
	recipes, err := h.repo.Search(r.Context(), user.ID, query, limit)
	if err != nil {
		// Log error, don't expose details
		response.InternalError(w)
		return
	}

	// Never return nil slice
	if recipes == nil {
		recipes = []*model.Recipe{}
	}

	// Build lightweight response for suggestions
	results := make([]SearchResult, 0, len(recipes))
	for _, r := range recipes {
		result := SearchResult{
			ID:         r.ID.String(),
			Title:      r.Title,
			IsFavorite: r.IsFavorite,
		}
		if r.Cuisine != nil {
			result.Cuisine = *r.Cuisine
		}
		if r.ThumbnailURL != nil {
			result.ThumbnailURL = *r.ThumbnailURL
		}
		if r.Difficulty != nil {
			result.Difficulty = *r.Difficulty
		}
		results = append(results, result)
	}

	response.OK(w, SearchResponse{
		Query:   query,
		Results: results,
		Count:   len(results),
	})
}

// SearchResponse is the API response for recipe search.
type SearchResponse struct {
	Query   string         `json:"query"`
	Results []SearchResult `json:"results"`
	Count   int            `json:"count"`
}

// SearchResult is a lightweight recipe summary for search suggestions.
type SearchResult struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Cuisine      string `json:"cuisine,omitempty"`
	ThumbnailURL string `json:"thumbnailUrl,omitempty"`
	Difficulty   string `json:"difficulty,omitempty"`
	IsFavorite   bool   `json:"isFavorite"`
}

// SearchPublic handles GET /api/v1/recipes/search/public — no auth required
func (h *RecipeHandler) SearchPublic(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		response.BadRequest(w, "Search query 'q' is required")
		return
	}

	lang := r.URL.Query().Get("lang")
	switch lang {
	case "en", "fr", "ar":
		// valid
	default:
		lang = "en"
	}

	limit := 15
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 50 {
			limit = val
		}
	}

	recipes, err := h.repo.SearchPublic(r.Context(), query, lang, limit)
	if err != nil {
		response.InternalError(w)
		return
	}

	if recipes == nil {
		recipes = []*model.Recipe{}
	}

	results := make([]SearchResult, 0, len(recipes))
	for _, r := range recipes {
		result := SearchResult{
			ID:    r.ID.String(),
			Title: r.Title,
		}
		if r.Cuisine != nil {
			result.Cuisine = *r.Cuisine
		}
		if r.ThumbnailURL != nil {
			result.ThumbnailURL = *r.ThumbnailURL
		}
		if r.Difficulty != nil {
			result.Difficulty = *r.Difficulty
		}
		results = append(results, result)
	}

	response.OK(w, SearchResponse{
		Query:   query,
		Results: results,
		Count:   len(results),
	})
}

// ListSuggested handles GET /api/v1/recipes/suggested
// @Summary List suggested/public recipes
// @Description Get paginated list of curated public recipes available to all users
// @Tags Recipes
// @Produce json
// @Param limit query int false "Items per page (max 50)" default(20)
// @Param offset query int false "Pagination offset" default(0)
// @Success 200 {object} SwaggerRecipeListResponse "List of suggested recipes"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /recipes/suggested [get]
func (h *RecipeHandler) ListSuggested(w http.ResponseWriter, r *http.Request) {
	// No auth required - public endpoint

	// Language filter: ?lang=en|fr|ar (default "en")
	lang := r.URL.Query().Get("lang")
	switch lang {
	case "en", "fr", "ar":
		// valid
	default:
		lang = "en"
	}

	// Pagination
	limit := 20
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 50 {
			limit = val
		}
	}

	if o := r.URL.Query().Get("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil && val >= 0 {
			offset = val
		}
	}

	recipes, total, err := h.repo.ListPublic(r.Context(), lang, limit, offset)
	if err != nil {
		response.InternalError(w)
		return
	}

	if recipes == nil {
		recipes = []*model.Recipe{}
	}

	response.OK(w, map[string]interface{}{
		"items":  recipes,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// ListFeatured handles GET /api/v1/recipes/featured
// @Summary List featured/curated recipes
// @Description Get paginated list of featured recipes from inspirator creators
// @Tags Recipes
// @Produce json
// @Param limit query int false "Items per page (max 50)" default(30)
// @Param offset query int false "Pagination offset" default(0)
// @Success 200 {object} SwaggerRecipeListResponse "List of featured recipes"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /recipes/featured [get]
func (h *RecipeHandler) ListFeatured(w http.ResponseWriter, r *http.Request) {
	// No auth required - public endpoint

	// Language filter: ?lang=en|fr|ar (default "en")
	lang := r.URL.Query().Get("lang")
	switch lang {
	case "en", "fr", "ar":
		// valid
	default:
		lang = "en"
	}

	// Pagination
	limit := 30
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 50 {
			limit = val
		}
	}

	if o := r.URL.Query().Get("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil && val >= 0 {
			offset = val
		}
	}

	recipes, total, err := h.repo.ListFeatured(r.Context(), lang, limit, offset)
	if err != nil {
		response.InternalError(w)
		return
	}

	if recipes == nil {
		recipes = []*model.Recipe{}
	}

	response.OK(w, map[string]interface{}{
		"items":  recipes,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// List handles GET /api/v1/recipes
// @Summary List user's recipes
// @Description Get paginated list of user's recipes
// @Tags Recipes
// @Produce json
// @Security BearerAuth
// @Param limit query int false "Items per page (max 50)" default(20)
// @Param offset query int false "Pagination offset" default(0)
// @Success 200 {object} SwaggerRecipeListResponse "List of recipes"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /recipes [get]
func (h *RecipeHandler) List(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Pagination
	limit := 20
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 50 {
			limit = val
		}
	}

	if o := r.URL.Query().Get("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil && val >= 0 {
			offset = val
		}
	}

	recipes, total, err := h.repo.ListByUser(r.Context(), user.ID, limit, offset)
	if err != nil {
		response.InternalError(w)
		return
	}

	// If nil, return empty slice
	if recipes == nil {
		recipes = []*model.Recipe{}
	}

	response.OK(w, map[string]interface{}{
		"items":  recipes,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// Get handles GET /api/v1/recipes/{recipeID}
// @Summary Get recipe by ID
// @Description Get full recipe details including ingredients and steps
// @Tags Recipes
// @Produce json
// @Security BearerAuth
// @Param recipeID path string true "Recipe UUID"
// @Success 200 {object} SwaggerRecipe "Recipe details"
// @Failure 400 {object} SwaggerErrorResponse "Invalid recipe ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 403 {object} SwaggerErrorResponse "Access denied"
// @Failure 404 {object} SwaggerErrorResponse "Recipe not found"
// @Router /recipes/{recipeID} [get]
func (h *RecipeHandler) Get(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "recipeID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid recipe ID")
		return
	}

	recipe, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		if err == postgres.ErrRecipeNotFound {
			response.NotFound(w, "Recipe not found")
			return
		}
		response.InternalError(w)
		return
	}

	// Check ownership, public, or featured access
	if recipe.UserID != user.ID && !recipe.IsPublic && !recipe.IsFeatured {
		response.Forbidden(w, "Access denied")
		return
	}

	response.OK(w, recipe)
}

// Update handles PUT /api/v1/recipes/{recipeID}
// @Summary Update a recipe
// @Description Update an existing recipe's details, ingredients, and steps
// @Tags Recipes
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param recipeID path string true "Recipe UUID"
// @Param request body SwaggerRecipe true "Updated recipe data"
// @Success 200 {object} SwaggerRecipe "Recipe updated successfully"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request body"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 403 {object} SwaggerErrorResponse "Access denied"
// @Failure 404 {object} SwaggerErrorResponse "Recipe not found"
// @Router /recipes/{recipeID} [put]
func (h *RecipeHandler) Update(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "recipeID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid recipe ID")
		return
	}

	// Check existence and ownership first
	existing, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		if err == postgres.ErrRecipeNotFound {
			response.NotFound(w, "Recipe not found")
			return
		}
		response.InternalError(w)
		return
	}

	if existing.UserID != user.ID {
		response.Forbidden(w, "Access denied")
		return
	}

	var req model.Recipe
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate fields
	if req.Servings != nil && *req.Servings < 1 {
		response.BadRequest(w, "Servings must be at least 1")
		return
	}
	if req.PrepTime != nil && *req.PrepTime < 0 {
		response.BadRequest(w, "Prep time cannot be negative")
		return
	}
	if req.CookTime != nil && *req.CookTime < 0 {
		response.BadRequest(w, "Cook time cannot be negative")
		return
	}

	// Validate ingredients
	for i, ing := range req.Ingredients {
		if strings.TrimSpace(ing.Name) == "" {
			response.BadRequest(w, fmt.Sprintf("Ingredient %d: name is required", i+1))
			return
		}
		if ing.Quantity != nil && *ing.Quantity < 0 {
			response.BadRequest(w, fmt.Sprintf("Ingredient %d: quantity cannot be negative", i+1))
			return
		}
	}

	// Ensure IDs match
	req.ID = id
	req.UserID = user.ID

	if err := h.repo.Update(r.Context(), &req); err != nil {
		response.InternalError(w)
		return
	}

	// Fetch updated to get generated fields (timestamps etc)
	updated, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		response.OK(w, req) // Valid fallback
		return
	}

	response.OK(w, updated)
}

// Delete handles DELETE /api/v1/recipes/{recipeID}
// @Summary Delete a recipe
// @Description Soft delete a recipe (can be recovered)
// @Tags Recipes
// @Security BearerAuth
// @Param recipeID path string true "Recipe UUID"
// @Success 204 "Recipe deleted successfully"
// @Failure 400 {object} SwaggerErrorResponse "Invalid recipe ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 403 {object} SwaggerErrorResponse "Access denied"
// @Failure 404 {object} SwaggerErrorResponse "Recipe not found"
// @Router /recipes/{recipeID} [delete]
func (h *RecipeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "recipeID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid recipe ID")
		return
	}

	// Check existence and ownership
	existing, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		if err == postgres.ErrRecipeNotFound {
			response.NotFound(w, "Recipe not found")
			return
		}
		response.InternalError(w)
		return
	}

	if existing.UserID != user.ID {
		response.Forbidden(w, "Access denied")
		return
	}

	if err := h.repo.SoftDelete(r.Context(), id); err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// ToggleFavorite handles POST /api/v1/recipes/{recipeID}/favorite
// @Summary Toggle recipe favorite status
// @Description Mark or unmark a recipe as favorite
// @Tags Recipes
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param recipeID path string true "Recipe UUID"
// @Param request body SwaggerFavoriteRequest true "Favorite status"
// @Success 200 {object} SwaggerFavoriteResponse "Favorite status updated"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 403 {object} SwaggerErrorResponse "Access denied"
// @Failure 404 {object} SwaggerErrorResponse "Recipe not found"
// @Router /recipes/{recipeID}/favorite [post]
func (h *RecipeHandler) ToggleFavorite(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "recipeID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid recipe ID")
		return
	}

	var req struct {
		IsFavorite bool `json:"isFavorite"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	existing, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		if err == postgres.ErrRecipeNotFound {
			response.NotFound(w, "Recipe not found")
			return
		}
		response.InternalError(w)
		return
	}

	if existing.UserID != user.ID {
		response.Forbidden(w, "Access denied")
		return
	}

	if err := h.repo.SetFavorite(r.Context(), id, req.IsFavorite); err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, map[string]interface{}{
		"success":    true,
		"isFavorite": req.IsFavorite,
	})
}

// Clone handles POST /api/v1/recipes/{recipeID}/save
// @Summary Save/clone a recipe
// @Description Clone a recipe to the current user's collection. Works with own recipes, shared recipes, or public recipes.
// @Tags Recipes
// @Produce json
// @Security BearerAuth
// @Param recipeID path string true "Source Recipe UUID"
// @Success 201 {object} SwaggerRecipe "Cloned recipe"
// @Failure 400 {object} SwaggerErrorResponse "Invalid recipe ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 403 {object} SwaggerErrorResponse "Access denied - cannot view source recipe"
// @Failure 404 {object} SwaggerErrorResponse "Recipe not found"
// @Failure 409 {object} SwaggerErrorResponse "Recipe already cloned"
// @Router /recipes/{recipeID}/save [post]
func (h *RecipeHandler) Clone(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "recipeID")
	sourceID, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid recipe ID")
		return
	}

	// Get source recipe
	source, err := h.repo.GetByID(r.Context(), sourceID)
	if err != nil {
		if err == postgres.ErrRecipeNotFound {
			response.NotFound(w, "Recipe not found")
			return
		}
		response.InternalError(w)
		return
	}

	// Check access:
	// - User can clone their own recipes (useful for creating variants)
	// - User can clone public/suggested or featured recipes
	if source.UserID != user.ID && !source.IsPublic && !source.IsFeatured {
		response.Forbidden(w, "Access denied - recipe not accessible")
		return
	}

	// Check if user already has a clone of this recipe
	// This prevents duplicate clones
	existingClone, _ := h.repo.GetBySourceRecipeID(r.Context(), user.ID, sourceID)
	if existingClone != nil {
		response.ErrorJSON(w, http.StatusConflict, "ALREADY_CLONED",
			"You already have a copy of this recipe", map[string]interface{}{
				"existingRecipeId": existingClone.ID,
			})
		return
	}

	// Create clone
	now := time.Now().UTC()
	clone := &model.Recipe{
		ID:             uuid.New(),
		UserID:         user.ID,
		Title:          source.Title,
		Description:    source.Description,
		Servings:       source.Servings,
		PrepTime:       source.PrepTime,
		CookTime:       source.CookTime,
		Difficulty:     source.Difficulty,
		Cuisine:        source.Cuisine,
		ThumbnailURL:   source.ThumbnailURL,
		SourceType:     "cloned",
		SourceURL:      source.SourceURL,
		SourceRecipeID: &sourceID,
		Tags:           source.Tags,
		IsFavorite:     false, // Don't copy favorite status
		SyncVersion:    1,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	// Clone ingredients with new IDs
	for i, ing := range source.Ingredients {
		clone.Ingredients = append(clone.Ingredients, model.RecipeIngredient{
			ID:             uuid.New(),
			RecipeID:       clone.ID,
			Name:           ing.Name,
			Quantity:       ing.Quantity,
			Unit:           ing.Unit,
			Category:       ing.Category,
			Section:        ing.Section,
			IsOptional:     ing.IsOptional,
			Notes:          ing.Notes,
			VideoTimestamp: ing.VideoTimestamp,
			SortOrder:      i,
			CreatedAt:      now,
		})
	}

	// Clone steps with new IDs
	for i, step := range source.Steps {
		clone.Steps = append(clone.Steps, model.RecipeStep{
			ID:                  uuid.New(),
			RecipeID:            clone.ID,
			StepNumber:          i + 1,
			Instruction:         step.Instruction,
			DurationSeconds:     step.DurationSeconds,
			Technique:           step.Technique,
			Temperature:         step.Temperature,
			VideoTimestampStart: step.VideoTimestampStart,
			VideoTimestampEnd:   step.VideoTimestampEnd,
			CreatedAt:           now,
		})
	}

	if err := h.repo.Create(r.Context(), clone); err != nil {
		response.InternalError(w)
		return
	}

	response.Created(w, clone)
}
