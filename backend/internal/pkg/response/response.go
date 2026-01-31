package response

import (
	"encoding/json"
	"net/http"
	"time"
)

// Error represents an API error response
type Error struct {
	Code      string                 `json:"code"`
	Message   string                 `json:"message"`
	Details   map[string]interface{} `json:"details,omitempty"`
	RequestID string                 `json:"requestId,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// ErrorResponse wraps an error in the standard format
type ErrorResponse struct {
	Error Error `json:"error"`
}

// JSON sends a JSON response with the given status code
func JSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		json.NewEncoder(w).Encode(data)
	}
}

// ErrorJSON sends an error response with the given status code
func ErrorJSON(w http.ResponseWriter, status int, code, message string, details map[string]interface{}) {
	resp := ErrorResponse{
		Error: Error{
			Code:      code,
			Message:   message,
			Details:   details,
			Timestamp: time.Now().UTC(),
		},
	}

	// Get request ID from context if available
	if requestID := w.Header().Get("X-Request-ID"); requestID != "" {
		resp.Error.RequestID = requestID
	}

	JSON(w, status, resp)
}

// Common error responses

func BadRequest(w http.ResponseWriter, message string) {
	ErrorJSON(w, http.StatusBadRequest, "BAD_REQUEST", message, nil)
}

func ValidationFailed(w http.ResponseWriter, field, reason string) {
	ErrorJSON(w, http.StatusBadRequest, "VALIDATION_FAILED", "Validation failed", map[string]interface{}{
		"field":  field,
		"reason": reason,
	})
}

func Unauthorized(w http.ResponseWriter, message string) {
	ErrorJSON(w, http.StatusUnauthorized, "UNAUTHORIZED", message, nil)
}

func TokenExpired(w http.ResponseWriter) {
	ErrorJSON(w, http.StatusUnauthorized, "TOKEN_EXPIRED", "Access token has expired", nil)
}

func InvalidToken(w http.ResponseWriter) {
	ErrorJSON(w, http.StatusUnauthorized, "INVALID_TOKEN", "Invalid or malformed token", nil)
}

func Forbidden(w http.ResponseWriter, message string) {
	ErrorJSON(w, http.StatusForbidden, "FORBIDDEN", message, nil)
}

func NotFound(w http.ResponseWriter, resource string) {
	ErrorJSON(w, http.StatusNotFound, "NOT_FOUND", resource+" not found", nil)
}

func Conflict(w http.ResponseWriter, message string) {
	ErrorJSON(w, http.StatusConflict, "CONFLICT", message, nil)
}

func VersionConflict(w http.ResponseWriter, serverVersion, yourVersion interface{}) {
	ErrorJSON(w, http.StatusConflict, "VERSION_CONFLICT", "Resource was modified by another client", map[string]interface{}{
		"serverVersion": serverVersion,
		"yourVersion":   yourVersion,
	})
}

func RateLimited(w http.ResponseWriter, retryAfter int) {
	w.Header().Set("Retry-After", string(rune(retryAfter)))
	ErrorJSON(w, http.StatusTooManyRequests, "RATE_LIMITED", "Too many requests", map[string]interface{}{
		"retryAfter": retryAfter,
	})
}

func PaymentRequired(w http.ResponseWriter, message string) {
	ErrorJSON(w, http.StatusPaymentRequired, "UPGRADE_REQUIRED", message, nil)
}

func InternalError(w http.ResponseWriter) {
	ErrorJSON(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An internal error occurred", nil)
}

func ServiceUnavailable(w http.ResponseWriter, service string) {
	ErrorJSON(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", service+" is currently unavailable", nil)
}

// Success responses

func OK(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, data)
}

func Created(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusCreated, data)
}

func Accepted(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusAccepted, data)
}

func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}
