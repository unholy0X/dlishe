package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/service/auth"
)

// contextKey is a type for context keys
type contextKey string

const (
	// ClaimsKey is the context key for JWT claims
	ClaimsKey contextKey = "claims"
)

// Auth is a middleware that validates JWT tokens and checks the blacklist
func Auth(jwtService *auth.JWTService, blacklist *auth.TokenBlacklist) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.Unauthorized(w, "Missing authorization header")
				return
			}

			// Check Bearer prefix
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				response.Unauthorized(w, "Invalid authorization header format")
				return
			}

			tokenString := parts[1]
			if tokenString == "" {
				response.Unauthorized(w, "Missing token")
				return
			}

			// Validate token
			claims, err := jwtService.ValidateAccessToken(tokenString)
			if err != nil {
				if err == auth.ErrExpiredToken {
					response.TokenExpired(w)
					return
				}
				response.InvalidToken(w)
				return
			}

			// Check if token is blacklisted (revoked on logout)
			if blacklist != nil {
				revoked, err := blacklist.IsRevoked(r.Context(), claims.ID)
				if err != nil {
					// Log Redis error but fail open for availability
					slog.Warn("failed to check token blacklist",
						"error", err,
						"tokenID", claims.ID,
					)
				} else if revoked {
					response.InvalidToken(w)
					return
				}

				// Also check if all user tokens were revoked
				if claims.IssuedAt != nil {
					userRevoked, err := blacklist.IsUserRevokedSince(
						r.Context(),
						claims.UserID.String(),
						claims.IssuedAt.Time,
					)
					if err != nil {
						slog.Warn("failed to check user token revocation",
							"error", err,
							"userID", claims.UserID,
						)
					} else if userRevoked {
						response.InvalidToken(w)
						return
					}
				}
			}

			// Add claims to context
			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuth is a middleware that validates JWT tokens if present, but doesn't require them
func OptionalAuth(jwtService *auth.JWTService, blacklist *auth.TokenBlacklist) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Get Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				// No token provided, continue without claims
				next.ServeHTTP(w, r)
				return
			}

			// Check Bearer prefix
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				// Invalid format, continue without claims
				next.ServeHTTP(w, r)
				return
			}

			tokenString := parts[1]
			if tokenString == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Validate token
			claims, err := jwtService.ValidateAccessToken(tokenString)
			if err != nil {
				// Invalid token, continue without claims
				next.ServeHTTP(w, r)
				return
			}

			// Check if token is blacklisted
			if blacklist != nil {
				revoked, _ := blacklist.IsRevoked(r.Context(), claims.ID)
				if revoked {
					// Revoked token, continue without claims
					next.ServeHTTP(w, r)
					return
				}

				// Check if all user tokens were revoked
				if claims.IssuedAt != nil {
					userRevoked, _ := blacklist.IsUserRevokedSince(
						r.Context(),
						claims.UserID.String(),
						claims.IssuedAt.Time,
					)
					if userRevoked {
						next.ServeHTTP(w, r)
						return
					}
				}
			}

			// Add claims to context
			ctx := context.WithValue(r.Context(), ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaims retrieves the JWT claims from context
func GetClaims(ctx context.Context) *auth.Claims {
	claims, ok := ctx.Value(ClaimsKey).(*auth.Claims)
	if !ok {
		return nil
	}
	return claims
}
