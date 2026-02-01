package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/service/auth"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func TestAuthHandler_Anonymous(t *testing.T) {
	mockUserRepo := &mockUserRepository{}
	mockJWT := &mockJWTService{}
	mockBlacklist := &mockTokenBlacklist{}
	handler := NewAuthHandler(mockJWT, mockUserRepo, mockBlacklist)

	t.Run("creates new anonymous user successfully", func(t *testing.T) {
		deviceID := "device-123"
		userID := uuid.New()

		mockUserRepo.GetOrCreateAnonymousFunc = func(ctx context.Context, dID string) (*model.User, bool, error) {
			if dID != deviceID {
				t.Errorf("expected deviceID %s, got %s", deviceID, dID)
			}
			return &model.User{
				ID:          userID,
				IsAnonymous: true,
				CreatedAt:   time.Now(),
			}, true, nil
		}

		mockUserRepo.CreateSubscriptionFunc = func(ctx context.Context, uID uuid.UUID) error {
			if uID != userID {
				t.Errorf("expected userID %s, got %s", userID, uID)
			}
			return nil
		}

		mockJWT.GenerateTokenPairFunc = func(uID uuid.UUID, email string, isAnon bool, dID string) (*auth.TokenPair, error) {
			return &auth.TokenPair{
				AccessToken:  "access",
				RefreshToken: "refresh",
				ExpiresAt:    time.Now().Add(1 * time.Hour),
				TokenType:    "Bearer",
			}, nil
		}

		body := map[string]string{"deviceId": deviceID}
		jsonBody, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/auth/anonymous", bytes.NewBuffer(jsonBody))
		rr := httptest.NewRecorder()

		handler.Anonymous(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}

		var resp AnonymousResponse
		json.NewDecoder(rr.Body).Decode(&resp)
		if !resp.IsNewUser {
			t.Error("expected IsNewUser to be true")
		}
		if resp.AccessToken != "access" {
			t.Error("expected access token")
		}
	})

	t.Run("generates device ID if missing", func(t *testing.T) {
		mockUserRepo.GetOrCreateAnonymousFunc = func(ctx context.Context, dID string) (*model.User, bool, error) {
			if dID == "" {
				t.Error("expected generated device ID")
			}
			return &model.User{ID: uuid.New(), IsAnonymous: true, CreatedAt: time.Now()}, false, nil
		}

		mockJWT.GenerateTokenPairFunc = func(uID uuid.UUID, email string, isAnon bool, dID string) (*auth.TokenPair, error) {
			return &auth.TokenPair{AccessToken: "acc", RefreshToken: "ref", ExpiresAt: time.Now(), TokenType: "Bearer"}, nil
		}

		req := httptest.NewRequest("POST", "/auth/anonymous", bytes.NewBuffer([]byte("{}")))
		rr := httptest.NewRecorder()

		handler.Anonymous(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}
	})

	t.Run("handles repository error", func(t *testing.T) {
		mockUserRepo.GetOrCreateAnonymousFunc = func(ctx context.Context, dID string) (*model.User, bool, error) {
			return nil, false, errors.New("db error")
		}

		req := httptest.NewRequest("POST", "/auth/anonymous", bytes.NewBuffer([]byte("{}")))
		rr := httptest.NewRecorder()

		handler.Anonymous(rr, req)

		if rr.Code != http.StatusInternalServerError {
			t.Errorf("expected status 500, got %d", rr.Code)
		}
	})
}

func TestAuthHandler_Login(t *testing.T) {
	mockUserRepo := &mockUserRepository{}
	mockJWT := &mockJWTService{}
	mockBlacklist := &mockTokenBlacklist{}
	handler := NewAuthHandler(mockJWT, mockUserRepo, mockBlacklist)

	password := "password123"
	hashedBytes, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	hashedPassword := string(hashedBytes)

	t.Run("login success", func(t *testing.T) {
		email := "test@example.com"
		userID := uuid.New()

		mockUserRepo.GetByEmailFunc = func(ctx context.Context, e string) (*model.User, error) {
			if e != email {
				t.Errorf("expected email %s, got %s", email, e)
			}
			return &model.User{
				ID:           userID,
				Email:        &email,
				PasswordHash: &hashedPassword,
				IsAnonymous:  false,
				CreatedAt:    time.Now(),
			}, nil
		}

		mockJWT.GenerateTokenPairFunc = func(uID uuid.UUID, e string, isAnon bool, dID string) (*auth.TokenPair, error) {
			return &auth.TokenPair{AccessToken: "acc", RefreshToken: "ref", ExpiresAt: time.Now(), TokenType: "Bearer"}, nil
		}

		body := map[string]string{"email": email, "password": password}
		jsonBody, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/auth/login", bytes.NewBuffer(jsonBody))
		rr := httptest.NewRecorder()

		handler.Login(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}
	})

	t.Run("invalid credentials", func(t *testing.T) {
		mockUserRepo.GetByEmailFunc = func(ctx context.Context, e string) (*model.User, error) {
			return &model.User{
				ID:           uuid.New(),
				PasswordHash: &hashedPassword,
			}, nil
		}

		body := map[string]string{"email": "test@example.com", "password": "wrongpassword"}
		jsonBody, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/auth/login", bytes.NewBuffer(jsonBody))
		rr := httptest.NewRecorder()

		handler.Login(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected status 401, got %d", rr.Code)
		}
	})
}

func TestAuthHandler_Register(t *testing.T) {
	mockUserRepo := &mockUserRepository{}
	mockJWT := &mockJWTService{}
	mockBlacklist := &mockTokenBlacklist{}
	handler := NewAuthHandler(mockJWT, mockUserRepo, mockBlacklist)

	t.Run("register success", func(t *testing.T) {
		mockUserRepo.CreateFunc = func(ctx context.Context, user *model.User) error {
			return nil
		}
		mockUserRepo.CreateSubscriptionFunc = func(ctx context.Context, userID uuid.UUID) error {
			return nil
		}
		mockJWT.GenerateTokenPairFunc = func(uID uuid.UUID, email string, isAnon bool, dID string) (*auth.TokenPair, error) {
			return &auth.TokenPair{AccessToken: "acc", RefreshToken: "ref", ExpiresAt: time.Now(), TokenType: "Bearer"}, nil
		}

		body := map[string]string{"email": "new@example.com", "password": "password123", "name": "New User"}
		jsonBody, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/auth/register", bytes.NewBuffer(jsonBody))
		rr := httptest.NewRecorder()

		handler.Register(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("expected status 201, got %d", rr.Code)
		}
	})
}
