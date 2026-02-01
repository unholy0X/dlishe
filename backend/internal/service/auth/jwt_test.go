package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

const testSecret = "test-secret-key-for-unit-testing-min-32-characters-long"

func TestNewJWTService(t *testing.T) {
	svc := NewJWTService(testSecret, 15*time.Minute, 7*24*time.Hour)
	if svc == nil {
		t.Fatal("Expected non-nil service")
	}
}

func TestGenerateTokenPair(t *testing.T) {
	svc := NewJWTService(testSecret, 15*time.Minute, 7*24*time.Hour)
	userID := uuid.New()

	tests := []struct {
		name        string
		userID      uuid.UUID
		email       string
		isAnonymous bool
		deviceID    string
	}{
		{
			name:        "regular user",
			userID:      userID,
			email:       "test@example.com",
			isAnonymous: false,
			deviceID:    "",
		},
		{
			name:        "anonymous user",
			userID:      userID,
			email:       "",
			isAnonymous: true,
			deviceID:    "device-123",
		},
		{
			name:        "user with device",
			userID:      userID,
			email:       "user@test.com",
			isAnonymous: false,
			deviceID:    "mobile-device",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tokens, err := svc.GenerateTokenPair(tt.userID, tt.email, tt.isAnonymous, tt.deviceID)
			if err != nil {
				t.Fatalf("GenerateTokenPair failed: %v", err)
			}

			if tokens.AccessToken == "" {
				t.Error("Access token should not be empty")
			}
			if tokens.RefreshToken == "" {
				t.Error("Refresh token should not be empty")
			}
			if tokens.TokenType != "Bearer" {
				t.Errorf("Expected token type 'Bearer', got %s", tokens.TokenType)
			}
			if tokens.ExpiresAt.Before(time.Now()) {
				t.Error("ExpiresAt should be in the future")
			}

			// Tokens should be different
			if tokens.AccessToken == tokens.RefreshToken {
				t.Error("Access and refresh tokens should be different")
			}
		})
	}
}

func TestValidateAccessToken(t *testing.T) {
	svc := NewJWTService(testSecret, 15*time.Minute, 7*24*time.Hour)
	userID := uuid.New()
	email := "test@example.com"

	tokens, err := svc.GenerateTokenPair(userID, email, false, "device-1")
	if err != nil {
		t.Fatalf("Failed to generate tokens: %v", err)
	}

	t.Run("valid access token", func(t *testing.T) {
		claims, err := svc.ValidateAccessToken(tokens.AccessToken)
		if err != nil {
			t.Fatalf("ValidateAccessToken failed: %v", err)
		}

		if claims.UserID != userID {
			t.Errorf("Expected userID %s, got %s", userID, claims.UserID)
		}
		if claims.Email != email {
			t.Errorf("Expected email %s, got %s", email, claims.Email)
		}
		if claims.TokenType != "access" {
			t.Errorf("Expected token type 'access', got %s", claims.TokenType)
		}
		if claims.DeviceID != "device-1" {
			t.Errorf("Expected device 'device-1', got %s", claims.DeviceID)
		}
	})

	t.Run("invalid token string", func(t *testing.T) {
		_, err := svc.ValidateAccessToken("invalid-token")
		if err == nil {
			t.Error("Expected error for invalid token")
		}
		if err != ErrInvalidToken {
			t.Errorf("Expected ErrInvalidToken, got %v", err)
		}
	})

	t.Run("refresh token should fail access validation", func(t *testing.T) {
		_, err := svc.ValidateAccessToken(tokens.RefreshToken)
		if err == nil {
			t.Error("Expected error when using refresh token as access token")
		}
	})

	t.Run("empty token", func(t *testing.T) {
		_, err := svc.ValidateAccessToken("")
		if err == nil {
			t.Error("Expected error for empty token")
		}
	})

	t.Run("malformed token", func(t *testing.T) {
		_, err := svc.ValidateAccessToken("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature")
		if err == nil {
			t.Error("Expected error for malformed token")
		}
	})
}

func TestValidateRefreshToken(t *testing.T) {
	svc := NewJWTService(testSecret, 15*time.Minute, 7*24*time.Hour)
	userID := uuid.New()

	tokens, err := svc.GenerateTokenPair(userID, "test@example.com", false, "")
	if err != nil {
		t.Fatalf("Failed to generate tokens: %v", err)
	}

	t.Run("valid refresh token", func(t *testing.T) {
		claims, err := svc.ValidateRefreshToken(tokens.RefreshToken)
		if err != nil {
			t.Fatalf("ValidateRefreshToken failed: %v", err)
		}

		if claims.UserID != userID {
			t.Errorf("Expected userID %s, got %s", userID, claims.UserID)
		}
		if claims.TokenType != "refresh" {
			t.Errorf("Expected token type 'refresh', got %s", claims.TokenType)
		}
	})

	t.Run("access token should fail refresh validation", func(t *testing.T) {
		_, err := svc.ValidateRefreshToken(tokens.AccessToken)
		if err == nil {
			t.Error("Expected error when using access token as refresh token")
		}
	})
}

