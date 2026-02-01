package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/dishflow/backend/internal/service/auth"
)

const testJWTSecret = "test-secret-key-for-auth-middleware-testing-32chars"

func newTestJWTService() *auth.JWTService {
	return auth.NewJWTService(testJWTSecret, 15*time.Minute, 7*24*time.Hour)
}

func newTestBlacklist(t *testing.T) (*auth.TokenBlacklist, func()) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("Failed to start miniredis: %v", err)
	}

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	blacklist := auth.NewTokenBlacklist(client)

	cleanup := func() {
		client.Close()
		mr.Close()
	}

	return blacklist, cleanup
}

func TestAuthMiddleware(t *testing.T) {
	jwtService := newTestJWTService()
	blacklist, cleanup := newTestBlacklist(t)
	defer cleanup()

	userID := uuid.New()
	tokens, _ := jwtService.GenerateTokenPair(userID, "test@example.com", false, "device")

	handler := Auth(jwtService, blacklist)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := GetClaims(r.Context())
		if claims == nil {
			t.Error("Claims should be available in context")
		}
		if claims.UserID != userID {
			t.Errorf("Expected userID %s, got %s", userID, claims.UserID)
		}
		w.WriteHeader(http.StatusOK)
	}))

	t.Run("valid token", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d. Body: %s", rr.Code, rr.Body.String())
		}
	})

	t.Run("missing authorization header", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/protected", nil)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("Expected 401, got %d", rr.Code)
		}
	})

	t.Run("invalid authorization format", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Basic abc123")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("Expected 401, got %d", rr.Code)
		}
	})

	t.Run("invalid token", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("Expected 401, got %d", rr.Code)
		}
	})

	t.Run("empty bearer token", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer ")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("Expected 401, got %d", rr.Code)
		}
	})

	t.Run("refresh token should fail", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+tokens.RefreshToken)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("Expected 401 for refresh token, got %d", rr.Code)
		}
	})
}

func TestAuthMiddlewareExpiredToken(t *testing.T) {
	// Create service with very short expiry
	jwtService := auth.NewJWTService(testJWTSecret, 1*time.Millisecond, 1*time.Millisecond)
	blacklist, cleanup := newTestBlacklist(t)
	defer cleanup()

	tokens, _ := jwtService.GenerateTokenPair(uuid.New(), "", false, "")

	// Wait for token to expire
	time.Sleep(10 * time.Millisecond)

	handler := Auth(jwtService, blacklist)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for expired token, got %d", rr.Code)
	}
}

func TestAuthMiddlewareRevokedToken(t *testing.T) {
	jwtService := newTestJWTService()
	blacklist, cleanup := newTestBlacklist(t)
	defer cleanup()

	userID := uuid.New()
	tokens, _ := jwtService.GenerateTokenPair(userID, "test@example.com", false, "device")

	// Get the token claims to find the token ID
	claims, _ := jwtService.ValidateAccessToken(tokens.AccessToken)

	// Revoke the token
	blacklist.RevokeToken(context.Background(), claims.ID, time.Now().Add(15*time.Minute))

	handler := Auth(jwtService, blacklist)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for revoked token, got %d", rr.Code)
	}
}

func TestAuthMiddlewareUserRevoked(t *testing.T) {
	jwtService := newTestJWTService()
	blacklist, cleanup := newTestBlacklist(t)
	defer cleanup()

	userID := uuid.New()
	tokens, _ := jwtService.GenerateTokenPair(userID, "test@example.com", false, "device")

	// Revoke all user tokens
	blacklist.RevokeAllUserTokens(context.Background(), userID.String(), 30*24*time.Hour)

	handler := Auth(jwtService, blacklist)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for user-revoked token, got %d", rr.Code)
	}
}

func TestAuthMiddlewareNilBlacklist(t *testing.T) {
	jwtService := newTestJWTService()

	userID := uuid.New()
	tokens, _ := jwtService.GenerateTokenPair(userID, "test@example.com", false, "device")

	// Pass nil blacklist - should still work (skip blacklist check)
	handler := Auth(jwtService, nil)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 with nil blacklist, got %d", rr.Code)
	}
}

