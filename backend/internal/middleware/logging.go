package middleware

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type contextKey string

const LoggerKey contextKey = "logger"

// responseWriter wraps http.ResponseWriter to capture status code and body
type responseWriter struct {
	http.ResponseWriter
	status int
	size   int
	body   *bytes.Buffer
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	size, err := rw.ResponseWriter.Write(b)
	rw.size += size
	rw.body.Write(b)
	return size, err
}

// GetLogger retrieves the logger from context or returns default
func GetLogger(ctx context.Context) *slog.Logger {
	if logger, ok := ctx.Value(LoggerKey).(*slog.Logger); ok {
		return logger
	}
	return slog.Default()
}

// Logging is a middleware that logs HTTP requests with full payloads
func Logging(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Generate request ID
			requestID := r.Header.Get("X-Request-ID")
			if requestID == "" {
				requestID = uuid.New().String()
			}

			// Create context-aware logger
			reqLogger := logger.With(slog.String("request_id", requestID))
			ctx := context.WithValue(r.Context(), LoggerKey, reqLogger)

			// Set request ID in response header
			w.Header().Set("X-Request-ID", requestID)

			// Capture request body
			var reqBody []byte
			if r.Body != nil {
				reqBody, _ = io.ReadAll(r.Body)
				r.Body = io.NopCloser(bytes.NewBuffer(reqBody)) // Restore body
			}

			// Wrap response writer to capture status and body
			wrapped := &responseWriter{
				ResponseWriter: w,
				status:         http.StatusOK, // Default
				body:           bytes.NewBuffer(nil),
			}

			// Process request with annotated context
			next.ServeHTTP(wrapped, r.WithContext(ctx))

			// Calculate duration
			duration := time.Since(start)

			// Sanitize and limit bodies
			logReqBody := sanitizeBody(reqBody)
			logRespBody := sanitizeBody(wrapped.body.Bytes())

			// Skip body logging for health checks or large files
			if r.URL.Path == "/api/v1/health" {
				logReqBody = ""
				logRespBody = ""
			}

			// Log request with payloads
			reqLogger.Info("HTTP request",
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", wrapped.status),
				slog.Int("size", wrapped.size),
				slog.Duration("duration", duration),
				slog.String("remote_addr", r.RemoteAddr),
				slog.String("request_body", logReqBody),
				slog.String("response_body", logRespBody),
			)
		})
	}
}

// sanitizeBody truncates large bodies and masks sensitive fields
func sanitizeBody(b []byte) string {
	if len(b) == 0 {
		return ""
	}

	// Simple sanity check for binary data
	if bytes.IndexByte(b, 0) != -1 {
		return "(binary data)"
	}

	// Mask sensitive JSON fields
	// We do a simple string replacement for common sensitive keys to avoid full JSON parsing overhead
	// This captures "key": "value" patterns for standard JSON
	s := string(b)
	sensitiveKeys := []string{"password", "token", "secret", "access_token", "refresh_token"}

	for _, key := range sensitiveKeys {
		// Replace "key": "value" with "key": "***"
		// This regex handles various spacing: "password" : "val"
		// specific implementation: look for the key, a colon, and a wire string
		// For a simple hackathon fix, simple replacement is safer than complex regex that might hang
		if strings.Contains(s, key) {
			// Find "key"
			// Check if it's likely a JSON key (quoted)
			keyPattern := fmt.Sprintf(`"%s"`, key)
			if idx := strings.Index(s, keyPattern); idx != -1 {
				// We won't try to perfectly parse values, we'll just indicate it contains sensitive data
				// A simpler approach for the log is: if body has sensitive keys, just redact the whole thing or be careful
				// But let's try to be helpful.
				// Actually, for a hackathon, let's just use a simpler heuristic:
				// If the body contains "password", just return "(sensitive content masked)"
				return "(sensitive content masked)"
			}
		}
	}

	const maxLogSize = 2048 // 2KB limit for log readability
	if len(b) > maxLogSize {
		return s[:maxLogSize] + "...(truncated)"
	}

	return s
}

// RequestID extracts or generates a request ID and adds it to context
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		w.Header().Set("X-Request-ID", requestID)
		next.ServeHTTP(w, r)
	})
}
