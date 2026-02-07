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
	handler := NewRecipeHandler(mockRepo, nil)
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
	handler := NewRecipeHandler(mockRepo, nil)
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

func TestRecipeHandler_Search(t *testing.T) {
	mockRepo := &mockRecipeRepository{}
	handler := NewRecipeHandler(mockRepo, nil)
	userID := uuid.New()

	t.Run("auth required", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/recipes/search?q=chicken", nil)
		rr := httptest.NewRecorder()
		handler.Search(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", rr.Code)
		}
	})

	t.Run("missing query parameter", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/recipes/search", nil)
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, &model.User{ID: userID})
		rr := httptest.NewRecorder()

		handler.Search(rr, req.WithContext(ctx))

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rr.Code)
		}
	})

	t.Run("empty query parameter", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/recipes/search?q=", nil)
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, &model.User{ID: userID})
		rr := httptest.NewRecorder()

		handler.Search(rr, req.WithContext(ctx))

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", rr.Code)
		}
	})

	t.Run("successful search", func(t *testing.T) {
		cuisine := "Italian"
		mockRepo.SearchFunc = func(ctx context.Context, uid uuid.UUID, query string, limit int) ([]*model.Recipe, error) {
			if uid != userID {
				t.Errorf("expected userID %s, got %s", userID, uid)
			}
			if query != "chicken" {
				t.Errorf("expected query 'chicken', got '%s'", query)
			}
			return []*model.Recipe{
				{
					ID:         uuid.New(),
					Title:      "Chicken Parmesan",
					Cuisine:    &cuisine,
					IsFavorite: true,
				},
			}, nil
		}

		req := httptest.NewRequest("GET", "/recipes/search?q=chicken", nil)
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, &model.User{ID: userID})
		rr := httptest.NewRecorder()

		handler.Search(rr, req.WithContext(ctx))

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d: %s", rr.Code, rr.Body.String())
		}

		var resp map[string]interface{}
		json.NewDecoder(rr.Body).Decode(&resp)

		if resp["query"] != "chicken" {
			t.Errorf("expected query 'chicken', got %v", resp["query"])
		}
		if resp["count"].(float64) != 1 {
			t.Errorf("expected count 1, got %v", resp["count"])
		}
		results := resp["results"].([]interface{})
		if len(results) != 1 {
			t.Errorf("expected 1 result, got %d", len(results))
		}
	})

	t.Run("empty results", func(t *testing.T) {
		mockRepo.SearchFunc = func(ctx context.Context, uid uuid.UUID, query string, limit int) ([]*model.Recipe, error) {
			return []*model.Recipe{}, nil
		}

		req := httptest.NewRequest("GET", "/recipes/search?q=nonexistent", nil)
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, &model.User{ID: userID})
		rr := httptest.NewRecorder()

		handler.Search(rr, req.WithContext(ctx))

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}

		var resp map[string]interface{}
		json.NewDecoder(rr.Body).Decode(&resp)

		if resp["count"].(float64) != 0 {
			t.Errorf("expected count 0, got %v", resp["count"])
		}
	})

	t.Run("respects limit parameter", func(t *testing.T) {
		mockRepo.SearchFunc = func(ctx context.Context, uid uuid.UUID, query string, limit int) ([]*model.Recipe, error) {
			if limit != 5 {
				t.Errorf("expected limit 5, got %d", limit)
			}
			return []*model.Recipe{}, nil
		}

		req := httptest.NewRequest("GET", "/recipes/search?q=test&limit=5", nil)
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, &model.User{ID: userID})
		rr := httptest.NewRecorder()

		handler.Search(rr, req.WithContext(ctx))

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}
	})

	t.Run("repo error returns 500", func(t *testing.T) {
		mockRepo.SearchFunc = func(ctx context.Context, uid uuid.UUID, query string, limit int) ([]*model.Recipe, error) {
			return nil, errors.New("db error")
		}

		req := httptest.NewRequest("GET", "/recipes/search?q=test", nil)
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, &model.User{ID: userID})
		rr := httptest.NewRecorder()

		handler.Search(rr, req.WithContext(ctx))

		if rr.Code != http.StatusInternalServerError {
			t.Errorf("expected 500, got %d", rr.Code)
		}
	})
}
