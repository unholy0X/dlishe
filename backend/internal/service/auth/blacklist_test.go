package auth

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

// setupTestRedis creates a miniredis instance for testing
func setupTestRedis(t *testing.T) (*redis.Client, func()) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("Failed to start miniredis: %v", err)
	}

	client := redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})

	cleanup := func() {
		client.Close()
		mr.Close()
	}

	return client, cleanup
}

func TestNewTokenBlacklist(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	bl := NewTokenBlacklist(client)
	if bl == nil {
		t.Fatal("Expected non-nil blacklist")
	}
}

func TestRevokeToken(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	bl := NewTokenBlacklist(client)
	ctx := context.Background()

	tests := []struct {
		name      string
		tokenID   string
		expiresAt time.Time
		wantErr   bool
	}{
		{
			name:      "valid token revocation",
			tokenID:   "token-123",
			expiresAt: time.Now().Add(15 * time.Minute),
			wantErr:   false,
		},
		{
			name:      "empty token ID",
			tokenID:   "",
			expiresAt: time.Now().Add(15 * time.Minute),
			wantErr:   false, // Should silently succeed
		},
		{
			name:      "already expired token",
			tokenID:   "expired-token",
			expiresAt: time.Now().Add(-1 * time.Minute),
			wantErr:   false, // Should not error, just skip
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := bl.RevokeToken(ctx, tt.tokenID, tt.expiresAt)
			if (err != nil) != tt.wantErr {
				t.Errorf("RevokeToken() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestIsRevoked(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	bl := NewTokenBlacklist(client)
	ctx := context.Background()

	t.Run("non-revoked token", func(t *testing.T) {
		revoked, err := bl.IsRevoked(ctx, "not-revoked-token")
		if err != nil {
			t.Fatalf("IsRevoked failed: %v", err)
		}
		if revoked {
			t.Error("Expected token to not be revoked")
		}
	})

	t.Run("revoked token", func(t *testing.T) {
		tokenID := "revoked-token-456"
		err := bl.RevokeToken(ctx, tokenID, time.Now().Add(15*time.Minute))
		if err != nil {
			t.Fatalf("RevokeToken failed: %v", err)
		}

		revoked, err := bl.IsRevoked(ctx, tokenID)
		if err != nil {
			t.Fatalf("IsRevoked failed: %v", err)
		}
		if !revoked {
			t.Error("Expected token to be revoked")
		}
	})

	t.Run("empty token ID", func(t *testing.T) {
		revoked, err := bl.IsRevoked(ctx, "")
		if err != nil {
			t.Fatalf("IsRevoked failed: %v", err)
		}
		if revoked {
			t.Error("Empty token ID should not be revoked")
		}
	})
}

func TestRevokeAllUserTokens(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	bl := NewTokenBlacklist(client)
	ctx := context.Background()

	t.Run("revoke all user tokens", func(t *testing.T) {
		userID := "user-123"
		err := bl.RevokeAllUserTokens(ctx, userID, 30*24*time.Hour)
		if err != nil {
			t.Fatalf("RevokeAllUserTokens failed: %v", err)
		}

		// Check that revocation is recorded
		revoked, err := bl.IsUserRevokedSince(ctx, userID, time.Now().Add(-1*time.Second))
		if err != nil {
			t.Fatalf("IsUserRevokedSince failed: %v", err)
		}
		if !revoked {
			t.Error("Token issued before revoke-all should be revoked")
		}
	})

	t.Run("empty user ID", func(t *testing.T) {
		err := bl.RevokeAllUserTokens(ctx, "", 30*24*time.Hour)
		if err != nil {
			t.Fatalf("Expected no error for empty user ID: %v", err)
		}
	})
}

func TestIsUserRevokedSince(t *testing.T) {
	client, cleanup := setupTestRedis(t)
	defer cleanup()

	bl := NewTokenBlacklist(client)
	ctx := context.Background()

	t.Run("no revocation exists", func(t *testing.T) {
		revoked, err := bl.IsUserRevokedSince(ctx, "no-revoke-user", time.Now())
		if err != nil {
			t.Fatalf("IsUserRevokedSince failed: %v", err)
		}
		if revoked {
			t.Error("Expected not revoked when no revocation exists")
		}
	})

	t.Run("token issued before revocation", func(t *testing.T) {
		userID := "revoke-test-user"

		// Issue a token at time T
		tokenIssuedAt := time.Now().Add(-5 * time.Second)

		// Revoke all at time T+2
		time.Sleep(10 * time.Millisecond) // Ensure time passes
		err := bl.RevokeAllUserTokens(ctx, userID, 30*24*time.Hour)
		if err != nil {
			t.Fatalf("RevokeAllUserTokens failed: %v", err)
		}

		// Check if token issued before revocation is revoked
		revoked, err := bl.IsUserRevokedSince(ctx, userID, tokenIssuedAt)
		if err != nil {
			t.Fatalf("IsUserRevokedSince failed: %v", err)
		}
		if !revoked {
			t.Error("Token issued before revoke-all should be revoked")
		}
	})

	t.Run("token issued after revocation", func(t *testing.T) {
		userID := "revoke-test-user-2"

		// Revoke all at time T
		err := bl.RevokeAllUserTokens(ctx, userID, 30*24*time.Hour)
		if err != nil {
			t.Fatalf("RevokeAllUserTokens failed: %v", err)
		}

		// Wait at least 1 second since Unix timestamps have second precision
		time.Sleep(1100 * time.Millisecond)
		tokenIssuedAt := time.Now()

		revoked, err := bl.IsUserRevokedSince(ctx, userID, tokenIssuedAt)
		if err != nil {
			t.Fatalf("IsUserRevokedSince failed: %v", err)
		}
		if revoked {
			t.Error("Token issued after revoke-all should NOT be revoked")
		}
	})

	t.Run("empty user ID", func(t *testing.T) {
		revoked, err := bl.IsUserRevokedSince(ctx, "", time.Now())
		if err != nil {
			t.Fatalf("Expected no error for empty user ID: %v", err)
		}
		if revoked {
			t.Error("Empty user ID should not be revoked")
		}
	})
}

func TestTokenTTL(t *testing.T) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("Failed to start miniredis: %v", err)
	}
	defer mr.Close()

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer client.Close()

	bl := NewTokenBlacklist(client)
	ctx := context.Background()

	tokenID := "ttl-test-token"
	ttl := 5 * time.Second

	err = bl.RevokeToken(ctx, tokenID, time.Now().Add(ttl))
	if err != nil {
		t.Fatalf("RevokeToken failed: %v", err)
	}

	// Check token is revoked
	revoked, _ := bl.IsRevoked(ctx, tokenID)
	if !revoked {
		t.Error("Token should be revoked")
	}

	// Fast-forward time in miniredis
	mr.FastForward(ttl + time.Second)

	// Check token is no longer revoked (TTL expired)
	revoked, _ = bl.IsRevoked(ctx, tokenID)
	if revoked {
		t.Error("Token should no longer be revoked after TTL")
	}
}

func BenchmarkRevokeToken(b *testing.B) {
	client, cleanup := setupTestRedis(&testing.T{})
	defer cleanup()

	bl := NewTokenBlacklist(client)
	ctx := context.Background()
	expiry := time.Now().Add(15 * time.Minute)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		bl.RevokeToken(ctx, "token-"+string(rune(i)), expiry)
	}
}

func BenchmarkIsRevoked(b *testing.B) {
	client, cleanup := setupTestRedis(&testing.T{})
	defer cleanup()

	bl := NewTokenBlacklist(client)
	ctx := context.Background()

	// Pre-revoke a token
	bl.RevokeToken(ctx, "bench-token", time.Now().Add(15*time.Minute))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		bl.IsRevoked(ctx, "bench-token")
	}
}
