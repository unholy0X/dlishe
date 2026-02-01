package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func setupTestRedis(t *testing.T) (*redis.Client, *miniredis.Miniredis, func()) {
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("Failed to start miniredis: %v", err)
	}

	client := redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})

	cleanup := func() {
		client.Close()
		mr.Close()
	}

	return client, mr, cleanup
}

func TestNewRateLimiter(t *testing.T) {
	client, _, cleanup := setupTestRedis(t)
	defer cleanup()

	rl := NewRateLimiter(client)
	if rl == nil {
		t.Fatal("Expected non-nil rate limiter")
	}
}

func TestPublicRateLimiter(t *testing.T) {
	client, mr, cleanup := setupTestRedis(t)
	defer cleanup()

	rl := NewRateLimiter(client)
	handler := rl.Public()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}))

	t.Run("allows requests under limit", func(t *testing.T) {
		// Clear redis state
		mr.FlushAll()

		for i := 0; i < 10; i++ {
			req := httptest.NewRequest("GET", "/health", nil)
			req.RemoteAddr = "192.168.1.1:12345"
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			if rr.Code != http.StatusOK {
				t.Errorf("Request %d: expected 200, got %d", i, rr.Code)
			}

			// Check rate limit headers
			if rr.Header().Get("X-RateLimit-Limit") == "" {
				t.Error("Missing X-RateLimit-Limit header")
			}
			if rr.Header().Get("X-RateLimit-Remaining") == "" {
				t.Error("Missing X-RateLimit-Remaining header")
			}
		}
	})

	t.Run("blocks requests over limit", func(t *testing.T) {
		// Clear redis state
		mr.FlushAll()

		// Make 100 requests (the limit)
		for i := 0; i < 100; i++ {
			req := httptest.NewRequest("GET", "/health", nil)
			req.RemoteAddr = "10.0.0.1:12345"
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)
		}

		// 101st request should be blocked
		req := httptest.NewRequest("GET", "/health", nil)
		req.RemoteAddr = "10.0.0.1:12345"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusTooManyRequests {
			t.Errorf("Expected 429, got %d", rr.Code)
		}

		if rr.Header().Get("Retry-After") == "" {
			t.Error("Missing Retry-After header")
		}
	})

	t.Run("different IPs have separate limits", func(t *testing.T) {
		mr.FlushAll()

		// Exhaust limit for IP 1
		for i := 0; i < 101; i++ {
			req := httptest.NewRequest("GET", "/health", nil)
			req.RemoteAddr = "1.1.1.1:12345"
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)
		}

		// IP 2 should still work
		req := httptest.NewRequest("GET", "/health", nil)
		req.RemoteAddr = "2.2.2.2:12345"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Different IP should not be rate limited, got %d", rr.Code)
		}
	})
}

func TestGetIPIdentifier(t *testing.T) {
	tests := []struct {
		name           string
		remoteAddr     string
		xForwardedFor  string
		xRealIP        string
		expectedPrefix string
	}{
		{
			name:           "simple remote addr",
			remoteAddr:     "192.168.1.1:8080",
			expectedPrefix: "192.168.1.1",
		},
		{
			name:           "X-Forwarded-For single IP",
			remoteAddr:     "10.0.0.1:8080",
			xForwardedFor:  "203.0.113.50",
			expectedPrefix: "203.0.113.50",
		},
		{
			name:           "X-Forwarded-For multiple IPs - should take first",
			remoteAddr:     "10.0.0.1:8080",
			xForwardedFor:  "203.0.113.50, 70.41.3.18, 150.172.238.178",
			expectedPrefix: "203.0.113.50",
		},
		{
			name:           "X-Forwarded-For with spaces",
			remoteAddr:     "10.0.0.1:8080",
			xForwardedFor:  "  203.0.113.50  ,  70.41.3.18  ",
			expectedPrefix: "203.0.113.50",
		},
		{
			name:           "X-Real-IP takes precedence over RemoteAddr",
			remoteAddr:     "10.0.0.1:8080",
			xRealIP:        "198.51.100.178",
			expectedPrefix: "198.51.100.178",
		},
		{
			name:           "X-Forwarded-For takes precedence over X-Real-IP",
			remoteAddr:     "10.0.0.1:8080",
			xForwardedFor:  "203.0.113.50",
			xRealIP:        "198.51.100.178",
			expectedPrefix: "203.0.113.50",
		},
		{
			name:           "IPv6 with port",
			remoteAddr:     "[::1]:8080",
			expectedPrefix: "::1",
		},
		{
			name:           "IPv6 without port",
			remoteAddr:     "::1",
			expectedPrefix: "::1",
		},
		{
			name:           "X-Forwarded-For with IPv6",
			remoteAddr:     "10.0.0.1:8080",
			xForwardedFor:  "2001:db8::1, 10.0.0.1",
			expectedPrefix: "2001:db8::1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			req.RemoteAddr = tt.remoteAddr
			if tt.xForwardedFor != "" {
				req.Header.Set("X-Forwarded-For", tt.xForwardedFor)
			}
			if tt.xRealIP != "" {
				req.Header.Set("X-Real-IP", tt.xRealIP)
			}

			result := getIPIdentifier(req)

			if result != tt.expectedPrefix {
				t.Errorf("Expected %q, got %q", tt.expectedPrefix, result)
			}
		})
	}
}

