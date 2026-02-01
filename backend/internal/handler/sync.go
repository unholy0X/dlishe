package handler

import (
	"encoding/json"
	"net/http"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/service/sync"
)

// SyncHandler handles sync-related HTTP requests
type SyncHandler struct {
	syncService *sync.Service
}

// NewSyncHandler creates a new sync handler
func NewSyncHandler(syncService *sync.Service) *SyncHandler {
	return &SyncHandler{syncService: syncService}
}

// Sync handles POST /api/v1/sync
func (h *SyncHandler) Sync(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req model.SyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Process sync
	resp, err := h.syncService.Sync(ctx, claims.UserID, &req)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, resp)
}
