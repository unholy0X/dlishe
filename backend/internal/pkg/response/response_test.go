package response

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJSON(t *testing.T) {
	t.Run("with data", func(t *testing.T) {
		rr := httptest.NewRecorder()

		data := map[string]string{"key": "value"}
		JSON(rr, http.StatusOK, data)

		if rr.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", rr.Code)
		}
		if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
			t.Errorf("Expected Content-Type 'application/json', got %q", ct)
		}

		var resp map[string]string
		json.NewDecoder(rr.Body).Decode(&resp)
		if resp["key"] != "value" {
			t.Errorf("Expected key='value', got %q", resp["key"])
		}
	})

	t.Run("with nil data", func(t *testing.T) {
		rr := httptest.NewRecorder()
		JSON(rr, http.StatusNoContent, nil)

		if rr.Code != http.StatusNoContent {
			t.Errorf("Expected 204, got %d", rr.Code)
		}
	})
}

func TestErrorJSON(t *testing.T) {
	rr := httptest.NewRecorder()

	ErrorJSON(rr, http.StatusBadRequest, "TEST_ERROR", "Test message", map[string]interface{}{
		"field": "test_field",
	})

	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "TEST_ERROR" {
		t.Errorf("Expected code 'TEST_ERROR', got %q", resp.Error.Code)
	}
	if resp.Error.Message != "Test message" {
		t.Errorf("Expected message 'Test message', got %q", resp.Error.Message)
	}
	if resp.Error.Details["field"] != "test_field" {
		t.Errorf("Expected field 'test_field', got %v", resp.Error.Details["field"])
	}
	if resp.Error.Timestamp.IsZero() {
		t.Error("Expected timestamp to be set")
	}
}

func TestErrorJSONWithRequestID(t *testing.T) {
	rr := httptest.NewRecorder()
	rr.Header().Set("X-Request-ID", "req-123")

	ErrorJSON(rr, http.StatusBadRequest, "TEST", "test", nil)

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.RequestID != "req-123" {
		t.Errorf("Expected requestId 'req-123', got %q", resp.Error.RequestID)
	}
}

func TestBadRequest(t *testing.T) {
	rr := httptest.NewRecorder()
	BadRequest(rr, "invalid input")

	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "BAD_REQUEST" {
		t.Errorf("Expected code 'BAD_REQUEST', got %q", resp.Error.Code)
	}
}

