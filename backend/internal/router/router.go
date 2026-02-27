package router

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
	httpSwagger "github.com/swaggo/http-swagger"

	"github.com/dishflow/backend/internal/config"
	"github.com/dishflow/backend/internal/handler"
	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/service/ai"
	"github.com/dishflow/backend/internal/service/cookidoo"
	"github.com/dishflow/backend/internal/service/revenuecat"
	"github.com/dishflow/backend/internal/service/sync"
	"github.com/dishflow/backend/internal/service/thumbnail"
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
	r.Use(middleware.MaxBodySize(52 << 20)) // 52MB global cap (extraction allows up to 50MB multipart)

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
	userRepo := postgres.NewUserRepository(db)

	// Initialize middleware
	clerkMiddleware := middleware.NewClerkMiddleware(userRepo, logger, cfg.DemoToken, cfg.DemoUserEmail)

	// Initialize handlers
	healthHandler := handler.NewHealthHandler(db, redis)
	authHandler := handler.NewAuthHandler(userRepo)
	adminHandler := handler.NewAdminHandler(db, cfg.AdminAPIKey, cfg.AdminEmails)

	// Services
	recipeRepo := postgres.NewRecipeRepository(db)
	recipeHandler := handler.NewRecipeHandler(recipeRepo, cfg.AdminEmails, cfg.InspiratorEmails)

	// Initialize AI service
	geminiCtx := context.Background()
	geminiClient, err := ai.NewGeminiClient(geminiCtx, cfg.GeminiAPIKey)
	if err != nil {
		logger.Error("Failed to initialize Gemini client", "error", err)
	}

	var extractor ai.RecipeExtractor
	var enricher ai.RecipeEnricher
	if geminiClient != nil {
		extractor = geminiClient
		enricher = geminiClient
	}

	// Initialize recommendation service (uses same Gemini client)
	var recommender ai.RecipeRecommender
	if geminiClient != nil && geminiClient.IsAvailable(geminiCtx) {
		recommender = ai.NewRecommendationService(geminiClient.GetClient())
	}

	// Initialize extraction cache repository
	extractionCacheRepo := postgres.NewExtractionCacheRepository(db)

	pantryRepo := postgres.NewPantryRepository(db)
	var pantryScanner ai.PantryScanner
	if geminiClient != nil {
		pantryScanner = geminiClient
	}
	pantryHandler := handler.NewPantryHandler(pantryRepo, pantryScanner, userRepo, cfg.AdminEmails)

	shoppingRepo := postgres.NewShoppingRepository(db)
	var shoppingAnalyzer ai.ShoppingListAnalyzer
	if geminiClient != nil {
		shoppingAnalyzer = geminiClient
	}
	shoppingHandler := handler.NewShoppingHandler(shoppingRepo, recipeRepo, userRepo, shoppingAnalyzer)

	mealPlanRepo := postgres.NewMealPlanRepository(db)
	mealPlanHandler := handler.NewMealPlanHandler(mealPlanRepo, shoppingRepo, pantryRepo)

	// Initialize sync service
	syncService := sync.NewService(recipeRepo, pantryRepo, shoppingRepo)
	syncHandler := handler.NewSyncHandler(syncService)

	// Initialize recommendations handler
	recommendationsHandler := handler.NewRecommendationsHandler(recipeRepo, pantryRepo, recommender)

	// Thumbnail downloader + handler
	thumbDownloader := thumbnail.NewDownloader(cfg.ThumbnailDir, cfg.BaseURL)
	if err := thumbDownloader.EnsureDir(); err != nil {
		logger.Error("Failed to create thumbnail directory", "error", err)
	}
	thumbnailHandler := handler.NewThumbnailHandler(cfg.ThumbnailDir)

	jobRepo := postgres.NewJobRepository(db)
	downloader := video.NewDownloader(os.TempDir())
	instagramDownloader := video.NewInstagramDownloader(os.TempDir(), cfg.InstagramCookiesPath)
	if instagramDownloader.IsConfigured() {
		logger.Info("Instagram downloader configured", "cookies_path", cfg.InstagramCookiesPath)
	} else {
		logger.Warn("Instagram downloader not configured — Instagram extraction will be unavailable. Set INSTAGRAM_COOKIES_PATH to enable.")
	}

	// Unified extraction handler (handles url, image, video extraction with async jobs)
	// Also handles job listing, status, and cancellation
	// Now includes enrichment and caching support
	unifiedExtractionHandler := handler.NewUnifiedExtractionHandler(jobRepo, recipeRepo, userRepo, extractor, enricher, extractionCacheRepo, downloader, instagramDownloader, thumbDownloader, redis, logger, cfg.AdminEmails, cfg.InspiratorEmails, cfg.MaxConcurrentVideoJobs, cfg.MaxConcurrentLightJobs)

	// Initialize rate limiter
	rateLimiter := middleware.NewRateLimiter(redis)

	// Initialize Cookidoo pool (optional, only if accounts are configured)
	var cookidooPool *cookidoo.Pool
	if len(cfg.CookidooAccounts) > 0 {
		creds := make([]cookidoo.AccountCredentials, len(cfg.CookidooAccounts))
		for i, a := range cfg.CookidooAccounts {
			creds[i] = cookidoo.AccountCredentials{Email: a.Email, Password: a.Password}
		}
		var poolErr error
		cookidooPool, poolErr = cookidoo.NewPool(context.Background(), creds, cfg.CookidooLocale, cfg.CookidooCountry, logger)
		if poolErr != nil {
			logger.Error("Cookidoo pool init failed — Thermomix export will be unavailable", "error", poolErr)
		} else {
			logger.Info("Cookidoo pool initialized", "accounts", len(creds), "locale", cfg.CookidooLocale)
		}
	} else {
		logger.Warn("No COOKIDOO_ACCOUNTS configured — Thermomix export will be unavailable")
	}
	var thermomixHandler *handler.ThermomixHandler
	if cookidooPool != nil && geminiClient != nil {
		thermomixHandler = handler.NewThermomixHandler(recipeRepo, geminiClient, cookidooPool)
		logger.Info("Thermomix export handler initialized")
	}

	// Initialize RevenueCat client (optional, only if secret key is configured)
	var rcClient *revenuecat.Client
	if cfg.RevenueCatSecretKey != "" {
		rcClient = revenuecat.NewClient(cfg.RevenueCatSecretKey)
		logger.Info("RevenueCat API client initialized")
	}

	// Initialize webhook handler
	webhookHandler := handler.NewWebhookHandler(cfg, logger, userRepo, rcClient)

	// Initialize subscription handler
	subscriptionHandler := handler.NewSubscriptionHandler(userRepo, rcClient, logger, cfg.AdminEmails)

	// Public endpoints with rate limiting
	r.With(rateLimiter.Public()).Get("/health", healthHandler.Health)
	r.With(rateLimiter.Public()).Get("/ready", healthHandler.Ready)

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public info endpoint
		r.With(rateLimiter.Public()).Get("/info", healthHandler.Info)

		// Public thumbnail serving
		r.Get("/thumbnails/*", thumbnailHandler.Serve)

		// Public recipes endpoint (suggested/curated recipes for all users)
		r.With(rateLimiter.Public()).Get("/recipes/suggested", recipeHandler.ListSuggested)
		r.With(rateLimiter.Public()).Get("/recipes/featured", recipeHandler.ListFeatured)
		r.With(rateLimiter.Public()).Get("/recipes/search/public", recipeHandler.SearchPublic)

		// Auth routes
		// Deprecated: Login/Register handled by Clerk frontend
		// We can keep specific backend-only auth endpoints if needed, but standard auth is gone.

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(clerkMiddleware.RequireAuth)
			r.Use(rateLimiter.General()) // Apply general rate limiting to all protected routes

			// User routes
			r.Route("/users", func(r chi.Router) {
				r.Get("/me", authHandler.Me)
				r.Patch("/me/preferences", authHandler.UpdatePreferences)
				r.Delete("/me", authHandler.DeleteAccount)
			})

			// Recipe routes
			r.Route("/recipes", func(r chi.Router) {
				r.Get("/", recipeHandler.List)
				r.Get("/search", recipeHandler.Search)
				r.Post("/", recipeHandler.Create)
				r.Delete("/", recipeHandler.DeleteAll)
				r.Get("/recommendations", recommendationsHandler.GetRecommendations)
				r.Post("/extract", unifiedExtractionHandler.Extract)

				r.Route("/{recipeID}", func(r chi.Router) {
					r.Get("/", recipeHandler.Get)
					r.Put("/", recipeHandler.Update)
					r.Delete("/", recipeHandler.Delete)
					r.Post("/favorite", recipeHandler.ToggleFavorite)
					r.Post("/save", recipeHandler.Clone)
					if thermomixHandler != nil {
						r.Post("/export/thermomix", thermomixHandler.Export)
					}
				})
			})

			// Job routes
			r.Route("/jobs", func(r chi.Router) {
				r.Get("/", unifiedExtractionHandler.ListJobs)
				r.Get("/{jobID}", unifiedExtractionHandler.GetJob)
				r.Post("/{jobID}/cancel", unifiedExtractionHandler.CancelJob)
				r.Delete("/{jobID}", unifiedExtractionHandler.DeleteJob)
				r.Delete("/", unifiedExtractionHandler.ClearJobHistory)
			})

			// Pantry routes
			r.Route("/pantry", func(r chi.Router) {
				r.Get("/", pantryHandler.List)
				r.Post("/", pantryHandler.Create)
				r.Get("/{id}", pantryHandler.Get)
				r.Put("/{id}", pantryHandler.Update)
				r.Delete("/{id}", pantryHandler.Delete)
				r.With(rateLimiter.PantryScan()).Post("/scan", pantryHandler.Scan) // AI-powered, dedicated rate limit
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
				})
			})

			// Meal plan routes
			r.Route("/meal-plans", func(r chi.Router) {
				r.Get("/current", mealPlanHandler.GetCurrentWeek)
				r.Get("/week/{date}", mealPlanHandler.GetByWeek)

				r.Route("/{id}", func(r chi.Router) {
					r.Put("/", mealPlanHandler.UpdatePlan)
					r.Post("/entries", mealPlanHandler.AddEntry)
					r.Delete("/entries/{entryId}", mealPlanHandler.RemoveEntry)
					r.Post("/generate-list", mealPlanHandler.GenerateShoppingList)
				})
			})

			// Sync routes
			r.Post("/sync", syncHandler.Sync)

			// Subscription routes
			r.Route("/subscription", func(r chi.Router) {
				r.Get("/", subscriptionHandler.GetSubscription)
				r.Post("/refresh", subscriptionHandler.RefreshSubscription)
			})
		})

		// Admin routes (API key auth)
		r.Get("/admin/stats", adminHandler.Stats)

		// Webhook routes
		r.Route("/webhooks", func(r chi.Router) {
			r.Post("/revenuecat", webhookHandler.HandleRevenueCat)
		})
	})

	return r
}
