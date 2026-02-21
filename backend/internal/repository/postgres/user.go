package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/dishflow/backend/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrUserNotFound       = errors.New("user not found")
	ErrUserAlreadyExists  = errors.New("user already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
)

// UserRepository handles user database operations
type UserRepository struct {
	db *sql.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
	query := `
		INSERT INTO users (id, clerk_id, email, password_hash, name, is_anonymous, device_id, created_at, updated_at, preferred_unit_system, preferred_language)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.ClerkID,
		user.Email,
		user.PasswordHash,
		user.Name,
		user.IsAnonymous,
		user.DeviceID,
		user.CreatedAt,
		user.UpdatedAt,
		user.PreferredUnitSystem,
		user.PreferredLanguage,
	)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			if pgErr.Code == "23505" { // unique_violation
				return ErrUserAlreadyExists
			}
		}
		return err
	}

	return nil
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	query := `
		SELECT id, clerk_id, email, password_hash, name, is_anonymous, device_id, created_at, updated_at, deleted_at, preferred_unit_system, preferred_language
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`

	user := &model.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.ClerkID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.IsAnonymous,
		&user.DeviceID,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
		&user.PreferredUnitSystem,
		&user.PreferredLanguage,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `
		SELECT id, clerk_id, email, password_hash, name, is_anonymous, device_id, created_at, updated_at, deleted_at, preferred_unit_system, preferred_language
		FROM users
		WHERE email = $1 AND deleted_at IS NULL
	`

	user := &model.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.ClerkID,
		&user.Email,
		&user.PasswordHash, // legacy: unused with Clerk auth, kept for schema compatibility
		&user.Name,
		&user.IsAnonymous,
		&user.DeviceID,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
		&user.PreferredUnitSystem,
		&user.PreferredLanguage,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

// GetByDeviceID retrieves an anonymous user by device ID
func (r *UserRepository) GetByDeviceID(ctx context.Context, deviceID string) (*model.User, error) {
	query := `
		SELECT id, clerk_id, email, password_hash, name, is_anonymous, device_id, created_at, updated_at, deleted_at, preferred_unit_system, preferred_language
		FROM users
		WHERE device_id = $1 AND is_anonymous = TRUE AND deleted_at IS NULL
	`

	user := &model.User{}
	err := r.db.QueryRowContext(ctx, query, deviceID).Scan(
		&user.ID,
		&user.ClerkID,
		&user.Email,
		&user.PasswordHash, // legacy: unused with Clerk auth, kept for schema compatibility
		&user.Name,
		&user.IsAnonymous,
		&user.DeviceID,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
		&user.PreferredUnitSystem,
		&user.PreferredLanguage,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

// GetByClerkID retrieves a user by Clerk ID
func (r *UserRepository) GetByClerkID(ctx context.Context, clerkID string) (*model.User, error) {
	query := `
		SELECT id, clerk_id, email, password_hash, name, is_anonymous, device_id, created_at, updated_at, deleted_at, preferred_unit_system, preferred_language
		FROM users
		WHERE clerk_id = $1 AND deleted_at IS NULL
	`

	user := &model.User{}
	err := r.db.QueryRowContext(ctx, query, clerkID).Scan(
		&user.ID,
		&user.ClerkID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.IsAnonymous,
		&user.DeviceID,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.DeletedAt,
		&user.PreferredUnitSystem,
		&user.PreferredLanguage,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

// Update updates a user
func (r *UserRepository) Update(ctx context.Context, user *model.User) error {
	query := `
		UPDATE users
		SET email = $2, password_hash = $3, name = $4, is_anonymous = $5, updated_at = $6, preferred_unit_system = $7, preferred_language = $8
		WHERE id = $1 AND deleted_at IS NULL
	`

	user.UpdatedAt = time.Now().UTC()

	result, err := r.db.ExecContext(ctx, query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.Name,
		user.IsAnonymous,
		user.UpdatedAt,
		user.PreferredUnitSystem,
		user.PreferredLanguage,
	)

	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrUserNotFound
	}

	return nil
}

// UpdateClerkID updates only the clerk_id for a user (used when a Clerk account is re-created)
func (r *UserRepository) UpdateClerkID(ctx context.Context, userID uuid.UUID, clerkID string) error {
	query := `UPDATE users SET clerk_id = $2, updated_at = $3 WHERE id = $1 AND deleted_at IS NULL`
	result, err := r.db.ExecContext(ctx, query, userID, clerkID, time.Now().UTC())
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrUserNotFound
	}
	return nil
}

// SoftDelete soft deletes a user
func (r *UserRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE users
		SET deleted_at = $2, updated_at = $2
		WHERE id = $1 AND deleted_at IS NULL
	`

	now := time.Now().UTC()
	result, err := r.db.ExecContext(ctx, query, id, now)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrUserNotFound
	}

	return nil
}

