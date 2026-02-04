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

// rateLimitScript is an atomic Lua script that:
// 1. Increments the counter
// 2. Sets expiry on first request
// 3. Returns [current_count, ttl]
// This eliminates the race condition between check and increment
var rateLimitScript = redis.NewScript(`
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call("INCR", key)

if current == 1 then
    redis.call("EXPIRE", key, window)
end

local ttl = redis.call("TTL", key)
return {current, ttl}
`)

// limit is the core rate limiting middleware
func (rl *RateLimiter) limit(config RateLimitConfig, identifierFunc func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			identifier := identifierFunc(r)

			// Build Redis key
			key := fmt.Sprintf("%s:%s", config.KeyPrefix, identifier)

			// Execute atomic rate limit script
			// This increments first, then checks - no race condition
			result, err := rateLimitScript.Run(ctx, rl.redis, []string{key},
				config.MaxRequests,
				int(config.Window.Seconds()),
			).Slice()

			if err != nil {
				// Redis error - allow request but log error
				// Consider adding structured logging here
				next.ServeHTTP(w, r)
				return
			}

			// Parse results
			current, _ := result[0].(int64)
			ttl, _ := result[1].(int64)

			// Check if limit exceeded (current is already incremented)
			if current > int64(config.MaxRequests) {
				retryAfter := int(ttl)
				if retryAfter <= 0 {
					retryAfter = int(config.Window.Seconds())
				}

				// Set rate limit headers
				w.Header().Set("X-RateLimit-Limit", strconv.Itoa(config.MaxRequests))
				w.Header().Set("X-RateLimit-Remaining", "0")
				w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(time.Duration(ttl)*time.Second).Unix(), 10))
				w.Header().Set("Retry-After", strconv.Itoa(retryAfter))

				response.ErrorJSON(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED",
					fmt.Sprintf("Rate limit exceeded. Try again in %d seconds.", retryAfter),
					map[string]interface{}{
						"retryAfter": retryAfter,
					})
				return
			}

			// Calculate remaining requests
			remaining := int64(config.MaxRequests) - current
			if remaining < 0 {
				remaining = 0
			}

			// Set rate limit headers
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(config.MaxRequests))
			w.Header().Set("X-RateLimit-Remaining", strconv.FormatInt(remaining, 10))
			w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(time.Now().Add(config.Window).Unix(), 10))

			next.ServeHTTP(w, r)
		})
	}
}

// getIPIdentifier extracts IP address from request
// SECURITY: Properly parses X-Forwarded-For to extract the first (client) IP
// X-Forwarded-For format: "client, proxy1, proxy2, ..."
func getIPIdentifier(r *http.Request) string {
	// Check X-Real-IP header first (set by nginx/Cloudflare/etc)
	// This is generally more secure as it's often overwritten by the proxy
	ip := r.Header.Get("X-Real-IP")
	if ip == "" {
		ip = r.Header.Get("CF-Connecting-IP") // Cloudflare specific
	}
	if ip != "" {
		return stripPort(strings.TrimSpace(ip))
	}

	// Check X-Forwarded-For header
	// X-Forwarded-For: client, proxy1, proxy2
	// WARNING: The left-most IP can be spoofed if the proxy doesn't strip/validate it.
	// Only rely on this if X-Real-IP is missing.
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if ip != "" {
				return stripPort(ip)
			}
		}
	}

	// Fall back to RemoteAddr
	return stripPort(r.RemoteAddr)
}

// stripPort removes the port from an IP address
// Handles both IPv4 (1.2.3.4:8080) and IPv6 ([::1]:8080)
func stripPort(addr string) string {
	// Handle IPv6 with brackets: [::1]:8080
	if strings.HasPrefix(addr, "[") {
		if idx := strings.LastIndex(addr, "]:"); idx != -1 {
			return addr[1:idx] // Return just the IPv6 address without brackets
		}
		// No port, but has brackets: [::1]
		if strings.HasSuffix(addr, "]") {
			return addr[1 : len(addr)-1]
		}
		return addr
	}

	// Handle IPv4: only strip port if there's exactly one colon
	// (IPv6 without brackets has multiple colons)
	if strings.Count(addr, ":") == 1 {
		if idx := strings.LastIndex(addr, ":"); idx != -1 {
			return addr[:idx]
		}
	}

	return addr
}

// getUserIdentifier extracts user ID from request context
func getUserIdentifier(r *http.Request) string {
	// Try to get user ID from context (set by auth middleware)
	if user := GetUserFromContext(r.Context()); user != nil {
		return fmt.Sprintf("user:%v", user.ID)
	}

	// Fall back to IP if no user ID
	return fmt.Sprintf("ip:%s", getIPIdentifier(r))
}
