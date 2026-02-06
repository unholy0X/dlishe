package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/google/uuid"
)

func TestPantryHandler_List(t *testing.T) {
	mockRepo := &mockPantryRepository{}
	handler := NewPantryHandler(mockRepo, nil, nil, nil) // nil scanner since we're not testing scanning
	userID := uuid.New()

	t.Run("success", func(t *testing.T) {
		qty := 1.0
		unit := "kg"
		mockRepo.ListFunc = func(ctx context.Context, uid uuid.UUID, category *string, limit, offset int) ([]*model.PantryItem, int, error) {
			items := []*model.PantryItem{
				{ID: uuid.New(), Name: "Salt", Quantity: &qty, Unit: &unit},
			}
			return items, len(items), nil
		}

		req := httptest.NewRequest("GET", "/pantry", nil)
		ctx := context.WithValue(req.Context(), middleware.UserContextKey, &model.User{ID: userID})
		rr := httptest.NewRecorder()

		handler.List(rr, req.WithContext(ctx))

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}
	})
}
