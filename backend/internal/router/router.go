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
	httpSwagger "github.com/swaggo/http-swagger"

	"github.com/dishflow/backend/internal/config"
	"github.com/dishflow/backend/internal/handler"
	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/service/ai"
	"github.com/dishflow/backend/internal/service/auth"
	"github.com/dishflow/backend/internal/service/sync"
	"github.com/dishflow/backend/internal/service/video"

	_ "github.com/dishflow/backend/docs" // Swagger docs
)

// New creates a new router with all routes configured
func New(cfg *config.Config, logger *slog.Logger, db *sql.DB, redis *redis.Client) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.Recover(logger))
	r.Use(middleware.CORS(cfg.CorsAllowedOrigins))

	// Swagger UI (only if enabled via config)
	if cfg.EnableSwagger {
		r.Get("/swagger/*", httpSwagger.Handler(
			httpSwagger.URL("/swagger/doc.json"),
			httpSwagger.DeepLinking(true),
			httpSwagger.DocExpansion("list"),
			httpSwagger.DomID("swagger-ui"),
		))
	}

	// Initialize services
	jwtService := auth.NewJWTService(
		cfg.JWTSecret,
		15*time.Minute, // Access token expiry
		7*24*time.Hour, // Refresh token expiry (7 days)
	)
	userRepo := postgres.NewUserRepository(db)

	// Initialize token blacklist for logout/revocation
	tokenBlacklist := auth.NewTokenBlacklist(redis)

	// Initialize handlers
	healthHandler := handler.NewHealthHandler(db, redis)
	authHandler := handler.NewAuthHandler(jwtService, userRepo, tokenBlacklist)

	// Services
	recipeRepo := postgres.NewRecipeRepository(db)
	recipeHandler := handler.NewRecipeHandler(recipeRepo)

	// Initialize AI service
	geminiCtx := context.Background()
	geminiClient, err := ai.NewGeminiClient(geminiCtx, cfg.GeminiAPIKey)
	if err != nil {
		logger.Error("Failed to initialize Gemini client", "error", err)
	}

	var extractor ai.RecipeExtractor = geminiClient
	var enricher ai.RecipeEnricher = geminiClient // GeminiClient also implements RecipeEnricher

	// Initialize recommendation service (uses same Gemini client)
	var recommender ai.RecipeRecommender
	if geminiClient != nil && geminiClient.IsAvailable(geminiCtx) {
		recommender = ai.NewRecommendationService(geminiClient.GetClient())
	}

	// Initialize extraction cache repository
	extractionCacheRepo := postgres.NewExtractionCacheRepository(db)

	pantryRepo := postgres.NewPantryRepository(db)
	pantryHandler := handler.NewPantryHandler(pantryRepo, geminiClient)

	shoppingRepo := postgres.NewShoppingRepository(db)
	shoppingHandler := handler.NewShoppingHandler(shoppingRepo, recipeRepo, userRepo, geminiClient)

	// Initialize sync service
	syncService := sync.NewService(recipeRepo, pantryRepo, shoppingRepo)
	syncHandler := handler.NewSyncHandler(syncService)

	// Initialize recommendations handler
	recommendationsHandler := handler.NewRecommendationsHandler(recipeRepo, pantryRepo, recommender)

	jobRepo := postgres.NewJobRepository(db)
	downloader := video.NewDownloader(os.TempDir())

	// Unified extraction handler (handles url, image, video extraction with async jobs)
	// Also handles job listing, status, and cancellation
	// Now includes enrichment and caching support
	unifiedExtractionHandler := handler.NewUnifiedExtractionHandler(jobRepo, recipeRepo, extractor, enricher, extractionCacheRepo, downloader, redis, logger)

	// Initialize rate limiter
	rateLimiter := middleware.NewRateLimiter(redis)

	// Public endpoints with rate limiting
	r.With(rateLimiter.Public()).Get("/health", healthHandler.Health)
	r.With(rateLimiter.Public()).Get("/ready", healthHandler.Ready)

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public info endpoint
		r.With(rateLimiter.Public()).Get("/info", healthHandler.Info)

		// Public recipes endpoint (suggested/curated recipes for all users)
		r.With(rateLimiter.Public()).Get("/recipes/suggested", recipeHandler.ListSuggested)

		// Auth routes (no auth required)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/anonymous", authHandler.Anonymous)
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			// Logout requires auth
			r.With(middleware.Auth(jwtService, tokenBlacklist)).Post("/logout", authHandler.Logout)
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(jwtService, tokenBlacklist))
			r.Use(rateLimiter.General()) // Apply general rate limiting to all protected routes

			// User routes
			r.Route("/users", func(r chi.Router) {
				r.Get("/me", authHandler.Me)
				r.Patch("/me/preferences", authHandler.UpdatePreferences)
				r.Patch("/me", placeholderHandler("update user"))
				r.Delete("/me", placeholderHandler("delete user"))
			})

			// Recipe routes
			r.Route("/recipes", func(r chi.Router) {
				r.Get("/", recipeHandler.List)
				r.Post("/", recipeHandler.Create)
				r.Post("/generate", placeholderHandler("generate recipe"))
				r.Post("/generate-from-ingredients", placeholderHandler("generate from ingredients"))

				// Recipe recommendations based on pantry items
				r.Get("/recommendations", recommendationsHandler.GetRecommendations)

				// Unified extraction endpoint (AI-powered, async job pattern)
				// Supports: url, image, video extraction with consistent job-based response
				r.With(rateLimiter.VideoExtraction()).Post("/extract", unifiedExtractionHandler.Extract)

				r.Route("/{recipeID}", func(r chi.Router) {
					r.Get("/", recipeHandler.Get)
					r.Put("/", recipeHandler.Update)
					r.Delete("/", recipeHandler.Delete)
					r.Post("/favorite", recipeHandler.ToggleFavorite)
					r.Post("/save", recipeHandler.Clone) // Clone/save recipe to user's collection

					// Sharing - TODO: Implement later
					r.Post("/share", placeholderHandler("share recipe"))
					r.Delete("/shares/{shareID}", placeholderHandler("revoke share"))
				})
			})

			// Job routes (extraction job tracking)
			r.Route("/jobs", func(r chi.Router) {
				r.Get("/", unifiedExtractionHandler.ListJobs)
				r.Get("/{jobID}", unifiedExtractionHandler.GetJob)
				r.Get("/{jobID}/stream", placeholderHandler("stream job")) // TODO: Implement SSE
				r.Post("/{jobID}/cancel", unifiedExtractionHandler.CancelJob)
			})

			// Pantry routes
			r.Route("/pantry", func(r chi.Router) {
				r.Get("/", pantryHandler.List)
				r.Post("/", pantryHandler.Create)
				r.Get("/expiring", pantryHandler.GetExpiring)
				r.Get("/{id}", pantryHandler.Get)
				r.Put("/{id}", pantryHandler.Update)
				r.Delete("/{id}", pantryHandler.Delete)
				r.With(rateLimiter.VideoExtraction()).Post("/scan", pantryHandler.Scan) // AI-powered, stricter rate limit
				r.Get("/restock-suggestions", placeholderHandler("restock suggestions"))
			})

			// Shopping list routes
			r.Route("/shopping-lists", func(r chi.Router) {
				r.Get("/", shoppingHandler.ListLists)
				r.Post("/", shoppingHandler.CreateList)
				r.Post("/smart-merge", shoppingHandler.SmartMergeList)

				r.Route("/{id}", func(r chi.Router) {
					r.Get("/", shoppingHandler.GetList)
					r.Put("/", shoppingHandler.UpdateList)
					r.Delete("/", shoppingHandler.DeleteList)
					r.Post("/archive", shoppingHandler.ArchiveList)
					r.Post("/add-from-recipe", shoppingHandler.AddFromRecipe)

					// Items
					r.Get("/items", shoppingHandler.ListItems)
					r.Post("/items", shoppingHandler.CreateItem)
					r.Put("/items/{itemId}", shoppingHandler.UpdateItem)
					r.Delete("/items/{itemId}", shoppingHandler.DeleteItem)
					r.Post("/items/{itemId}/check", shoppingHandler.ToggleItemChecked)
					r.Post("/complete", shoppingHandler.CompleteList)
					// Supervised Add
					r.Post("/add-from-recipe", shoppingHandler.AddFromRecipe)
				})
			})

			// Sync routes
			r.Post("/sync", syncHandler.Sync)

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
