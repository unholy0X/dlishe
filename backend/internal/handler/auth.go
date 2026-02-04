package handler

import (
	"encoding/json"
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

// AnonymousRequest represents the anonymous auth request
type AnonymousRequest struct {
	DeviceID string `json:"deviceId,omitempty"`
}

// AnonymousResponse represents the anonymous auth response
type AnonymousResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	ExpiresAt    string       `json:"expiresAt"`
	TokenType    string       `json:"tokenType"`
	IsNewUser    bool         `json:"isNewUser"`
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID                  string  `json:"id"`
	Email               *string `json:"email,omitempty"`
	Name                *string `json:"name,omitempty"`
	PreferredUnitSystem string  `json:"preferredUnitSystem"`
	IsAnonymous         bool    `json:"isAnonymous"`
	CreatedAt           string  `json:"createdAt"`
}

// Anonymous handles POST /api/v1/auth/anonymous
// @Summary Anonymous authentication
// @Description Create or retrieve an anonymous user account using device ID
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body SwaggerAnonymousRequest false "Device ID (optional)"
// @Success 200 {object} SwaggerAnonymousResponse "Authentication successful"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /auth/anonymous [post]
// Legacy methods (Anonymous, Register, Login, Refresh, Logout) removed in favor of Clerk

// Me handles GET /api/v1/users/me
// @Summary Get current user
// @Description Get current authenticated user's profile and subscription
// @Tags Auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} SwaggerMeResponse "User profile"
// @Failure 401 {object} SwaggerErrorResponse "Not authenticated"
// @Failure 404 {object} SwaggerErrorResponse "User not found"
// @Router /users/me [get]
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	iUser := middleware.GetUserFromContext(r.Context())
	if iUser == nil {
		response.Unauthorized(w, "Not authenticated")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), iUser.ID)
	if err != nil {
		if err == postgres.ErrUserNotFound {
			response.NotFound(w, "User")
			return
		}
		response.InternalError(w)
		return
	}

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

// UpdatePreferencesRequest represents the request to update user preferences
type UpdatePreferencesRequest struct {
	PreferredUnitSystem string `json:"preferredUnitSystem"`
}

// UpdatePreferences handles PATCH /api/v1/users/me/preferences
func (h *AuthHandler) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	iUser := middleware.GetUserFromContext(r.Context())
	if iUser == nil {
		response.Unauthorized(w, "Not authenticated")
		return
	}

	var req UpdatePreferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.PreferredUnitSystem != "metric" && req.PreferredUnitSystem != "imperial" {
		response.ValidationFailed(w, "preferredUnitSystem", "must be 'metric' or 'imperial'")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), iUser.ID)
	if err != nil {
		if err == postgres.ErrUserNotFound {
			response.NotFound(w, "User")
			return
		}
		response.InternalError(w)
		return
	}

	// Update user
	user.PreferredUnitSystem = req.PreferredUnitSystem
	if err := h.userRepo.Update(r.Context(), user); err != nil {
		response.InternalError(w)
		return
	}

	// Return updated user
	resp := UserResponse{
		ID:                  user.ID.String(),
		Email:               user.Email,
		Name:                user.Name,
		PreferredUnitSystem: user.PreferredUnitSystem,
		IsAnonymous:         user.IsAnonymous,
		CreatedAt:           user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	response.OK(w, resp)
}
