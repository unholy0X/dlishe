package main

// @title DLISHE API
// @version 1.0
// @description Recipe management API with AI-powered extraction, pantry tracking, and shopping lists
// @termsOfService https://dlishe.com/terms

// @contact.name DLISHE Support
// @contact.email contact@dlishe.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host api.dlishe.com
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Enter: Bearer {your_token}

// @tag.name Auth
// @tag.description Authentication endpoints (register, login, token refresh)
// @tag.name Recipes
// @tag.description Recipe CRUD and AI extraction
// @tag.name Pantry
// @tag.description Pantry inventory management and AI scanning
// @tag.name Shopping
// @tag.description Shopping list management
// @tag.name Jobs
// @tag.description Video extraction job tracking
// @tag.name Sync
// @tag.description Multi-device synchronization
// @tag.name Health
// @tag.description Health check and API info endpoints

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/getsentry/sentry-go"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/redis/go-redis/v9"
	"gopkg.in/natefinch/lumberjack.v2"

	"github.com/dishflow/backend/internal/config"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/router"
	"github.com/dishflow/backend/internal/service/cleanup"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialise Sentry as early as possible so panics during startup are captured.
	// When SENTRY_DSN is empty the SDK is a no-op — no network calls are made.
	if cfg.SentryDSN != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              cfg.SentryDSN,
			Environment:      cfg.Environment,
			TracesSampleRate: 0.1, // capture 10 % of traces for performance
			EnableTracing:    true,
		}); err != nil {
			// Non-fatal — log and continue. The app runs fine without Sentry.
			fmt.Fprintf(os.Stderr, "sentry.Init failed: %v\n", err)
		} else {
			// Flush buffered events before the process exits.
			defer sentry.Flush(2 * time.Second)
		}
	}

	// Setup logger
	logLevel := slog.LevelInfo
	if cfg.LogLevel == "debug" {
		logLevel = slog.LevelDebug
	}

	// Configure file rotation logging
	fileLogger := &lumberjack.Logger{
		Filename:   "logs/dlishe-backend.jsonl",
		MaxSize:    500, // megabytes
		MaxBackups: 3,
		MaxAge:     7, // days
		Compress:   true,
	}

	// Log to both file and stdout
	w := io.MultiWriter(os.Stdout, fileLogger)

	logger := slog.New(slog.NewJSONHandler(w, &slog.HandlerOptions{
		Level: logLevel,
	}))
	slog.SetDefault(logger)

	logger.Info("Starting DLISHE API server",
		slog.String("port", cfg.Port),
		slog.Bool("mock_mode", cfg.IsMockMode()),
	)

	// Connect to PostgreSQL
	// Connect to PostgreSQL
	db, err := connectPostgres(cfg)
	if err != nil {
		logger.Error("Failed to connect to PostgreSQL", slog.Any("error", err))
		os.Exit(1)
	}
	defer db.Close()
	logger.Info("Connected to PostgreSQL")

	// Connect to Redis
	redisClient, err := connectRedis(cfg.RedisURL)
	if err != nil {
		logger.Error("Failed to connect to Redis", slog.Any("error", err))
		os.Exit(1)
	}
	defer redisClient.Close()
	logger.Info("Connected to Redis")

	// Initialize Clerk with secret key
	clerk.SetKey(cfg.ClerkSecretKey)

	// Create router
	r := router.New(cfg, logger, db, redisClient)

	// Start cleanup worker if enabled
	var cleanupCancel context.CancelFunc
	if cfg.CleanupEnabled {
		cleanupCtx, cancel := context.WithCancel(context.Background())
		cleanupCancel = cancel

		// Parse durations
		cleanupInterval, err := time.ParseDuration(cfg.CleanupInterval)
		if err != nil {
			logger.Warn("Invalid cleanup interval, using default",
				slog.String("value", cfg.CleanupInterval),
				slog.String("default", "5m"))
			cleanupInterval = 5 * time.Minute
		}

		maxJobAge, err := time.ParseDuration(cfg.CleanupMaxJobAge)
		if err != nil {
			logger.Warn("Invalid max job age, using default",
				slog.String("value", cfg.CleanupMaxJobAge),
				slog.String("default", "35m"))
			maxJobAge = 35 * time.Minute
		}

		// Import cleanup service
		cleanupService := cleanup.NewService(
			postgres.NewJobRepository(db),
			logger,
			cleanup.Config{
				TempDir:         cfg.CleanupTempDir,
				MaxJobAge:       maxJobAge,
				CleanupInterval: cleanupInterval,
			},
		)

		// Start cleanup worker in background
		go cleanupService.Start(cleanupCtx)
		logger.Info("Cleanup worker started",
			slog.Duration("interval", cleanupInterval),
			slog.Duration("max_job_age", maxJobAge))
	}

	// Create HTTP server
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second, // Longer for SSE streaming
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Server listening", slog.String("addr", server.Addr))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("Server error", slog.Any("error", err))
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Stop cleanup worker first if it's running
	if cleanupCancel != nil {
		logger.Info("Stopping cleanup worker...")
		cleanupCancel()
	}

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Error("Server forced to shutdown", slog.Any("error", err))
	}

	logger.Info("Server stopped")
}

func connectPostgres(cfg *config.Config) (*sql.DB, error) {
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open connection: %w", err)
	}

	// Configure connection pool for production load
	// CRITICAL: With video extraction (30s+), SSE polling (500ms), and concurrent users,
	// connection limits must be tuned to the environment.
	db.SetMaxOpenConns(cfg.DatabaseMaxOpenConns)
	db.SetMaxIdleConns(cfg.DatabaseMaxIdleConns)
	db.SetConnMaxLifetime(cfg.DatabaseConnMaxLifetime)
	db.SetConnMaxIdleTime(5 * time.Minute) // Close truly idle connections
	db.SetConnMaxIdleTime(5 * time.Minute) // Close truly idle connections

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func connectRedis(redisURL string) (*redis.Client, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	client := redis.NewClient(opt)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping Redis: %w", err)
	}

	return client, nil
}
