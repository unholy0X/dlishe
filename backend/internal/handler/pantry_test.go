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

func TestPantryHandler_List(t *testing.T) {
	mockRepo := &mockPantryRepository{}
	handler := NewPantryHandler(mockRepo)
	userID := uuid.New()

	t.Run("success", func(t *testing.T) {
		qty := 1.0
		unit := "kg"
		mockRepo.ListFunc = func(ctx context.Context, uid uuid.UUID, category *string) ([]*model.PantryItem, error) {
			return []*model.PantryItem{
				{ID: uuid.New(), Name: "Salt", Quantity: &qty, Unit: &unit},
			}, nil
		}

		req := httptest.NewRequest("GET", "/pantry", nil)
		ctx := context.WithValue(req.Context(), middleware.ClaimsKey, &auth.Claims{UserID: userID})
		rr := httptest.NewRecorder()

		handler.List(rr, req.WithContext(ctx))

		if rr.Code != http.StatusOK {
			t.Errorf("expected 200, got %d", rr.Code)
		}
	})
}
