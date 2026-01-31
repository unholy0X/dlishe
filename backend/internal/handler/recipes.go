package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/repository/postgres"
)

type RecipeHandler struct {
	repo *postgres.RecipeRepository
}

func NewRecipeHandler(repo *postgres.RecipeRepository) *RecipeHandler {
	return &RecipeHandler{repo: repo}
}

// Create handles recipe creation
func (h *RecipeHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req model.Recipe
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields (basic validation)
	if req.Title == "" {
		response.BadRequest(w, "Title is required")
		return
	}

	// Set user ID from claims
	req.UserID = claims.UserID

	// Ensure ID is generated if not provided
	if req.ID == uuid.Nil {
		req.ID = uuid.New()
	}

	if err := h.repo.Create(r.Context(), &req); err != nil {
		response.InternalError(w)
		return
	}

	response.Created(w, req)
}

// List handles listing recipes for the current user
func (h *RecipeHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
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

	recipes, total, err := h.repo.ListByUser(r.Context(), claims.UserID, limit, offset)
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

// Get handles retrieving a single recipe
func (h *RecipeHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
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

	// Check ownership
	if recipe.UserID != claims.UserID {
		response.Forbidden(w, "Access denied")
		return
	}

	response.OK(w, recipe)
}

// Update handles updating a recipe
func (h *RecipeHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
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

	if existing.UserID != claims.UserID {
		response.Forbidden(w, "Access denied")
		return
	}

	var req model.Recipe
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Ensure IDs match
	req.ID = id
	req.UserID = claims.UserID

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

// Delete handles deleting a recipe
func (h *RecipeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
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

	if existing.UserID != claims.UserID {
		response.Forbidden(w, "Access denied")
		return
	}

	if err := h.repo.SoftDelete(r.Context(), id); err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// ToggleFavorite handles toggling the favorite status
func (h *RecipeHandler) ToggleFavorite(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
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

	if existing.UserID != claims.UserID {
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
