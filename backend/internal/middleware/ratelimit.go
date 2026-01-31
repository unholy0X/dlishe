package middleware

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/dishflow/backend/internal/pkg/response"
)

// RateLimiter provides rate limiting functionality
type RateLimiter struct {
	redis *redis.Client
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(redisClient *redis.Client) *RateLimiter {
	return &RateLimiter{
		redis: redisClient,
	}
}

// RateLimitConfig defines rate limit parameters
type RateLimitConfig struct {
	MaxRequests int           // Maximum requests allowed
	Window      time.Duration // Time window
	KeyPrefix   string        // Redis key prefix
}

// Public rate limiter for public endpoints (by IP)
func (rl *RateLimiter) Public() func(http.Handler) http.Handler {
	config := RateLimitConfig{
		MaxRequests: 100,
		Window:      time.Minute,
		KeyPrefix:   "ratelimit:public",
	}
	return rl.limit(config, getIPIdentifier)
}

// General rate limiter for authenticated endpoints
func (rl *RateLimiter) General() func(http.Handler) http.Handler {
	config := RateLimitConfig{
		MaxRequests: 120, // Default for free users
		Window:      time.Minute,
		KeyPrefix:   "ratelimit:general",
	}
	return rl.limit(config, getUserIdentifier)
}

// VideoExtraction rate limiter for video extraction endpoints
func (rl *RateLimiter) VideoExtraction() func(http.Handler) http.Handler {
	config := RateLimitConfig{
		MaxRequests: 5,
		Window:      time.Hour,
		KeyPrefix:   "ratelimit:video",
	}
	return rl.limit(config, getUserIdentifier)
}

// limit is the core rate limiting middleware
func (rl *RateLimiter) limit(config RateLimitConfig, identifierFunc func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			identifier := identifierFunc(r)

			// Build Redis key
			key := fmt.Sprintf("%s:%s", config.KeyPrefix, identifier)

			// Check current count
			count, err := rl.redis.Get(ctx, key).Int()
			if err != nil && err != redis.Nil {
				// Redis error - allow request but log error
				next.ServeHTTP(w, r)
				return
			}

			// Check if limit exceeded
			if count >= config.MaxRequests {
				// Get TTL for Retry-After header
				ttl, _ := rl.redis.TTL(ctx, key).Result()
				retryAfter := int(ttl.Seconds())
				if retryAfter <= 0 {
					retryAfter = int(config.Window.Seconds())
				}

				// Set rate limit headers
				w.Header().Set("X-RateLimit-Limit", strconv.Itoa(config.MaxRequests))
				w.Header().Set("X-RateLimit-Remaining", "0")
				w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(ttl).Unix(), 10))
				w.Header().Set("Retry-After", strconv.Itoa(retryAfter))

				response.ErrorJSON(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED",
					fmt.Sprintf("Rate limit exceeded. Try again in %d seconds.", retryAfter),
					map[string]interface{}{
						"retryAfter": retryAfter,
					})
				return
			}

			// Increment counter
			pipe := rl.redis.Pipeline()
			pipe.Incr(ctx, key)

			// Set expiry only if this is the first request
			if count == 0 {
				pipe.Expire(ctx, key, config.Window)
			}

			_, err = pipe.Exec(ctx)
			if err != nil {
				// Redis error - allow request but log error
				next.ServeHTTP(w, r)
				return
			}

			// Calculate remaining requests
			remaining := config.MaxRequests - count - 1
			if remaining < 0 {
				remaining = 0
			}

			// Set rate limit headers
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(config.MaxRequests))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(config.Window).Unix(), 10))

			next.ServeHTTP(w, r)
		})
	}
}

// getIPIdentifier extracts IP address from request
func getIPIdentifier(r *http.Request) string {
	// Check X-Forwarded-For header first (for proxies)
	ip := r.Header.Get("X-Forwarded-For")
	if ip != "" {
		return ip
	}

	// Check X-Real-IP header
	ip = r.Header.Get("X-Real-IP")
	if ip != "" {
		return ip
	}

	// Fall back to RemoteAddr (strip port)
	ip = r.RemoteAddr
	// Remove port if present (format is "IP:port")
	if idx := strings.LastIndex(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}
	return ip
}

// getUserIdentifier extracts user ID from request context
func getUserIdentifier(r *http.Request) string {
	// Try to get user ID from context (set by auth middleware)
	if userID := r.Context().Value("userID"); userID != nil {
		return fmt.Sprintf("user:%v", userID)
	}

	// Fall back to IP if no user ID
	return fmt.Sprintf("ip:%s", getIPIdentifier(r))
}
