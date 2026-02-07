package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	clerkuser "github.com/clerk/clerk-sdk-go/v2/user"
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
	Create(ctx context.Context, user *model.User) error
	Update(ctx context.Context, user *model.User) error
	CreateSubscription(ctx context.Context, userID uuid.UUID) error
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

		// 1. Extract Token — must have "Bearer " prefix [P0 fix]
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			response.Unauthorized(w, "Missing or malformed authorization header")
			return
		}
		token := authHeader[7:] // len("Bearer ") == 7
		if token == "" {
			response.Unauthorized(w, "Missing token")
			return
		}

		// 2. Verify Token with Clerk
		claims, err := jwt.Verify(ctx, &jwt.VerifyParams{
			Token: token,
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
		ctx = context.WithValue(ctx, userContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// syncUser ensures the Clerk user exists in our local database.
// On first login, it creates the user and fetches their profile from Clerk.
func (m *ClerkMiddleware) syncUser(ctx context.Context, claims *clerk.SessionClaims) (*model.User, error) {
	clerkID := claims.Subject

	// Check DB for existing user
	user, err := m.userRepo.GetByClerkID(ctx, clerkID)
	if err == nil {
		// Only call Clerk API if email or name are missing (first-time backfill).
		// This avoids an HTTP roundtrip to Clerk on every single request.
		if user.Email == nil || user.Name == nil {
			m.populateFromClerk(ctx, user, clerkID)

			if user.Email != nil || user.Name != nil {
				if updateErr := m.userRepo.Update(ctx, user); updateErr != nil {
					m.logger.Error("Failed to backfill user profile from Clerk", "error", updateErr, "user_id", user.ID)
				} else {
					m.logger.Info("Backfilled user profile from Clerk", "user_id", user.ID, "email", user.Email)
				}
			}
		}

		return user, nil
	}

	// Not found — create new user
	newUser := &model.User{
		ID:                  uuid.New(),
		ClerkID:             &clerkID,
		CreatedAt:           time.Now().UTC(),
		UpdatedAt:           time.Now().UTC(),
		PreferredUnitSystem: "metric",
	}

	// Fetch profile from Clerk API to populate email/name [P2 fix]
	m.populateFromClerk(ctx, newUser, clerkID)

	if err := m.userRepo.Create(ctx, newUser); err != nil {
		// Race condition: another request created the user concurrently
		if existing, fetchErr := m.userRepo.GetByClerkID(ctx, clerkID); fetchErr == nil {
			return existing, nil
		}
		return nil, err
	}

	// Create default free subscription for the new user [P0 fix]
	if err := m.userRepo.CreateSubscription(ctx, newUser.ID); err != nil {
		m.logger.Error("Failed to create default subscription",
			"error", err,
			"user_id", newUser.ID,
		)
		// Non-fatal: user is created, subscription defaults to "free" in-memory
	}

	m.logger.Info("Created new user from Clerk",
		"user_id", newUser.ID,
		"clerk_id", clerkID,
		"email", newUser.Email,
	)

	return newUser, nil
}

// populateFromClerk fetches the user's profile from Clerk API
// and sets email/name on the user model. Failures are non-fatal.
func (m *ClerkMiddleware) populateFromClerk(ctx context.Context, user *model.User, clerkID string) {
	clerkUser, err := clerkuser.Get(ctx, clerkID)
	if err != nil {
		m.logger.Warn("Failed to fetch Clerk user profile",
			"error", err,
			"clerk_id", clerkID,
		)
		return
	}

	// Extract primary email
	if clerkUser.PrimaryEmailAddressID != nil {
		for _, ea := range clerkUser.EmailAddresses {
			if ea.ID == *clerkUser.PrimaryEmailAddressID {
				user.Email = &ea.EmailAddress
				break
			}
		}
	}

	// Build display name from first + last
	var parts []string
	if clerkUser.FirstName != nil && *clerkUser.FirstName != "" {
		parts = append(parts, *clerkUser.FirstName)
	}
	if clerkUser.LastName != nil && *clerkUser.LastName != "" {
		parts = append(parts, *clerkUser.LastName)
	}
	if len(parts) > 0 {
		name := strings.Join(parts, " ")
		user.Name = &name
	}
}

// userContextKey is the context key for the authenticated user.
// Uses the contextKey type declared in logging.go to avoid collisions. [P1 fix]
const userContextKey contextKey = "dlishe_user"

// UserContextKey is kept as a public alias for use in tests and other packages.
// Use GetUserFromContext() in production code instead.
const UserContextKey = userContextKey

// GetUserFromContext retrieves the authenticated user from the request context.
func GetUserFromContext(ctx context.Context) *model.User {
	if u, ok := ctx.Value(userContextKey).(*model.User); ok {
		return u
	}
	return nil
}
