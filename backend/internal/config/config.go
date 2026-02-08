package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	// Server
	Port     string
	LogLevel string

	// Database
	// Database
	DatabaseURL             string
	DatabaseMaxOpenConns    int
	DatabaseMaxIdleConns    int
	DatabaseConnMaxLifetime time.Duration

	// Redis
	RedisURL string

	// JWT
	JWTSecret        string
	JWTAccessExpiry  time.Duration
	JWTRefreshExpiry time.Duration

	// Gemini
	GeminiAPIKey   string
	GeminiMockMode bool

	// CORS
	CorsAllowedOrigins string

	// RevenueCat
	RevenueCatSecretKey     string
	RevenueCatWebhookSecret string

	// Storage
	StorageBucket    string
	StorageEndpoint  string
	StorageAccessKey string
	StorageSecretKey string

	// Clerk configuration
	ClerkPublishableKey string
	ClerkSecretKey      string

	// Cleanup worker configuration
	CleanupEnabled   bool   // Enable background cleanup worker
	CleanupInterval  string // How often to run cleanup (e.g., "5m")
	CleanupMaxJobAge string // Max age for stuck jobs (e.g., "35m")
	CleanupTempDir   string // Directory for temp files

	// Concurrency limits
	MaxConcurrentVideoJobs int // Max parallel video extraction jobs
	MaxConcurrentLightJobs int // Max parallel URL/image extraction jobs

	// Swagger documentation
	EnableSwagger bool // Enable Swagger UI at /swagger/

	// Admin configuration — comma-separated list of admin emails
	AdminEmails []string
	AdminAPIKey string // Simple API key for admin endpoints (curl-friendly)
}

// Load creates a Config from environment variables
func Load() *Config {
	return &Config{
		// Server
		Port:     getEnv("PORT", "8080"),
		LogLevel: getEnv("LOG_LEVEL", "info"),

		// Database
		// Database
		DatabaseURL:             getEnv("DATABASE_URL", "postgres://dlishe:dlishe@localhost:5432/dlishe?sslmode=disable"),
		DatabaseMaxOpenConns:    getIntEnv("DATABASE_MAX_OPEN_CONNS", 100),
		DatabaseMaxIdleConns:    getIntEnv("DATABASE_MAX_IDLE_CONNS", 25),
		DatabaseConnMaxLifetime: getDurationEnv("DATABASE_CONN_MAX_LIFETIME", 15*time.Minute),

		// Redis
		RedisURL: getEnv("REDIS_URL", "redis://localhost:6379"),

		// JWT
		JWTSecret:        getEnv("JWT_SECRET", "dev-secret-must-be-at-least-32-characters-long"),
		JWTAccessExpiry:  getDurationEnv("JWT_ACCESS_EXPIRY", 15*time.Minute),
		JWTRefreshExpiry: getDurationEnv("JWT_REFRESH_EXPIRY", 720*time.Hour), // 30 days

		// Gemini
		GeminiAPIKey:   getEnv("GEMINI_API_KEY", "mock"),
		GeminiMockMode: getBoolEnv("GEMINI_MOCK_MODE", true),

		// CORS
		CorsAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "*"),

		// RevenueCat
		RevenueCatSecretKey:     getEnv("REVENUECAT_SECRET_KEY", ""),
		RevenueCatWebhookSecret: getEnv("REVENUECAT_WEBHOOK_SECRET", ""),

		// Storage
		StorageBucket:    getEnv("STORAGE_BUCKET", "dlishe-assets"),
		StorageEndpoint:  getEnv("STORAGE_ENDPOINT", ""),
		StorageAccessKey: getEnv("STORAGE_ACCESS_KEY", ""),
		StorageSecretKey: getEnv("STORAGE_SECRET_KEY", ""),

		// Clerk
		ClerkPublishableKey: getEnv("CLERK_PUBLISHABLE_KEY", ""),
		ClerkSecretKey:      getEnv("CLERK_SECRET_KEY", ""),

		// Cleanup worker
		CleanupEnabled:   getBoolEnv("CLEANUP_ENABLED", true),
		CleanupInterval:  getEnv("CLEANUP_INTERVAL", "5m"),
		CleanupMaxJobAge: getEnv("CLEANUP_MAX_JOB_AGE", "35m"),
		CleanupTempDir:   getEnv("CLEANUP_TEMP_DIR", ""),

		// Concurrency
		MaxConcurrentVideoJobs: getIntEnv("MAX_CONCURRENT_VIDEO_JOBS", 20),
		MaxConcurrentLightJobs: getIntEnv("MAX_CONCURRENT_LIGHT_JOBS", 30),

		// Swagger
		EnableSwagger: getBoolEnv("ENABLE_SWAGGER", false),

		// Admin — comma-separated emails, e.g. "alice@example.com,bob@example.com"
		AdminEmails: parseEmailList(getEnv("ADMIN_EMAILS", "")),
		AdminAPIKey: getEnv("ADMIN_API_KEY", ""),
	}
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getBoolEnv gets a boolean environment variable with a default value
func getBoolEnv(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		b, err := strconv.ParseBool(value)
		if err != nil {
			return defaultValue
		}
		return b
	}
	return defaultValue
}

// getDurationEnv gets a duration environment variable with a default value
func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		d, err := time.ParseDuration(value)
		if err != nil {
			return defaultValue
		}
		return d
	}
	return defaultValue
}

// IsMockMode returns true if Gemini should use mock responses
func (c *Config) IsMockMode() bool {
	return c.GeminiMockMode || c.GeminiAPIKey == "" || c.GeminiAPIKey == "mock"
}

// parseEmailList splits a comma-separated string into trimmed, lowercased emails.
// Empty entries are skipped.
func parseEmailList(raw string) []string {
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	emails := make([]string, 0, len(parts))
	for _, p := range parts {
		e := strings.TrimSpace(strings.ToLower(p))
		if e != "" {
			emails = append(emails, e)
		}
	}
	return emails
}

// getIntEnv gets an integer environment variable with a default value
func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		i, err := strconv.Atoi(value)
		if err != nil {
			return defaultValue
		}
		return i
	}
	return defaultValue
}
