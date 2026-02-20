package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/getsentry/sentry-go"

	"github.com/dishflow/backend/internal/pkg/response"
)

// Recover is a middleware that recovers from panics, logs them, reports them
// to Sentry (when configured), and returns a 500 to the client.
func Recover(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					stack := debug.Stack()

					logger.Error("Panic recovered",
						slog.Any("error", err),
						slog.String("stack", string(stack)),
						slog.String("method", r.Method),
						slog.String("path", r.URL.Path),
					)

					// Report to Sentry with request context.
					// sentry.RecoverWithContext is a no-op when Sentry is not initialised.
					sentry.CurrentHub().RecoverWithContext(r.Context(), err)
					sentry.Flush(2 * time.Second)

					response.InternalError(w)
				}
			}()

			next.ServeHTTP(w, r)
		})
	}
}