func TestValidationFailed(t *testing.T) {
	rr := httptest.NewRecorder()
	ValidationFailed(rr, "email", "must be valid email")

	if rr.Code != http.StatusBadRequest {
		t.Errorf("Expected 400, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "VALIDATION_FAILED" {
		t.Errorf("Expected code 'VALIDATION_FAILED', got %q", resp.Error.Code)
	}
	if resp.Error.Details["field"] != "email" {
		t.Errorf("Expected field 'email', got %v", resp.Error.Details["field"])
	}
	if resp.Error.Details["reason"] != "must be valid email" {
		t.Errorf("Expected reason 'must be valid email', got %v", resp.Error.Details["reason"])
	}
}

func TestUnauthorized(t *testing.T) {
	rr := httptest.NewRecorder()
	Unauthorized(rr, "missing token")

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "UNAUTHORIZED" {
		t.Errorf("Expected code 'UNAUTHORIZED', got %q", resp.Error.Code)
	}
}

func TestTokenExpired(t *testing.T) {
	rr := httptest.NewRecorder()
	TokenExpired(rr)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "TOKEN_EXPIRED" {
		t.Errorf("Expected code 'TOKEN_EXPIRED', got %q", resp.Error.Code)
	}
}

func TestInvalidToken(t *testing.T) {
	rr := httptest.NewRecorder()
	InvalidToken(rr)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "INVALID_TOKEN" {
		t.Errorf("Expected code 'INVALID_TOKEN', got %q", resp.Error.Code)
	}
}

func TestForbidden(t *testing.T) {
	rr := httptest.NewRecorder()
	Forbidden(rr, "access denied")

	if rr.Code != http.StatusForbidden {
		t.Errorf("Expected 403, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "FORBIDDEN" {
		t.Errorf("Expected code 'FORBIDDEN', got %q", resp.Error.Code)
	}
}

func TestNotFound(t *testing.T) {
	rr := httptest.NewRecorder()
	NotFound(rr, "Recipe")

	if rr.Code != http.StatusNotFound {
		t.Errorf("Expected 404, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "NOT_FOUND" {
		t.Errorf("Expected code 'NOT_FOUND', got %q", resp.Error.Code)
	}
	if resp.Error.Message != "Recipe not found" {
		t.Errorf("Expected message 'Recipe not found', got %q", resp.Error.Message)
	}
}

func TestConflict(t *testing.T) {
	rr := httptest.NewRecorder()
	Conflict(rr, "resource already exists")

	if rr.Code != http.StatusConflict {
		t.Errorf("Expected 409, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "CONFLICT" {
		t.Errorf("Expected code 'CONFLICT', got %q", resp.Error.Code)
	}
}

func TestVersionConflict(t *testing.T) {
	rr := httptest.NewRecorder()
	VersionConflict(rr, 5, 3)

	if rr.Code != http.StatusConflict {
		t.Errorf("Expected 409, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "VERSION_CONFLICT" {
		t.Errorf("Expected code 'VERSION_CONFLICT', got %q", resp.Error.Code)
	}
	if resp.Error.Details["serverVersion"] != float64(5) {
		t.Errorf("Expected serverVersion 5, got %v", resp.Error.Details["serverVersion"])
	}
	if resp.Error.Details["yourVersion"] != float64(3) {
		t.Errorf("Expected yourVersion 3, got %v", resp.Error.Details["yourVersion"])
	}
}

func TestRateLimited(t *testing.T) {
	rr := httptest.NewRecorder()
	RateLimited(rr, 60)

	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("Expected 429, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "RATE_LIMITED" {
		t.Errorf("Expected code 'RATE_LIMITED', got %q", resp.Error.Code)
	}
}

func TestPaymentRequired(t *testing.T) {
	rr := httptest.NewRecorder()
	PaymentRequired(rr, "Upgrade to premium")

	if rr.Code != http.StatusPaymentRequired {
		t.Errorf("Expected 402, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "UPGRADE_REQUIRED" {
		t.Errorf("Expected code 'UPGRADE_REQUIRED', got %q", resp.Error.Code)
	}
}

func TestInternalError(t *testing.T) {
	rr := httptest.NewRecorder()
	InternalError(rr)

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("Expected 500, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "INTERNAL_ERROR" {
		t.Errorf("Expected code 'INTERNAL_ERROR', got %q", resp.Error.Code)
	}
}

func TestServiceUnavailable(t *testing.T) {
	rr := httptest.NewRecorder()
	ServiceUnavailable(rr, "Redis")

	if rr.Code != http.StatusServiceUnavailable {
		t.Errorf("Expected 503, got %d", rr.Code)
	}

	var resp ErrorResponse
	json.NewDecoder(rr.Body).Decode(&resp)

	if resp.Error.Code != "SERVICE_UNAVAILABLE" {
		t.Errorf("Expected code 'SERVICE_UNAVAILABLE', got %q", resp.Error.Code)
	}
	if resp.Error.Message != "Redis is currently unavailable" {
		t.Errorf("Expected message 'Redis is currently unavailable', got %q", resp.Error.Message)
	}
}

func TestOK(t *testing.T) {
	rr := httptest.NewRecorder()
	OK(rr, map[string]string{"status": "success"})

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", rr.Code)
	}
}

func TestCreated(t *testing.T) {
	rr := httptest.NewRecorder()
	Created(rr, map[string]string{"id": "123"})

	if rr.Code != http.StatusCreated {
		t.Errorf("Expected 201, got %d", rr.Code)
	}
}

func TestAccepted(t *testing.T) {
	rr := httptest.NewRecorder()
	Accepted(rr, map[string]string{"task_id": "456"})

	if rr.Code != http.StatusAccepted {
		t.Errorf("Expected 202, got %d", rr.Code)
	}
}

func TestNoContent(t *testing.T) {
	rr := httptest.NewRecorder()
	NoContent(rr)

	if rr.Code != http.StatusNoContent {
		t.Errorf("Expected 204, got %d", rr.Code)
	}
}
