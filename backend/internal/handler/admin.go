package handler

import (
	"crypto/subtle"
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
)

// AdminHandler handles admin-only endpoints
type AdminHandler struct {
	db          *sql.DB
	apiKey      string
	adminEmails []string
}

// NewAdminHandler creates a new admin handler
func NewAdminHandler(db *sql.DB, apiKey string, adminEmails []string) *AdminHandler {
	return &AdminHandler{db: db, apiKey: apiKey, adminEmails: adminEmails}
}

// requireAPIKey checks the Authorization header for the admin API key
func (h *AdminHandler) requireAPIKey(w http.ResponseWriter, r *http.Request) bool {
	if h.apiKey == "" {
		response.Forbidden(w, "Admin API key not configured")
		return false
	}
	auth := r.Header.Get("Authorization")
	key := strings.TrimPrefix(auth, "Bearer ")
	if subtle.ConstantTimeCompare([]byte(key), []byte(h.apiKey)) != 1 {
		response.Unauthorized(w, "Invalid admin API key")
		return false
	}
	return true
}

// Stats handles GET /api/v1/admin/stats
func (h *AdminHandler) Stats(w http.ResponseWriter, r *http.Request) {
	if !h.requireAPIKey(w, r) {
		return
	}

	ctx := r.Context()
	stats := make(map[string]interface{})

	// Users
	var totalUsers, anonymousUsers, registeredUsers int
	h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL`).Scan(&totalUsers)
	h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND is_anonymous = true`).Scan(&anonymousUsers)
	registeredUsers = totalUsers - anonymousUsers

	stats["users"] = map[string]interface{}{
		"total":      totalUsers,
		"registered": registeredUsers,
		"anonymous":  anonymousUsers,
	}

	// Subscriptions
	var freeUsers, proUsers int
	h.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM users u
		LEFT JOIN user_subscriptions s ON u.id = s.user_id
		WHERE u.deleted_at IS NULL AND (s.entitlement IS NULL OR s.entitlement = 'free')
	`).Scan(&freeUsers)
	h.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM user_subscriptions
		WHERE entitlement = 'pro' AND is_active = true
	`).Scan(&proUsers)

	stats["subscriptions"] = map[string]interface{}{
		"free": freeUsers,
		"pro":  proUsers,
	}

	// Recipes
	var totalRecipes, publicRecipes int
	h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM recipes WHERE deleted_at IS NULL`).Scan(&totalRecipes)
	h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM recipes WHERE deleted_at IS NULL AND is_public = true`).Scan(&publicRecipes)

	stats["recipes"] = map[string]interface{}{
		"total":  totalRecipes,
		"public": publicRecipes,
	}

	// Extractions this month
	var extractionsThisMonth, completedThisMonth, failedThisMonth int
	monthStart := time.Now().Format("2006-01-01")
	h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM video_jobs WHERE created_at >= date_trunc('month', $1::date)`, monthStart).Scan(&extractionsThisMonth)
	h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM video_jobs WHERE status = 'completed' AND completed_at >= date_trunc('month', $1::date)`, monthStart).Scan(&completedThisMonth)
	h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM video_jobs WHERE status = 'failed' AND completed_at >= date_trunc('month', $1::date)`, monthStart).Scan(&failedThisMonth)

	// Extractions by type this month
	var byType []map[string]interface{}
	rows, err := h.db.QueryContext(ctx, `
		SELECT job_type, COUNT(*) as cnt
		FROM video_jobs
		WHERE created_at >= date_trunc('month', $1::date)
		GROUP BY job_type ORDER BY cnt DESC
	`, monthStart)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var jobType string
			var count int
			if rows.Scan(&jobType, &count) == nil {
				byType = append(byType, map[string]interface{}{"type": jobType, "count": count})
			}
		}
	}

	stats["extractions"] = map[string]interface{}{
		"thisMonth": extractionsThisMonth,
		"completed": completedThisMonth,
		"failed":    failedThisMonth,
		"pending":   extractionsThisMonth - completedThisMonth - failedThisMonth,
		"byType":    byType,
	}

	// Pantry
	var totalPantryItems int
	h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM pantry_items WHERE deleted_at IS NULL`).Scan(&totalPantryItems)

	stats["pantry"] = map[string]interface{}{
		"totalItems": totalPantryItems,
	}

	// Shopping
	var totalLists, activeLists int
	h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM shopping_lists WHERE deleted_at IS NULL`).Scan(&totalLists)
	h.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM shopping_lists WHERE deleted_at IS NULL AND is_archived = false`).Scan(&activeLists)

	stats["shopping"] = map[string]interface{}{
		"totalLists":  totalLists,
		"activeLists": activeLists,
	}

	// Per-user breakdown
	var userBreakdown []map[string]interface{}
	userRows, err := h.db.QueryContext(ctx, `
		SELECT
			u.id::text,
			COALESCE(u.email, u.device_id, 'unknown') as identifier,
			u.is_anonymous,
			COALESCE(s.entitlement, 'free') as tier,
			u.created_at,
			(SELECT COUNT(*) FROM recipes WHERE user_id = u.id AND deleted_at IS NULL) as recipes,
			(SELECT COUNT(*) FROM video_jobs WHERE user_id = u.id AND status = 'completed'
				AND completed_at >= date_trunc('month', $1::date)) as extractions_this_month,
			(SELECT COUNT(*) FROM video_jobs WHERE user_id = u.id AND status = 'completed') as extractions_total,
			(SELECT COUNT(*) FROM pantry_items WHERE user_id = u.id AND deleted_at IS NULL) as pantry_items,
			(SELECT COUNT(*) FROM shopping_lists WHERE user_id = u.id AND deleted_at IS NULL) as shopping_lists
		FROM users u
		LEFT JOIN user_subscriptions s ON u.id = s.user_id
		WHERE u.deleted_at IS NULL
		ORDER BY extractions_total DESC, u.created_at DESC
	`, monthStart)
	if err == nil {
		defer userRows.Close()
		for userRows.Next() {
			var (
				id, identifier, tier           string
				isAnonymous                    bool
				createdAt                      time.Time
				recipes, extMonth, extTotal    int
				pantryItems, shoppingLists     int
			)
			if userRows.Scan(&id, &identifier, &isAnonymous, &tier, &createdAt,
				&recipes, &extMonth, &extTotal, &pantryItems, &shoppingLists) == nil {
				// Override tier for admin emails
				email := identifier
				if model.IsAdminEmail(&email, h.adminEmails) {
					tier = "admin"
				}
				userBreakdown = append(userBreakdown, map[string]interface{}{
					"id":                    id,
					"email":                 identifier,
					"isAnonymous":           isAnonymous,
					"tier":                  tier,
					"joinedAt":              createdAt,
					"recipes":               recipes,
					"extractionsThisMonth":  extMonth,
					"extractionsTotal":      extTotal,
					"pantryItems":           pantryItems,
					"shoppingLists":         shoppingLists,
				})
			}
		}
	}

	stats["userBreakdown"] = userBreakdown
	stats["generatedAt"] = time.Now().UTC()

	response.OK(w, stats)
}