func TestTokenExpiration(t *testing.T) {
	// Create service with very short expiry for testing
	svc := NewJWTService(testSecret, 1*time.Millisecond, 1*time.Millisecond)
	userID := uuid.New()

	tokens, err := svc.GenerateTokenPair(userID, "", false, "")
	if err != nil {
		t.Fatalf("Failed to generate tokens: %v", err)
	}

	// Wait for tokens to expire
	time.Sleep(10 * time.Millisecond)

	t.Run("expired access token", func(t *testing.T) {
		_, err := svc.ValidateAccessToken(tokens.AccessToken)
		if err == nil {
			t.Error("Expected error for expired token")
		}
		if err != ErrExpiredToken {
			t.Errorf("Expected ErrExpiredToken, got %v", err)
		}
	})

	t.Run("expired refresh token", func(t *testing.T) {
		_, err := svc.ValidateRefreshToken(tokens.RefreshToken)
		if err == nil {
			t.Error("Expected error for expired token")
		}
		if err != ErrExpiredToken {
			t.Errorf("Expected ErrExpiredToken, got %v", err)
		}
	})
}

func TestWrongSecret(t *testing.T) {
	svc1 := NewJWTService("secret-one-is-very-long-at-least-32-chars", 15*time.Minute, 7*24*time.Hour)
	svc2 := NewJWTService("secret-two-is-very-long-at-least-32-chars", 15*time.Minute, 7*24*time.Hour)

	tokens, _ := svc1.GenerateTokenPair(uuid.New(), "", false, "")

	t.Run("token from different secret should fail", func(t *testing.T) {
		_, err := svc2.ValidateAccessToken(tokens.AccessToken)
		if err == nil {
			t.Error("Expected error when validating with wrong secret")
		}
	})
}

func TestGenerateAccessToken(t *testing.T) {
	svc := NewJWTService(testSecret, 15*time.Minute, 7*24*time.Hour)
	userID := uuid.New()

	token, expiry, err := svc.GenerateAccessToken(userID, "test@example.com", false, "device")
	if err != nil {
		t.Fatalf("GenerateAccessToken failed: %v", err)
	}

	if token == "" {
		t.Error("Token should not be empty")
	}
	if expiry.Before(time.Now()) {
		t.Error("Expiry should be in the future")
	}

	// Validate the generated token
	claims, err := svc.ValidateAccessToken(token)
	if err != nil {
		t.Fatalf("Failed to validate generated token: %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("Expected userID %s, got %s", userID, claims.UserID)
	}
}

func TestGenerateDeviceID(t *testing.T) {
	id1 := GenerateDeviceID()
	id2 := GenerateDeviceID()

	if id1 == "" {
		t.Error("Device ID should not be empty")
	}
	if id1 == id2 {
		t.Error("Device IDs should be unique")
	}
	if len(id1) < 16 {
		t.Errorf("Device ID should be at least 16 chars, got %d", len(id1))
	}
}

func TestClaimsFields(t *testing.T) {
	svc := NewJWTService(testSecret, 15*time.Minute, 7*24*time.Hour)
	userID := uuid.New()
	email := "claims@test.com"
	deviceID := "test-device-123"

	tokens, _ := svc.GenerateTokenPair(userID, email, true, deviceID)
	claims, _ := svc.ValidateAccessToken(tokens.AccessToken)

	if claims.UserID != userID {
		t.Errorf("UserID mismatch")
	}
	if claims.Email != email {
		t.Errorf("Email mismatch")
	}
	if !claims.IsAnonymous {
		t.Errorf("IsAnonymous should be true")
	}
	if claims.DeviceID != deviceID {
		t.Errorf("DeviceID mismatch")
	}
	if claims.ID == "" {
		t.Errorf("Token ID (jti) should not be empty")
	}
	if claims.Issuer != "dishflow" {
		t.Errorf("Issuer should be 'dishflow', got %s", claims.Issuer)
	}
}

func BenchmarkGenerateTokenPair(b *testing.B) {
	svc := NewJWTService(testSecret, 15*time.Minute, 7*24*time.Hour)
	userID := uuid.New()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		svc.GenerateTokenPair(userID, "test@example.com", false, "device")
	}
}

func BenchmarkValidateAccessToken(b *testing.B) {
	svc := NewJWTService(testSecret, 15*time.Minute, 7*24*time.Hour)
	tokens, _ := svc.GenerateTokenPair(uuid.New(), "", false, "")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		svc.ValidateAccessToken(tokens.AccessToken)
	}
}
