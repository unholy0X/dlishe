package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	// Server
	Port     string
	LogLevel string

	// Database
	DatabaseURL string

	// Redis
	RedisURL string

	// JWT
	JWTSecret        string
	JWTAccessExpiry  time.Duration
	JWTRefreshExpiry time.Duration

	// Gemini
	GeminiAPIKey  string
	GeminiMockMode bool

	// CORS
	CORSOrigins string

	// RevenueCat
	RevenueCatSecretKey    string
	RevenueCatWebhookSecret string

	// Storage
	StorageBucket    string
	StorageEndpoint  string
	StorageAccessKey string
	StorageSecretKey string
}

// Load creates a Config from environment variables
func Load() *Config {
	return &Config{
		// Server
		Port:     getEnv("PORT", "8080"),
		LogLevel: getEnv("LOG_LEVEL", "info"),

		// Database
		DatabaseURL: getEnv("DATABASE_URL", "postgres://dishflow:dishflow@localhost:5432/dishflow?sslmode=disable"),

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
		CORSOrigins: getEnv("CORS_ORIGINS", "*"),

		// RevenueCat
		RevenueCatSecretKey:     getEnv("REVENUECAT_SECRET_KEY", ""),
		RevenueCatWebhookSecret: getEnv("REVENUECAT_WEBHOOK_SECRET", ""),

		// Storage
		StorageBucket:    getEnv("STORAGE_BUCKET", "dishflow-assets"),
		StorageEndpoint:  getEnv("STORAGE_ENDPOINT", ""),
		StorageAccessKey: getEnv("STORAGE_ACCESS_KEY", ""),
		StorageSecretKey: getEnv("STORAGE_SECRET_KEY", ""),
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
