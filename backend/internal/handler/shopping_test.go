package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/service/auth"
	"github.com/google/uuid"
)

func TestShoppingHandler_ListLists(t *testing.T) {
	mockRepo := &mockShoppingRepository{}
	mockRecipeRepo := &mockRecipeRepository{}
	mockAI := &mockShoppingListAnalyzer{}
	handler := NewShoppingHandler(mockRepo, mockRecipeRepo, mockAI)
	userID := uuid.New()

	t.Run("success", func(t *testing.T) {
		mockRepo.ListListsFunc = func(ctx context.Context, uid uuid.UUID, archive bool) ([]*model.ShoppingList, error) {
			return []*model.ShoppingList{
				{ID: uuid.New(), Name: "Weekly Groceries"},
			}, nil
		}

		req := httptest.NewRequest("GET", "/shopping-lists", nil)
		ctx := context.WithValue(req.Context(), middleware.ClaimsKey, &auth.Claims{UserID: userID})
		rr := httptest.NewRecorder()

		handler.ListLists(rr, req.WithContext(ctx))

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}
	})
}
