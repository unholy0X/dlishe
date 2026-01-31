package router

import (
	"database/sql"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"

	"github.com/dishflow/backend/internal/config"
	"github.com/dishflow/backend/internal/handler"
	"github.com/dishflow/backend/internal/middleware"
)

// New creates a new router with all routes configured
func New(cfg *config.Config, logger *slog.Logger, db *sql.DB, redis *redis.Client) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(logger))
	r.Use(middleware.Recover(logger))
	r.Use(middleware.CORS(cfg.CORSOrigins))

	// Health checks (no auth required)
	healthHandler := handler.NewHealthHandler(db, redis)
	r.Get("/health", healthHandler.Health)
	r.Get("/ready", healthHandler.Ready)

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public info endpoint
		r.Get("/info", healthHandler.Info)

		// Auth routes (no auth required)
		r.Route("/auth", func(r chi.Router) {
			// TODO: Add auth handlers
			r.Post("/anonymous", placeholderHandler("anonymous auth"))
			r.Post("/register", placeholderHandler("register"))
			r.Post("/login", placeholderHandler("login"))
			r.Post("/logout", placeholderHandler("logout"))
			r.Post("/refresh", placeholderHandler("refresh token"))
		})

		// Protected routes (TODO: add auth middleware)
		r.Group(func(r chi.Router) {
			// TODO: r.Use(middleware.Auth(cfg.JWTSecret))

			// User routes
			r.Route("/users", func(r chi.Router) {
				r.Get("/me", placeholderHandler("get user"))
				r.Patch("/me", placeholderHandler("update user"))
				r.Delete("/me", placeholderHandler("delete user"))
			})

			// Recipe routes
			r.Route("/recipes", func(r chi.Router) {
				r.Get("/", placeholderHandler("list recipes"))
				r.Post("/", placeholderHandler("create recipe"))
				r.Get("/shared-with-me", placeholderHandler("shared recipes"))
				r.Post("/generate", placeholderHandler("generate recipe"))
				r.Post("/generate-from-ingredients", placeholderHandler("generate from ingredients"))

				r.Route("/{recipeID}", func(r chi.Router) {
					r.Get("/", placeholderHandler("get recipe"))
					r.Put("/", placeholderHandler("update recipe"))
					r.Delete("/", placeholderHandler("delete recipe"))
					r.Post("/favorite", placeholderHandler("favorite recipe"))
					r.Delete("/favorite", placeholderHandler("unfavorite recipe"))
					r.Post("/share", placeholderHandler("share recipe"))
					r.Post("/save-shared", placeholderHandler("save shared recipe"))
					r.Delete("/shares/{shareID}", placeholderHandler("revoke share"))
				})
			})

			// Video extraction routes
			r.Route("/video", func(r chi.Router) {
				r.Post("/extract", placeholderHandler("extract recipe from video"))
			})

			// Job routes
			r.Route("/jobs", func(r chi.Router) {
				r.Get("/", placeholderHandler("list jobs"))
				r.Get("/{jobID}", placeholderHandler("get job"))
				r.Get("/{jobID}/stream", placeholderHandler("stream job"))
				r.Post("/{jobID}/cancel", placeholderHandler("cancel job"))
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
