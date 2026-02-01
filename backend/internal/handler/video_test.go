package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/service/auth"
	"github.com/google/uuid"
)

func TestVideoHandler_Extract(t *testing.T) {
	mockJobRepo := &mockJobRepository{}
	mockRecipeRepo := &mockRecipeRepository{}
	mockExtractor := &mockRecipeExtractor{}
	mockDownloader := &mockVideoDownloader{}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	handler := NewVideoHandler(mockJobRepo, mockRecipeRepo, mockExtractor, mockDownloader, logger)
	userID := uuid.New()

	t.Run("success", func(t *testing.T) {
		mockJobRepo.CreateFunc = func(ctx context.Context, job *model.VideoJob) error {
			if job.UserID != userID {
				t.Errorf("expected userID %s, got %s", userID, job.UserID)
			}
			job.ID = uuid.New()
			job.Status = model.JobStatusPending
			return nil
		}

		// Note: The goroutine part won't run deterministically in this test unless we wait or change design,
		// but we are testing the HTTP response primarily here.
		// Since we mocked dependencies, the goroutine will just use them.
		// However, processJob uses a background context, so tracing execution there in unit test is hard
		// without synchronization.
		// For now, we verify the job creation response.

		body := map[string]string{"videoUrl": "https://tiktok.com/video/123"}
		jsonBody, _ := json.Marshal(body)

		req := httptest.NewRequest("POST", "/video/extract", bytes.NewBuffer(jsonBody))
		ctx := context.WithValue(req.Context(), middleware.ClaimsKey, &auth.Claims{UserID: userID})
		rr := httptest.NewRecorder()

		handler.Extract(rr, req.WithContext(ctx))

		if rr.Code != http.StatusCreated {
			t.Errorf("expected 201, got %d", rr.Code)
		}
	})
}
