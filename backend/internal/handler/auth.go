package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/repository/postgres"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	userRepo UserRepository
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(userRepo UserRepository) *AuthHandler {
	return &AuthHandler{
		userRepo: userRepo,
	}
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID                  string  `json:"id"`
	Email               *string `json:"email,omitempty"`
	Name                *string `json:"name,omitempty"`
	PreferredUnitSystem string  `json:"preferredUnitSystem"`
	PreferredLanguage   string  `json:"preferredLanguage"`
	IsAnonymous         bool    `json:"isAnonymous"`
	CreatedAt           string  `json:"createdAt"`
}

// Me handles GET /api/v1/users/me
// @Summary Get current user
// @Description Get current authenticated user's profile and subscription
// @Tags Auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} SwaggerMeResponse "User profile"
// @Failure 401 {object} SwaggerErrorResponse "Not authenticated"
// @Router /users/me [get]
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Not authenticated")
		return
	}

	// User is already loaded from DB by the auth middleware — no redundant query [P1 fix]

	// Get subscription
	subscription, err := h.userRepo.GetSubscription(r.Context(), user.ID)
	if err != nil {
		subscription = &model.UserSubscription{
			Entitlement: "free",
			IsActive:    true,
		}
	}

	resp := struct {
		User         UserResponse `json:"user"`
		Subscription struct {
			Entitlement string  `json:"entitlement"`
			ExpiresAt   *string `json:"expiresAt,omitempty"`
		} `json:"subscription"`
	}{
		User: UserResponse{
			ID:                  user.ID.String(),
			Email:               user.Email,
			Name:                user.Name,
			PreferredUnitSystem: user.PreferredUnitSystem,
			PreferredLanguage:   user.PreferredLanguage,
			IsAnonymous:         user.IsAnonymous,
			CreatedAt:           user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		},
	}
	resp.Subscription.Entitlement = subscription.Entitlement
	if subscription.ExpiresAt != nil {
		exp := subscription.ExpiresAt.Format("2006-01-02T15:04:05Z07:00")
		resp.Subscription.ExpiresAt = &exp
	}

	response.OK(w, resp)
}

// DeleteAccount handles DELETE /api/v1/users/me
// Wipes all user data from the backend. The mobile client is responsible for
// subsequently calling Clerk's user.delete() to remove the auth identity.
func (h *AuthHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Not authenticated")
		return
	}

	if err := h.userRepo.DeleteAccount(r.Context(), user.ID); err != nil {
		response.InternalError(w)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// UpdatePreferencesRequest represents the request to update user preferences
type UpdatePreferencesRequest struct {
	PreferredUnitSystem string `json:"preferredUnitSystem"`
	PreferredLanguage   string `json:"preferredLanguage"`
}

// UpdatePreferences handles PATCH /api/v1/users/me/preferences
func (h *AuthHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Not authenticated")
		return
	}

	var req UpdatePreferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.PreferredUnitSystem != "" && req.PreferredUnitSystem != "metric" && req.PreferredUnitSystem != "imperial" {
		response.ValidationFailed(w, "preferredUnitSystem", "must be 'metric' or 'imperial'")
		return
	}

	if req.PreferredLanguage != "" {
		validLangs := map[string]bool{"en": true, "fr": true, "ar": true}
		if !validLangs[req.PreferredLanguage] {
			response.BadRequest(w, "unsupported language code")
			return
		}
	}

	// Re-fetch from DB to get the latest state before updating [P1 fix]
	dbUser, err := h.userRepo.GetByID(r.Context(), user.ID)
	if err != nil {
		if errors.Is(err, postgres.ErrUserNotFound) { // [P3 fix]
			response.NotFound(w, "User")
			return
		}
		response.InternalError(w)
		return
	}

	if req.PreferredUnitSystem != "" {
		dbUser.PreferredUnitSystem = req.PreferredUnitSystem
	}
	if req.PreferredLanguage != "" {
		dbUser.PreferredLanguage = req.PreferredLanguage
	}

	if err := h.userRepo.Update(r.Context(), dbUser); err != nil {
		response.InternalError(w)
		return
	}

	resp := UserResponse{
		ID:                  dbUser.ID.String(),
		Email:               dbUser.Email,
		Name:                dbUser.Name,
		PreferredUnitSystem: dbUser.PreferredUnitSystem,
		PreferredLanguage:   dbUser.PreferredLanguage,
		IsAnonymous:         dbUser.IsAnonymous,
		CreatedAt:           dbUser.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	response.OK(w, resp)
}
