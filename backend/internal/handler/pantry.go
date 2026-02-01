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
)

// PantryHandler handles pantry-related HTTP requests
type PantryHandler struct {
	repo PantryRepository
}

// NewPantryHandler creates a new pantry handler
func NewPantryHandler(repo PantryRepository) *PantryHandler {
	return &PantryHandler{repo: repo}
}

// List handles GET /api/v1/pantry
func (h *PantryHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Optional category filter
	category := r.URL.Query().Get("category")
	var categoryPtr *string
	if category != "" {
		categoryPtr = &category
	}

	items, err := h.repo.List(ctx, claims.UserID, categoryPtr)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, map[string]interface{}{
		"items": items,
		"count": len(items),
	})
}

// Get handles GET /api/v1/pantry/{id}
func (h *PantryHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid item ID")
		return
	}

	item, err := h.repo.Get(ctx, id, claims.UserID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Pantry item")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, item)
}

// Create handles POST /api/v1/pantry
func (h *PantryHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var input model.PantryItemInput
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

	item, err := h.repo.Create(ctx, claims.UserID, &input)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.Created(w, item)
}

// Update handles PUT /api/v1/pantry/{id}
func (h *PantryHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid item ID")
		return
	}

	var input model.PantryItemInput
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

	item, err := h.repo.Update(ctx, id, claims.UserID, &input)
	if err == model.ErrNotFound {
		response.NotFound(w, "Pantry item")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, item)
}

// Delete handles DELETE /api/v1/pantry/{id}
func (h *PantryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid item ID")
		return
	}

	err = h.repo.Delete(ctx, id, claims.UserID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Pantry item")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// GetExpiring handles GET /api/v1/pantry/expiring
func (h *PantryHandler) GetExpiring(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Default to 7 days
	days := 7
	if daysStr := r.URL.Query().Get("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 && d <= 365 {
			days = d
		}
	}

	items, err := h.repo.GetExpiring(ctx, claims.UserID, days)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, map[string]interface{}{
		"items": items,
		"count": len(items),
		"days":  days,
	})
}
