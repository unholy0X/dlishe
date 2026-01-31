package handler

import (
	"context"
	"database/sql"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/dishflow/backend/internal/pkg/response"
)

// HealthHandler handles health check endpoints
type HealthHandler struct {
	db    *sql.DB
	redis *redis.Client
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(db *sql.DB, redis *redis.Client) *HealthHandler {
	return &HealthHandler{
		db:    db,
		redis: redis,
	}
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
}

// ReadyResponse represents the readiness check response
type ReadyResponse struct {
	Status    string            `json:"status"`
	Checks    map[string]string `json:"checks"`
	Timestamp time.Time         `json:"timestamp"`
}

// Health handles GET /health - liveness probe
func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	response.OK(w, HealthResponse{
		Status:    "ok",
		Timestamp: time.Now().UTC(),
	})
}

// Ready handles GET /ready - readiness probe
func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	checks := make(map[string]string)
	allHealthy := true

	// Check PostgreSQL
	if h.db != nil {
		if err := h.db.PingContext(ctx); err != nil {
			checks["postgres"] = "failed"
			allHealthy = false
		} else {
			checks["postgres"] = "ok"
		}
	} else {
		checks["postgres"] = "not_configured"
	}

	// Check Redis
	if h.redis != nil {
		if err := h.redis.Ping(ctx).Err(); err != nil {
			checks["redis"] = "failed"
			allHealthy = false
		} else {
			checks["redis"] = "ok"
		}
	} else {
		checks["redis"] = "not_configured"
	}

	// Gemini is not critical for readiness
	checks["gemini"] = "ok"

	status := "ready"
	httpStatus := http.StatusOK

	if !allHealthy {
		status = "not_ready"
		httpStatus = http.StatusServiceUnavailable
	}

	w.WriteHeader(httpStatus)
	response.JSON(w, httpStatus, ReadyResponse{
		Status:    status,
		Checks:    checks,
		Timestamp: time.Now().UTC(),
	})
}

// Info handles GET /api/v1/info - API information
type InfoResponse struct {
	Name        string            `json:"name"`
	Version     string            `json:"version"`
	Environment string            `json:"environment"`
	Features    map[string]bool   `json:"features"`
}

func (h *HealthHandler) Info(w http.ResponseWriter, r *http.Request) {
	response.OK(w, InfoResponse{
		Name:        "DishFlow API",
		Version:     "1.0.0",
		Environment: "development", // TODO: from config
		Features: map[string]bool{
			"video_extraction": true,
			"ai_generation":    true,
			"sync":             true,
			"recipe_sharing":   true,
		},
	})
}
