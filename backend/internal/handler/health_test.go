package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestNewHealthHandler(t *testing.T) {
	h := NewHealthHandler(nil, nil)
	if h == nil {
		t.Fatal("Expected non-nil handler")
	}
}

func TestHealth(t *testing.T) {
	h := NewHealthHandler(nil, nil)

	req := httptest.NewRequest("GET", "/health", nil)
	rr := httptest.NewRecorder()

	h.Health(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}

	var resp HealthResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if resp.Status != "ok" {
		t.Errorf("Expected status 'ok', got %q", resp.Status)
	}

	if resp.Timestamp.IsZero() {
		t.Error("Expected timestamp to be set")
	}
}

func TestReady(t *testing.T) {
	t.Run("no dependencies configured", func(t *testing.T) {
		h := NewHealthHandler(nil, nil)

		req := httptest.NewRequest("GET", "/ready", nil)
		rr := httptest.NewRecorder()

		h.Ready(rr, req)

		// Should still be ready but with not_configured checks
		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}

		var resp ReadyResponse
		if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
			t.Fatalf("Failed to decode response: %v", err)
		}

		if resp.Status != "ready" {
			t.Errorf("Expected status 'ready', got %q", resp.Status)
		}

		if resp.Checks["postgres"] != "not_configured" {
			t.Errorf("Expected postgres 'not_configured', got %q", resp.Checks["postgres"])
		}
		if resp.Checks["redis"] != "not_configured" {
			t.Errorf("Expected redis 'not_configured', got %q", resp.Checks["redis"])
		}
	})

	t.Run("with healthy redis", func(t *testing.T) {
		mr, err := miniredis.Run()
		if err != nil {
			t.Fatalf("Failed to start miniredis: %v", err)
		}
		defer mr.Close()

		client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
		defer client.Close()

		h := NewHealthHandler(nil, client)

		req := httptest.NewRequest("GET", "/ready", nil)
		rr := httptest.NewRecorder()

		h.Ready(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}

		var resp ReadyResponse
		json.NewDecoder(rr.Body).Decode(&resp)

		if resp.Checks["redis"] != "ok" {
			t.Errorf("Expected redis 'ok', got %q", resp.Checks["redis"])
		}
	})

	t.Run("with failed redis", func(t *testing.T) {
		mr, err := miniredis.Run()
		if err != nil {
			t.Fatalf("Failed to start miniredis: %v", err)
		}

		client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
		defer client.Close()

		// Close miniredis to simulate failure
		mr.Close()

		h := NewHealthHandler(nil, client)

		req := httptest.NewRequest("GET", "/ready", nil)
		rr := httptest.NewRecorder()

		h.Ready(rr, req)

		if rr.Code != http.StatusServiceUnavailable {
			t.Errorf("Expected 503, got %d", rr.Code)
		}

		var resp ReadyResponse
		json.NewDecoder(rr.Body).Decode(&resp)

		if resp.Status != "not_ready" {
			t.Errorf("Expected status 'not_ready', got %q", resp.Status)
		}
		if resp.Checks["redis"] != "failed" {
			t.Errorf("Expected redis 'failed', got %q", resp.Checks["redis"])
		}
	})
}

func TestInfo(t *testing.T) {
	h := NewHealthHandler(nil, nil)

	req := httptest.NewRequest("GET", "/api/v1/info", nil)
	rr := httptest.NewRecorder()

	h.Info(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}

	var resp InfoResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if resp.Name != "DLISHE API" {
		t.Errorf("Expected name 'DLISHE API', got %q", resp.Name)
	}
	if resp.Version != "1.0.0" {
		t.Errorf("Expected version '1.0.0', got %q", resp.Version)
	}

	// Check features
	expectedFeatures := []string{"video_extraction", "ai_generation", "sync", "recipe_sharing"}
	for _, f := range expectedFeatures {
		if !resp.Features[f] {
			t.Errorf("Expected feature %q to be enabled", f)
		}
	}
}
