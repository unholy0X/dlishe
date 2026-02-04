package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func TestRecipeHandler_List(t *testing.T) {
	mockRepo := &mockRecipeRepository{}
	handler := NewRecipeHandler(mockRepo)
	userID := uuid.New()

	t.Run("auth required", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/recipes", nil)
		rr := httptest.NewRecorder()
		handler.List(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rr.Code)
		}
	})

	t.Run("success", func(t *testing.T) {
		mockRepo.ListByUserFunc = func(ctx context.Context, uid uuid.UUID, limit, offset int) ([]*model.Recipe, int, error) {
			if uid != userID {
				t.Errorf("expected userID %s, got %s", userID, uid)
			}
			return []*model.Recipe{{ID: uuid.New(), Title: "Test Recipe"}}, 1, nil
		}

		req := httptest.NewRequest("GET", "/recipes", nil)
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, &model.User{ID: userID})
		rr := httptest.NewRecorder()

		handler.List(rr, req.WithContext(ctx))

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}

		var resp map[string]interface{}
		json.NewDecoder(rr.Body).Decode(&resp)

		// Checking items (which will be a slice of interface{})
		items, ok := resp["items"].([]interface{})
		if !ok || len(items) != 1 {
			t.Errorf("expected 1 item, got %v", resp["items"])
		}
	})

	t.Run("repo error", func(t *testing.T) {
		mockRepo.ListByUserFunc = func(ctx context.Context, uid uuid.UUID, limit, offset int) ([]*model.Recipe, int, error) {
			return nil, 0, errors.New("db error")
		}

		req := httptest.NewRequest("GET", "/recipes", nil)
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, &model.User{ID: userID})
		rr := httptest.NewRecorder()

		handler.List(rr, req.WithContext(ctx))

		if rr.Code != http.StatusInternalServerError {
			t.Errorf("expected 500, got %d", rr.Code)
		}
	})
}

func TestRecipeHandler_Get(t *testing.T) {
	mockRepo := &mockRecipeRepository{}
	handler := NewRecipeHandler(mockRepo)
	userID := uuid.New()
	recipeID := uuid.New()

	t.Run("success", func(t *testing.T) {
		mockRepo.GetByIDFunc = func(ctx context.Context, id uuid.UUID) (*model.Recipe, error) {
			return &model.Recipe{ID: recipeID, UserID: userID, Title: "My Recipe"}, nil
		}

		req := httptest.NewRequest("GET", "/recipes/"+recipeID.String(), nil)
		// Add Chi context for URL params
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("recipeID", recipeID.String())
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

		// Add Auth context
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, &model.User{ID: userID})

		rr := httptest.NewRecorder()
		handler.Get(rr, req.WithContext(ctx))

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}
	})

	t.Run("access denied", func(t *testing.T) {
		otherUserID := uuid.New()
		mockRepo.GetByIDFunc = func(ctx context.Context, id uuid.UUID) (*model.Recipe, error) {
			return &model.Recipe{ID: recipeID, UserID: otherUserID}, nil
		}

		req := httptest.NewRequest("GET", "/recipes/"+recipeID.String(), nil)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("recipeID", recipeID.String())
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, &model.User{ID: userID})

		rr := httptest.NewRecorder()
		handler.Get(rr, req.WithContext(ctx))

		if rr.Code != http.StatusForbidden {
			t.Errorf("expected 403, got %d", rr.Code)
		}
	})
}
