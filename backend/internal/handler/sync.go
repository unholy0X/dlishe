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
// @Summary Sync data across devices
// @Description Synchronize recipes, pantry items, and shopping lists between devices
// @Tags Sync
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body SwaggerSyncRequest true "Sync payload with local changes"
// @Success 200 {object} SwaggerSyncResponse "Server changes and conflict resolutions"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request body"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /sync [post]
func (h *SyncHandler) Sync(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req model.SyncRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Process sync
	resp, err := h.syncService.Sync(ctx, user.ID, &req)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, resp)
}