func TestOptionalAuthMiddleware(t *testing.T) {
	jwtService := newTestJWTService()
	blacklist, cleanup := newTestBlacklist(t)
	defer cleanup()

	userID := uuid.New()
	tokens, _ := jwtService.GenerateTokenPair(userID, "test@example.com", false, "device")

	var claimsInHandler *auth.Claims
	handler := OptionalAuth(jwtService, blacklist)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claimsInHandler = GetClaims(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	t.Run("with valid token", func(t *testing.T) {
		claimsInHandler = nil
		req := httptest.NewRequest("GET", "/optional", nil)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}
		if claimsInHandler == nil {
			t.Error("Claims should be available with valid token")
		}
		if claimsInHandler.UserID != userID {
			t.Errorf("Expected userID %s, got %s", userID, claimsInHandler.UserID)
		}
	})

	t.Run("without token", func(t *testing.T) {
		claimsInHandler = nil
		req := httptest.NewRequest("GET", "/optional", nil)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}
		if claimsInHandler != nil {
			t.Error("Claims should be nil without token")
		}
	})

	t.Run("with invalid token", func(t *testing.T) {
		claimsInHandler = nil
		req := httptest.NewRequest("GET", "/optional", nil)
		req.Header.Set("Authorization", "Bearer invalid-token")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200 even with invalid token, got %d", rr.Code)
		}
		if claimsInHandler != nil {
			t.Error("Claims should be nil with invalid token")
		}
	})

	t.Run("with revoked token", func(t *testing.T) {
		claimsInHandler = nil
		claims, _ := jwtService.ValidateAccessToken(tokens.AccessToken)
		blacklist.RevokeToken(context.Background(), claims.ID, time.Now().Add(15*time.Minute))

		req := httptest.NewRequest("GET", "/optional", nil)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}
		if claimsInHandler != nil {
			t.Error("Claims should be nil with revoked token")
		}
	})
}

func TestGetClaims(t *testing.T) {
	t.Run("with claims in context", func(t *testing.T) {
		claims := &auth.Claims{
			UserID: uuid.New(),
			Email:  "test@example.com",
		}
		ctx := context.WithValue(context.Background(), ClaimsKey, claims)

		result := GetClaims(ctx)
		if result == nil {
			t.Fatal("Expected claims, got nil")
		}
		if result.UserID != claims.UserID {
			t.Errorf("UserID mismatch")
		}
	})

	t.Run("without claims in context", func(t *testing.T) {
		result := GetClaims(context.Background())
		if result != nil {
			t.Error("Expected nil claims")
		}
	})

	t.Run("with wrong type in context", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), ClaimsKey, "not-claims")
		result := GetClaims(ctx)
		if result != nil {
			t.Error("Expected nil for wrong type")
		}
	})
}

func TestAuthCaseInsensitiveBearer(t *testing.T) {
	jwtService := newTestJWTService()
	blacklist, cleanup := newTestBlacklist(t)
	defer cleanup()

	tokens, _ := jwtService.GenerateTokenPair(uuid.New(), "", false, "")

	handler := Auth(jwtService, blacklist)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	cases := []string{"Bearer", "bearer", "BEARER", "BeArEr"}
	for _, prefix := range cases {
		t.Run(prefix, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			req.Header.Set("Authorization", prefix+" "+tokens.AccessToken)
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			if rr.Code != http.StatusOK {
				t.Errorf("Expected 200 for '%s', got %d", prefix, rr.Code)
			}
		})
	}
}

func BenchmarkAuthMiddleware(b *testing.B) {
	jwtService := newTestJWTService()
	mr, _ := miniredis.Run()
	defer mr.Close()

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer client.Close()

	blacklist := auth.NewTokenBlacklist(client)
	tokens, _ := jwtService.GenerateTokenPair(uuid.New(), "", false, "")

	handler := Auth(jwtService, blacklist)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
	}
}