func TestStripPort(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"192.168.1.1:8080", "192.168.1.1"},
		{"192.168.1.1", "192.168.1.1"},
		{"[::1]:8080", "::1"},
		{"[::1]", "::1"},
		{"::1", "::1"},
		{"2001:db8::1", "2001:db8::1"},
		{"[2001:db8::1]:443", "2001:db8::1"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := stripPort(tt.input)
			if result != tt.expected {
				t.Errorf("stripPort(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestVideoExtractionRateLimiter(t *testing.T) {
	client, mr, cleanup := setupTestRedis(t)
	defer cleanup()

	rl := NewRateLimiter(client)
	handler := rl.VideoExtraction()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	mr.FlushAll()

	// Video extraction limit is 5/hour
	// Make 5 requests (should succeed)
	for i := 0; i < 5; i++ {
		req := httptest.NewRequest("POST", "/video/extract", nil)
		req.RemoteAddr = "192.168.1.100:12345"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("Request %d: expected 200, got %d", i, rr.Code)
		}
	}

	// 6th request should be blocked
	req := httptest.NewRequest("POST", "/video/extract", nil)
	req.RemoteAddr = "192.168.1.100:12345"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("Expected 429 for over-limit request, got %d", rr.Code)
	}
}

func TestRateLimiterRedisFailure(t *testing.T) {
	client, mr, cleanup := setupTestRedis(t)
	defer cleanup()

	rl := NewRateLimiter(client)
	handler := rl.Public()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Close redis to simulate failure
	mr.Close()

	// Request should still succeed (fail open)
	req := httptest.NewRequest("GET", "/health", nil)
	req.RemoteAddr = "192.168.1.1:12345"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected 200 on Redis failure (fail open), got %d", rr.Code)
	}
}

func TestRateLimitHeaders(t *testing.T) {
	client, mr, cleanup := setupTestRedis(t)
	defer cleanup()

	mr.FlushAll()

	rl := NewRateLimiter(client)
	handler := rl.Public()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.168.1.1:12345"
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Check all required headers are present
	headers := []string{"X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"}
	for _, h := range headers {
		if rr.Header().Get(h) == "" {
			t.Errorf("Missing header: %s", h)
		}
	}

	// Limit should be 100 for public
	if rr.Header().Get("X-RateLimit-Limit") != "100" {
		t.Errorf("Expected limit 100, got %s", rr.Header().Get("X-RateLimit-Limit"))
	}

	// After first request, remaining should be 99
	if rr.Header().Get("X-RateLimit-Remaining") != "99" {
		t.Errorf("Expected remaining 99, got %s", rr.Header().Get("X-RateLimit-Remaining"))
	}
}

func BenchmarkRateLimiter(b *testing.B) {
	mr, _ := miniredis.Run()
	defer mr.Close()

	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	defer client.Close()

	rl := NewRateLimiter(client)
	handler := rl.Public()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
	}
}
