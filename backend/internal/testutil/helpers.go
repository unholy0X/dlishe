package testutil

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
)

// NewTestRedisClient creates a miniredis client for testing
// Returns nil if redis is not available (tests should handle this)
func NewTestRedisClient(t *testing.T) *redis.Client {
	// For unit tests, we'll use a mock or skip redis-dependent tests
	// In integration tests, use a real redis instance
	client := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})

	// Check if redis is available
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available, skipping test")
		return nil
	}

	// Use a test-specific prefix to avoid conflicts
	return client
}

// GenerateTestUserID creates a random UUID for testing
func GenerateTestUserID() uuid.UUID {
	return uuid.New()
}

// CreateTestRequest creates an HTTP request for testing
func CreateTestRequest(method, path string, body string) *http.Request {
	req := httptest.NewRequest(method, path, nil)
	if body != "" {
		req = httptest.NewRequest(method, path, stringReader(body))
		req.Header.Set("Content-Type", "application/json")
	}
	return req
}

// CreateAuthenticatedRequest creates an HTTP request with user context injected
func CreateAuthenticatedRequest(t *testing.T, method, path, body string, userID uuid.UUID) *http.Request {
	req := CreateTestRequest(method, path, body)

	// Create mock user
	email := "test@example.com"
	user := &model.User{
		ID:        userID,
		Email:     &email,
		CreatedAt: time.Now(),
	}

	// Inject usage into context using the key from Clerk middleware
	ctx := context.WithValue(req.Context(), middleware.UserContextKey, user)
	return req.WithContext(ctx)
}

// stringReader creates a simple string reader
func stringReader(s string) *stringReaderImpl {
	return &stringReaderImpl{s: s, i: 0}
}

type stringReaderImpl struct {
	s string
	i int
}

func (r *stringReaderImpl) Read(b []byte) (n int, err error) {
	if r.i >= len(r.s) {
		return 0, nil
	}
	n = copy(b, r.s[r.i:])
	r.i += n
	return n, nil
}

// AssertHTTPStatus checks the response status code
func AssertHTTPStatus(t *testing.T, rr *httptest.ResponseRecorder, expected int) {
	t.Helper()
	if rr.Code != expected {
		t.Errorf("Expected status %d, got %d. Body: %s", expected, rr.Code, rr.Body.String())
	}
}

// AssertContains checks if the response body contains a string
func AssertContains(t *testing.T, rr *httptest.ResponseRecorder, substring string) {
	t.Helper()
	if !contains(rr.Body.String(), substring) {
		t.Errorf("Expected body to contain %q, got: %s", substring, rr.Body.String())
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsAt(s, substr))
}

func containsAt(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
