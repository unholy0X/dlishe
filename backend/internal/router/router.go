package router

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"

	"github.com/dishflow/backend/internal/config"
	"github.com/dishflow/backend/internal/handler"
	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/service/ai"
	"github.com/dishflow/backend/internal/service/auth"
	"github.com/dishflow/backend/internal/service/video"
)

// New creates a new router with all routes configured
func New(cfg *config.Config, logger *slog.Logger, db *sql.DB, redis *redis.Client) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.Recover(logger))
	r.Use(middleware.CORS(cfg.CORSOrigins))

	// Initialize services
	jwtService := auth.NewJWTService(
		cfg.JWTSecret,
		15*time.Minute, // Access token expiry
		7*24*time.Hour, // Refresh token expiry (7 days)
	)
	userRepo := postgres.NewUserRepository(db)

	// Initialize handlers
	healthHandler := handler.NewHealthHandler(db, redis)
	authHandler := handler.NewAuthHandler(jwtService, userRepo)

	// Services
	recipeRepo := postgres.NewRecipeRepository(db)
	recipeHandler := handler.NewRecipeHandler(recipeRepo)

	jobRepo := postgres.NewJobRepository(db)

	// Initialize AI service
	geminiCtx := context.Background()
	geminiClient, err := ai.NewGeminiClient(geminiCtx, cfg.GeminiAPIKey)
	if err != nil {
		logger.Error("Failed to initialize Gemini client", "error", err)
		// We can continue, but AI features will fail.
		// Or we can use a mock if we had one implementing the interface.
	}

	var extractor ai.RecipeExtractor = geminiClient
	// If initialization failed, we might want a no-op or error-returning implementation,
	// but for now let's assume it works or we panic provided it's critical.
	// The original code has graceful shutdown so panic might be okay for startup errors if critical.
	// But let's just log. videoHandler will fail if extractor is nil, so let's check in handler or here.

	downloader := video.NewDownloader(os.TempDir())
	videoHandler := handler.NewVideoHandler(jobRepo, recipeRepo, extractor, downloader, logger)
	r.Get("/health", healthHandler.Health)
	r.Get("/ready", healthHandler.Ready)

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public info endpoint
		r.Get("/info", healthHandler.Info)

		// Auth routes (no auth required)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/anonymous", authHandler.Anonymous)
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			// Logout requires auth
			r.With(middleware.Auth(jwtService)).Post("/logout", authHandler.Logout)
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtService))

			// User routes
			r.Route("/users", func(r chi.Router) {
				r.Get("/me", authHandler.Me)
				r.Patch("/me", placeholderHandler("update user"))
				r.Delete("/me", placeholderHandler("delete user"))
			})

			// Recipe routes
			r.Route("/recipes", func(r chi.Router) {
				r.Get("/", recipeHandler.List)
				r.Post("/", recipeHandler.Create)
				// r.Get("/shared-with-me", placeholderHandler("shared recipes")) // TODO: Implement shared recipes
				r.Post("/generate", placeholderHandler("generate recipe"))
				r.Post("/generate-from-ingredients", placeholderHandler("generate from ingredients"))

				r.Route("/{recipeID}", func(r chi.Router) {
					r.Get("/", recipeHandler.Get)
					r.Put("/", recipeHandler.Update)
					r.Delete("/", recipeHandler.Delete)
					r.Post("/favorite", recipeHandler.ToggleFavorite)
					// r.Delete("/favorite", recipeHandler.ToggleFavorite) // Handled by generic toggle mainly, but kept flexible

					// Sharing - Todo later
					r.Post("/share", placeholderHandler("share recipe"))
					r.Post("/save-shared", placeholderHandler("save shared recipe"))
					r.Delete("/shares/{shareID}", placeholderHandler("revoke share"))
				})
			})

			// Video extraction routes
			r.Route("/video", func(r chi.Router) {
				r.Post("/extract", videoHandler.Extract)
			})

			// Job routes
			r.Route("/jobs", func(r chi.Router) {
				r.Get("/", videoHandler.ListJobs)
				r.Get("/{jobID}", videoHandler.GetJob)
				r.Get("/{jobID}/stream", placeholderHandler("stream job")) // TODO: Implement SSE
				r.Post("/{jobID}/cancel", videoHandler.CancelJob)
			})

			// Pantry routes
			r.Route("/pantry", func(r chi.Router) {
				r.Post("/scan", placeholderHandler("scan pantry"))
				r.Get("/restock-suggestions", placeholderHandler("restock suggestions"))
				r.Get("/expiring", placeholderHandler("expiring items"))
			})

			// Shopping list routes
			r.Route("/shopping-lists", func(r chi.Router) {
				r.Get("/suggestions", placeholderHandler("shopping suggestions"))
				r.Post("/{listID}/add-from-recipe", placeholderHandler("add from recipe"))
			})

			// Sync routes
			r.Post("/sync", placeholderHandler("sync"))

			// Subscription routes
			r.Route("/subscription", func(r chi.Router) {
				r.Get("/", placeholderHandler("get subscription"))
				r.Post("/refresh", placeholderHandler("refresh subscription"))
			})

			// Upload routes
			r.Route("/uploads", func(r chi.Router) {
				r.Post("/image", placeholderHandler("upload image"))
				r.Post("/presign", placeholderHandler("presign upload"))
			})
		})

		// Webhook routes (server-to-server, different auth)
		r.Route("/webhooks", func(r chi.Router) {
			r.Post("/revenuecat", placeholderHandler("revenuecat webhook"))
		})
	})

	return r
}

// placeholderHandler returns a handler that responds with "not implemented"
func placeholderHandler(name string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotImplemented)
		w.Write([]byte(`{"error":{"code":"NOT_IMPLEMENTED","message":"` + name + ` endpoint not implemented yet"}}`))
	}
}
