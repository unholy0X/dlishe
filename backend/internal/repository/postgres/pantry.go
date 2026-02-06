package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/model"
)

// PantryRepository handles pantry item data access
type PantryRepository struct {
	db *sql.DB
}

// NewPantryRepository creates a new pantry repository
func NewPantryRepository(db *sql.DB) *PantryRepository {
	return &PantryRepository{db: db}
}

// List returns pantry items for a user with SQL-based pagination
func (r *PantryRepository) List(ctx context.Context, userID uuid.UUID, category *string, limit, offset int) ([]*model.PantryItem, int, error) {
	// Build WHERE clause
	whereClause := `WHERE user_id = $1 AND deleted_at IS NULL`
	args := []interface{}{userID}
	argIndex := 2

	if category != nil && *category != "" {
		whereClause += fmt.Sprintf(` AND category = $%d`, argIndex)
		args = append(args, *category)
		argIndex++
	}

	// Get total count first
	countQuery := `SELECT COUNT(*) FROM pantry_items ` + whereClause
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get paginated items
	query := fmt.Sprintf(`
		SELECT id, user_id, name, category, quantity, unit,
		       sync_version, created_at, updated_at, deleted_at
		FROM pantry_items
		%s
		ORDER BY category ASC, name ASC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []*model.PantryItem
	for rows.Next() {
		item := &model.PantryItem{}
		err := rows.Scan(
			&item.ID, &item.UserID, &item.Name, &item.Category,
			&item.Quantity, &item.Unit,
			&item.SyncVersion, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}

	return items, total, rows.Err()
}

// ListAll returns all pantry items for a user (for recommendations)
func (r *PantryRepository) ListAll(ctx context.Context, userID uuid.UUID) ([]model.PantryItem, error) {
	query := `
		SELECT id, user_id, name, category, quantity, unit,
		       sync_version, created_at, updated_at, deleted_at
		FROM pantry_items
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY name ASC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.PantryItem
	for rows.Next() {
		var item model.PantryItem
		err := rows.Scan(
			&item.ID, &item.UserID, &item.Name, &item.Category,
			&item.Quantity, &item.Unit,
			&item.SyncVersion, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

// Get returns a single pantry item by ID
func (r *PantryRepository) Get(ctx context.Context, id, userID uuid.UUID) (*model.PantryItem, error) {
	query := `
		SELECT id, user_id, name, category, quantity, unit,
		       sync_version, created_at, updated_at, deleted_at
		FROM pantry_items
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	item := &model.PantryItem{}
	err := r.db.QueryRowContext(ctx, query, id, userID).Scan(
		&item.ID, &item.UserID, &item.Name, &item.Category,
		&item.Quantity, &item.Unit,
		&item.SyncVersion, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return item, nil
}

// Create creates or upserts a pantry item
// On duplicate (same user_id, name, category), merges quantities and resurrects soft-deleted items
func (r *PantryRepository) Create(ctx context.Context, userID uuid.UUID, input *model.PantryItemInput) (*model.PantryItem, error) {
	query := `
		INSERT INTO pantry_items (user_id, name, category, quantity, unit)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, name, category)
		DO UPDATE SET
			quantity = CASE
				WHEN pantry_items.deleted_at IS NOT NULL THEN EXCLUDED.quantity
				ELSE COALESCE(pantry_items.quantity, 0) + COALESCE(EXCLUDED.quantity, 0)
			END,
			unit = COALESCE(EXCLUDED.unit, pantry_items.unit),
			deleted_at = NULL,
			updated_at = NOW(),
			sync_version = pantry_items.sync_version + 1
		RETURNING id, user_id, name, category, quantity, unit,
		          sync_version, created_at, updated_at, deleted_at
	`

	item := &model.PantryItem{}
	err := r.db.QueryRowContext(ctx, query,
		userID, input.Name, input.Category, input.Quantity, input.Unit,
	).Scan(
		&item.ID, &item.UserID, &item.Name, &item.Category,
		&item.Quantity, &item.Unit,
		&item.SyncVersion, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	return item, nil
}

// Update updates an existing pantry item
func (r *PantryRepository) Update(ctx context.Context, id, userID uuid.UUID, input *model.PantryItemInput) (*model.PantryItem, error) {
	query := `
		UPDATE pantry_items
		SET name = $3, category = $4, quantity = $5, unit = $6,
		    sync_version = sync_version + 1
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
		RETURNING id, user_id, name, category, quantity, unit,
		          sync_version, created_at, updated_at, deleted_at
	`

	item := &model.PantryItem{}
	err := r.db.QueryRowContext(ctx, query,
		id, userID, input.Name, input.Category, input.Quantity, input.Unit,
	).Scan(
		&item.ID, &item.UserID, &item.Name, &item.Category,
		&item.Quantity, &item.Unit,
		&item.SyncVersion, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return item, nil
}

// Delete soft deletes a pantry item
func (r *PantryRepository) Delete(ctx context.Context, id, userID uuid.UUID) error {
	query := `
		UPDATE pantry_items
		SET deleted_at = NOW()
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query, id, userID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return model.ErrNotFound
	}

	return nil
}

// GetChangesSince returns items modified since the given timestamp (for sync)
func (r *PantryRepository) GetChangesSince(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.PantryItem, error) {
	query := `
		SELECT id, user_id, name, category, quantity, unit,
		       sync_version, created_at, updated_at, deleted_at
		FROM pantry_items
		WHERE user_id = $1 AND updated_at > $2
		ORDER BY updated_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query, userID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []*model.PantryItem
	for rows.Next() {
		item := &model.PantryItem{}
		err := rows.Scan(
			&item.ID, &item.UserID, &item.Name, &item.Category,
			&item.Quantity, &item.Unit,
			&item.SyncVersion, &item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}