// GetOrCreateAnonymous gets an existing anonymous user by device ID or creates a new one
func (r *UserRepository) GetOrCreateAnonymous(ctx context.Context, deviceID string) (*model.User, bool, error) {
	// Try to get existing user
	user, err := r.GetByDeviceID(ctx, deviceID)
	if err == nil {
		return user, false, nil // Existing user
	}

	if !errors.Is(err, ErrUserNotFound) {
		return nil, false, err // Other error
	}

	// Create new anonymous user
	user = model.NewAnonymousUser(deviceID)
	if err := r.Create(ctx, user); err != nil {
		// Handle race condition - another request might have created it
		if errors.Is(err, ErrUserAlreadyExists) {
			user, err = r.GetByDeviceID(ctx, deviceID)
			if err != nil {
				return nil, false, err
			}
			return user, false, nil
		}
		return nil, false, err
	}

	return user, true, nil // New user
}

// CreateSubscription creates a default free subscription for a user
func (r *UserRepository) CreateSubscription(ctx context.Context, userID uuid.UUID) error {
	query := `
		INSERT INTO user_subscriptions (user_id, entitlement, is_active, created_at, updated_at)
		VALUES ($1, 'free', TRUE, NOW(), NOW())
		ON CONFLICT (user_id) DO NOTHING
	`

	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}

// GetSubscription retrieves a user's subscription
func (r *UserRepository) GetSubscription(ctx context.Context, userID uuid.UUID) (*model.UserSubscription, error) {
	query := `
		SELECT user_id, entitlement, is_active, product_id, period_type, store,
		       purchased_at, expires_at, cancelled_at, will_renew, has_billing_issue,
		       is_sandbox, last_synced_at, revenuecat_updated_at, created_at, updated_at
		FROM user_subscriptions
		WHERE user_id = $1
	`

	sub := &model.UserSubscription{}
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&sub.UserID,
		&sub.Entitlement,
		&sub.IsActive,
		&sub.ProductID,
		&sub.PeriodType,
		&sub.Store,
		&sub.PurchasedAt,
		&sub.ExpiresAt,
		&sub.CancelledAt,
		&sub.WillRenew,
		&sub.HasBillingIssue,
		&sub.IsSandbox,
		&sub.LastSyncedAt,
		&sub.RevenueCatUpdatedAt,
		&sub.CreatedAt,
		&sub.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Return default free subscription
			return &model.UserSubscription{
				UserID:      userID,
				Entitlement: "free",
				IsActive:    true,
			}, nil
		}
		return nil, err
	}

	return sub, nil
}

// CountUserRecipes counts the number of recipes for a user
func (r *UserRepository) CountUserRecipes(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM recipes WHERE user_id = $1 AND deleted_at IS NULL`

	var count int
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	return count, err
}

// IsEventProcessed checks if a RevenueCat webhook event has already been processed (idempotency).
func (r *UserRepository) IsEventProcessed(ctx context.Context, eventID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM revenuecat_events WHERE event_id = $1)`
	var exists bool
	err := r.db.QueryRowContext(ctx, query, eventID).Scan(&exists)
	return exists, err
}

// LogEvent records a processed RevenueCat webhook event for idempotency.
func (r *UserRepository) LogEvent(ctx context.Context, eventID, eventType, appUserID string, payload json.RawMessage) error {
	query := `
		INSERT INTO revenuecat_events (event_id, event_type, app_user_id, payload, processed_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (event_id) DO NOTHING
	`
	_, err := r.db.ExecContext(ctx, query, eventID, eventType, appUserID, payload)
	return err
}

