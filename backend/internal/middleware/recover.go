package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/dishflow/backend/internal/pkg/response"
)

// Recover is a middleware that recovers from panics and returns 500
func Recover(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					// Log the panic with stack trace
					logger.Error("Panic recovered",
						slog.Any("error", err),
						slog.String("stack", string(debug.Stack())),
						slog.String("method", r.Method),
						slog.String("path", r.URL.Path),
					)

					// Return 500 error
					response.InternalError(w)
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}
