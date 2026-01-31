package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/service/auth"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	jwtService *auth.JWTService
	userRepo   *postgres.UserRepository
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(jwtService *auth.JWTService, userRepo *postgres.UserRepository) *AuthHandler {
	return &AuthHandler{
		jwtService: jwtService,
		userRepo:   userRepo,
	}
}

// AnonymousRequest represents the anonymous auth request
type AnonymousRequest struct {
	DeviceID string `json:"deviceId,omitempty"`
}

// AnonymousResponse represents the anonymous auth response
type AnonymousResponse struct {
	User        UserResponse `json:"user"`
	AccessToken string       `json:"accessToken"`
	RefreshToken string      `json:"refreshToken"`
	ExpiresAt   string       `json:"expiresAt"`
	TokenType   string       `json:"tokenType"`
	IsNewUser   bool         `json:"isNewUser"`
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID          string  `json:"id"`
	Email       *string `json:"email,omitempty"`
	Name        *string `json:"name,omitempty"`
	IsAnonymous bool    `json:"isAnonymous"`
	CreatedAt   string  `json:"createdAt"`
}

// Anonymous handles POST /api/v1/auth/anonymous
func (h *AuthHandler) Anonymous(w http.ResponseWriter, r *http.Request) {
	var req AnonymousRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Empty body is OK for anonymous auth
		req = AnonymousRequest{}
	}

	// Generate device ID if not provided
	deviceID := req.DeviceID
	if deviceID == "" {
		deviceID = auth.GenerateDeviceID()
	}

	// Get or create anonymous user
	user, isNew, err := h.userRepo.GetOrCreateAnonymous(r.Context(), deviceID)
	if err != nil {
		response.InternalError(w)
		return
	}

	// Create subscription record for new users
	if isNew {
		if err := h.userRepo.CreateSubscription(r.Context(), user.ID); err != nil {
			// Log but don't fail - subscription can be created later
		}
	}

	// Generate token pair
	tokens, err := h.jwtService.GenerateTokenPair(user.ID, "", true, deviceID)
	if err != nil {
		response.InternalError(w)
		return
	}

	resp := AnonymousResponse{
		User: UserResponse{
			ID:          user.ID.String(),
			Email:       user.Email,
			Name:        user.Name,
			IsAnonymous: user.IsAnonymous,
			CreatedAt:   user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		},
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		TokenType:    tokens.TokenType,
		IsNewUser:    isNew,
	}

	response.OK(w, resp)
}

// RegisterRequest represents the registration request
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name,omitempty"`
}

// Register handles POST /api/v1/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate email
	if req.Email == "" || !strings.Contains(req.Email, "@") {
		response.ValidationFailed(w, "email", "valid email is required")
		return
	}

	// Validate password
	if len(req.Password) < 8 {
		response.ValidationFailed(w, "password", "password must be at least 8 characters")
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		response.InternalError(w)
		return
	}

	// Create user
	user := &model.User{
		ID:           uuid.New(),
		Email:        &req.Email,
		PasswordHash: stringPtr(string(hashedPassword)),
		Name:         stringPtr(req.Name),
		IsAnonymous:  false,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	if err := h.userRepo.Create(r.Context(), user); err != nil {
		if err == postgres.ErrUserAlreadyExists {
			response.Conflict(w, "A user with this email already exists")
			return
		}
		response.InternalError(w)
		return
	}

	// Create subscription
	h.userRepo.CreateSubscription(r.Context(), user.ID)

	// Generate tokens
	tokens, err := h.jwtService.GenerateTokenPair(user.ID, req.Email, false, "")
	if err != nil {
		response.InternalError(w)
		return
	}

	resp := AuthResponse{
		User: UserResponse{
			ID:          user.ID.String(),
			Email:       user.Email,
			Name:        user.Name,
			IsAnonymous: false,
			CreatedAt:   user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		},
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		TokenType:    tokens.TokenType,
	}

	response.Created(w, resp)
}

// LoginRequest represents the login request
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse represents the auth response for login/register
type AuthResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	ExpiresAt    string       `json:"expiresAt"`
	TokenType    string       `json:"tokenType"`
}

// Login handles POST /api/v1/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" {
		response.ValidationFailed(w, "email/password", "email and password are required")
		return
	}

	// Get user by email
	user, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err != nil {
		if err == postgres.ErrUserNotFound {
			response.Unauthorized(w, "Invalid email or password")
			return
		}
		response.InternalError(w)
		return
	}

	// Check password
	if user.PasswordHash == nil {
		response.Unauthorized(w, "Invalid email or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.Password)); err != nil {
		response.Unauthorized(w, "Invalid email or password")
		return
	}

	// Generate tokens
	email := ""
	if user.Email != nil {
		email = *user.Email
	}

	tokens, err := h.jwtService.GenerateTokenPair(user.ID, email, user.IsAnonymous, "")
	if err != nil {
		response.InternalError(w)
		return
	}

	resp := AuthResponse{
		User: UserResponse{
			ID:          user.ID.String(),
			Email:       user.Email,
			Name:        user.Name,
			IsAnonymous: user.IsAnonymous,
			CreatedAt:   user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		},
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		TokenType:    tokens.TokenType,
	}

	response.OK(w, resp)
}

// RefreshRequest represents the token refresh request
type RefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

// RefreshResponse represents the token refresh response
type RefreshResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresAt    string `json:"expiresAt"`
	TokenType    string `json:"tokenType"`
}

// Refresh handles POST /api/v1/auth/refresh
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.RefreshToken == "" {
		response.ValidationFailed(w, "refreshToken", "refresh token is required")
		return
	}

	// Validate refresh token
	claims, err := h.jwtService.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		if err == auth.ErrExpiredToken {
			response.TokenExpired(w)
			return
		}
		response.InvalidToken(w)
		return
	}

	// Verify user still exists
	user, err := h.userRepo.GetByID(r.Context(), claims.UserID)
	if err != nil {
		response.InvalidToken(w)
		return
	}

	// Generate new token pair
	email := ""
	if user.Email != nil {
		email = *user.Email
	}

	tokens, err := h.jwtService.GenerateTokenPair(user.ID, email, user.IsAnonymous, claims.DeviceID)
	if err != nil {
		response.InternalError(w)
		return
	}

	resp := RefreshResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		TokenType:    tokens.TokenType,
	}

	response.OK(w, resp)
}

// Logout handles POST /api/v1/auth/logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Get user from context (set by auth middleware)
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		response.Unauthorized(w, "Not authenticated")
		return
	}

	// In a full implementation, we would:
	// 1. Revoke the refresh token in the database
	// 2. Add the access token to a blacklist (Redis) until it expires
	// For MVP, we just return success - client removes tokens locally

	response.NoContent(w)
}

// Me handles GET /api/v1/users/me
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		response.Unauthorized(w, "Not authenticated")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), claims.UserID)
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
			ID:          user.ID.String(),
			Email:       user.Email,
			Name:        user.Name,
			IsAnonymous: user.IsAnonymous,
			CreatedAt:   user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		},
	}
	resp.Subscription.Entitlement = subscription.Entitlement
	if subscription.ExpiresAt != nil {
		exp := subscription.ExpiresAt.Format("2006-01-02T15:04:05Z07:00")
		resp.Subscription.ExpiresAt = &exp
	}

	response.OK(w, resp)
}

func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