// UpsertSubscription updates or inserts a user subscription
func (r *UserRepository) UpsertSubscription(ctx context.Context, sub *model.UserSubscription) error {
	query := `
		INSERT INTO user_subscriptions (
			user_id, entitlement, is_active, product_id, period_type, store,
			purchased_at, expires_at, cancelled_at, will_renew, has_billing_issue,
			is_sandbox, last_synced_at, revenuecat_updated_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			entitlement = EXCLUDED.entitlement,
			is_active = EXCLUDED.is_active,
			product_id = EXCLUDED.product_id,
			period_type = EXCLUDED.period_type,
			store = EXCLUDED.store,
			purchased_at = EXCLUDED.purchased_at,
			expires_at = EXCLUDED.expires_at,
			cancelled_at = EXCLUDED.cancelled_at,
			will_renew = EXCLUDED.will_renew,
			has_billing_issue = EXCLUDED.has_billing_issue,
			is_sandbox = EXCLUDED.is_sandbox,
			last_synced_at = EXCLUDED.last_synced_at,
			revenuecat_updated_at = EXCLUDED.revenuecat_updated_at,
			updated_at = NOW()
	`

	_, err := r.db.ExecContext(ctx, query,
		sub.UserID,
		sub.Entitlement,
		sub.IsActive,
		sub.ProductID,
		sub.PeriodType,
		sub.Store,
		sub.PurchasedAt,
		sub.ExpiresAt,
		sub.CancelledAt,
		sub.WillRenew,
		sub.HasBillingIssue,
		sub.IsSandbox,
		sub.LastSyncedAt,
		sub.RevenueCatUpdatedAt,
	)

	return err
}

// CountUserScansThisMonth counts the number of pantry scans this month for a user
func (r *UserRepository) CountUserScansThisMonth(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `
		SELECT COALESCE(used, 0)
		FROM usage_quotas
		WHERE user_id = $1 AND quota_type = 'pantry_scans'
		  AND period_start = date_trunc('month', CURRENT_DATE)::date
	`
	var count int
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return count, nil
}

// DeleteAccount permanently wipes all data for a user in a single transaction,
// then soft-deletes the user record itself (Apple guideline 5.1.1(v) compliance).
func (r *UserRepository) DeleteAccount(ctx context.Context, id uuid.UUID) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	steps := []string{
		// Child rows first to avoid FK violations
		`DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = $1)`,
		`DELETE FROM recipe_steps WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id = $1)`,
		`DELETE FROM recipe_shares WHERE owner_id = $1 OR recipient_id = $1`,
		`DELETE FROM recipes WHERE user_id = $1`,
		`DELETE FROM pantry_items WHERE user_id = $1`,
		`DELETE FROM shopping_items WHERE list_id IN (SELECT id FROM shopping_lists WHERE user_id = $1)`,
		`DELETE FROM shopping_lists WHERE user_id = $1`,
		`DELETE FROM meal_plan_entries WHERE plan_id IN (SELECT id FROM meal_plans WHERE user_id = $1)`,
		`DELETE FROM meal_plans WHERE user_id = $1`,
		`DELETE FROM video_jobs WHERE user_id = $1`,
		`DELETE FROM user_subscriptions WHERE user_id = $1`,
		`DELETE FROM usage_quotas WHERE user_id = $1`,
		// Wipe RevenueCat idempotency ledger — app_user_id is stored as the
		// user's UUID string; payload may contain PII (email, name).
		`DELETE FROM revenuecat_events WHERE app_user_id = $1::text`,
		// Soft-delete the user record last
		`UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
	}

	for _, q := range steps {
		if _, err := tx.ExecContext(ctx, q, id); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// TrackScanUsage increments the scan usage counter for the current month
func (r *UserRepository) TrackScanUsage(ctx context.Context, userID uuid.UUID) error {
	query := `
		INSERT INTO usage_quotas (user_id, quota_type, period_start, period_end, used, limit_value)
		VALUES ($1, 'pantry_scans', date_trunc('month', CURRENT_DATE)::date,
		        (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date, 1, 0)
		ON CONFLICT (user_id, quota_type, period_start)
		DO UPDATE SET used = usage_quotas.used + 1
	`
	_, err := r.db.ExecContext(ctx, query, userID)
	return err
}
