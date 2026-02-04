package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/google/uuid"
)

// ClerkMiddleware handles Clerk authentication and user synchronization
type ClerkMiddleware struct {
	userRepo UserRepository
	logger   *slog.Logger
}

// UserRepository interface defines required user operations
type UserRepository interface {
	GetByClerkID(ctx context.Context, clerkID string) (*model.User, error)
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	Create(ctx context.Context, user *model.User) error
}

// NewClerkMiddleware creates a new Clerk middleware
func NewClerkMiddleware(userRepo UserRepository, logger *slog.Logger) *ClerkMiddleware {
	return &ClerkMiddleware{
		userRepo: userRepo,
		logger:   logger,
	}
}

// RequireAuth middleware verifies the Clerk token and syncs the user to the local DB
func (m *ClerkMiddleware) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// 1. Extract Token
		authHeader := r.Header.Get("Authorization")
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == "" {
			response.Unauthorized(w, "Missing authorization header")
			return
		}

		// 2. Verify Token with Clerk
		claims, err := jwt.Verify(ctx, &jwt.VerifyParams{
			Token: token,
			// Uses default backend initialized with clerk.SetKey()
		})
		if err != nil {
			m.logger.Warn("Invalid Clerk token", "error", err)
			response.Unauthorized(w, "Invalid token")
			return
		}

		// 3. Sync User (Lazy Sync)
		user, err := m.syncUser(ctx, claims)
		if err != nil {
			m.logger.Error("Failed to sync user", "error", err, "clerk_id", claims.Subject)
			response.InternalError(w)
			return
		}

		// 4. Inject into Context
		ctx = context.WithValue(ctx, UserContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// syncUser ensures the Clerk user exists in our local database
func (m *ClerkMiddleware) syncUser(ctx context.Context, claims *clerk.SessionClaims) (*model.User, error) {
	clerkID := claims.Subject

	// Check cache/DB
	user, err := m.userRepo.GetByClerkID(ctx, clerkID)
	if err == nil {
		return user, nil
	}

	// Not found, create
	newUser := &model.User{
		ID:                  uuid.New(),
		ClerkID:             &clerkID,
		Email:               nil,
		CreatedAt:           time.Now().UTC(),
		UpdatedAt:           time.Now().UTC(),
		PreferredUnitSystem: "metric",
	}

	if err := m.userRepo.Create(ctx, newUser); err != nil {
		// Race condition check
		if existing, fetchErr := m.userRepo.GetByClerkID(ctx, clerkID); fetchErr == nil {
			return existing, nil
		}
		return nil, err
	}

	return newUser, nil
}

// UserContextKey identifies the user in context
const UserContextKey = "dishflow_user"

// GetUserFromContext helper
func GetUserFromContext(ctx context.Context) *model.User {
	if u, ok := ctx.Value(UserContextKey).(*model.User); ok {
		return u
	}
	return nil
}
