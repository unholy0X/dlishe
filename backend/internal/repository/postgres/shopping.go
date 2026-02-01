package postgres

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/model"
)

// ShoppingRepository handles shopping list data access
type ShoppingRepository struct {
	db *sql.DB
}

// NewShoppingRepository creates a new shopping repository
func NewShoppingRepository(db *sql.DB) *ShoppingRepository {
	return &ShoppingRepository{db: db}
}

// ===== Shopping Lists =====

// ListLists returns all shopping lists for a user
func (r *ShoppingRepository) ListLists(ctx context.Context, userID uuid.UUID, includeArchived bool) ([]*model.ShoppingList, error) {
	query := `
		SELECT id, user_id, name, description, icon, is_template, is_archived,
		       sync_version, created_at, updated_at, deleted_at
		FROM shopping_lists
		WHERE user_id = $1 AND deleted_at IS NULL
	`
	args := []interface{}{userID}

	if !includeArchived {
		query += ` AND is_archived = false`
	}

	query += ` ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var lists []*model.ShoppingList
	for rows.Next() {
		list := &model.ShoppingList{}
		err := rows.Scan(
			&list.ID, &list.UserID, &list.Name, &list.Description, &list.Icon,
			&list.IsTemplate, &list.IsArchived, &list.SyncVersion,
			&list.CreatedAt, &list.UpdatedAt, &list.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		lists = append(lists, list)
	}

	return lists, rows.Err()
}

// GetList returns a single shopping list by ID
func (r *ShoppingRepository) GetList(ctx context.Context, id, userID uuid.UUID) (*model.ShoppingList, error) {
	query := `
		SELECT id, user_id, name, description, icon, is_template, is_archived,
		       sync_version, created_at, updated_at, deleted_at
		FROM shopping_lists
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	list := &model.ShoppingList{}
	err := r.db.QueryRowContext(ctx, query, id, userID).Scan(
		&list.ID, &list.UserID, &list.Name, &list.Description, &list.Icon,
		&list.IsTemplate, &list.IsArchived, &list.SyncVersion,
		&list.CreatedAt, &list.UpdatedAt, &list.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return list, nil
}

// GetListWithItems returns a shopping list with all its items
func (r *ShoppingRepository) GetListWithItems(ctx context.Context, id, userID uuid.UUID) (*model.ShoppingListWithItems, error) {
	list, err := r.GetList(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	items, err := r.ListItems(ctx, id)
	if err != nil {
		return nil, err
	}

	return &model.ShoppingListWithItems{
		ShoppingList: *list,
		Items:        items,
	}, nil
}

// CreateList creates a new shopping list
func (r *ShoppingRepository) CreateList(ctx context.Context, userID uuid.UUID, input *model.ShoppingListInput) (*model.ShoppingList, error) {
	query := `
		INSERT INTO shopping_lists (user_id, name, description, icon, is_template)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, user_id, name, description, icon, is_template, is_archived,
		          sync_version, created_at, updated_at, deleted_at
	`

	list := &model.ShoppingList{}
	err := r.db.QueryRowContext(ctx, query,
		userID, input.Name, input.Description, input.Icon, input.IsTemplate,
	).Scan(
		&list.ID, &list.UserID, &list.Name, &list.Description, &list.Icon,
		&list.IsTemplate, &list.IsArchived, &list.SyncVersion,
		&list.CreatedAt, &list.UpdatedAt, &list.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	return list, nil
}

// UpdateList updates an existing shopping list
func (r *ShoppingRepository) UpdateList(ctx context.Context, id, userID uuid.UUID, input *model.ShoppingListInput) (*model.ShoppingList, error) {
	query := `
		UPDATE shopping_lists
		SET name = $3, description = $4, icon = $5, is_template = $6,
		    sync_version = sync_version + 1
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
		RETURNING id, user_id, name, description, icon, is_template, is_archived,
		          sync_version, created_at, updated_at, deleted_at
	`

	list := &model.ShoppingList{}
	err := r.db.QueryRowContext(ctx, query,
		id, userID, input.Name, input.Description, input.Icon, input.IsTemplate,
	).Scan(
		&list.ID, &list.UserID, &list.Name, &list.Description, &list.Icon,
		&list.IsTemplate, &list.IsArchived, &list.SyncVersion,
		&list.CreatedAt, &list.UpdatedAt, &list.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return list, nil
}

// DeleteList soft deletes a shopping list
func (r *ShoppingRepository) DeleteList(ctx context.Context, id, userID uuid.UUID) error {
	query := `
		UPDATE shopping_lists
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

// ArchiveList archives a shopping list
func (r *ShoppingRepository) ArchiveList(ctx context.Context, id, userID uuid.UUID, archived bool) error {
	query := `
		UPDATE shopping_lists
		SET is_archived = $3, sync_version = sync_version + 1
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query, id, userID, archived)
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

// ===== Shopping Items =====

// ListItems returns all items for a shopping list
func (r *ShoppingRepository) ListItems(ctx context.Context, listID uuid.UUID) ([]model.ShoppingItem, error) {
	query := `
		SELECT id, list_id, name, quantity, unit, category, is_checked, recipe_name,
		       sync_version, created_at, updated_at, deleted_at
		FROM shopping_items
		WHERE list_id = $1 AND deleted_at IS NULL
		ORDER BY category, name
	`

	rows, err := r.db.QueryContext(ctx, query, listID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.ShoppingItem
	for rows.Next() {
		item := model.ShoppingItem{}
		err := rows.Scan(
			&item.ID, &item.ListID, &item.Name, &item.Quantity, &item.Unit,
			&item.Category, &item.IsChecked, &item.RecipeName, &item.SyncVersion,
			&item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

// GetItem returns a single shopping item by ID
func (r *ShoppingRepository) GetItem(ctx context.Context, itemID, listID uuid.UUID) (*model.ShoppingItem, error) {
	query := `
		SELECT id, list_id, name, quantity, unit, category, is_checked, recipe_name,
		       sync_version, created_at, updated_at, deleted_at
		FROM shopping_items
		WHERE id = $1 AND list_id = $2 AND deleted_at IS NULL
	`

	item := &model.ShoppingItem{}
	err := r.db.QueryRowContext(ctx, query, itemID, listID).Scan(
		&item.ID, &item.ListID, &item.Name, &item.Quantity, &item.Unit,
		&item.Category, &item.IsChecked, &item.RecipeName, &item.SyncVersion,
		&item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return item, nil
}

// CreateItem creates a new shopping item
func (r *ShoppingRepository) CreateItem(ctx context.Context, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error) {
	query := `
		INSERT INTO shopping_items (list_id, name, quantity, unit, category, recipe_name)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, list_id, name, quantity, unit, category, is_checked, recipe_name,
		          sync_version, created_at, updated_at, deleted_at
	`

	item := &model.ShoppingItem{}
	err := r.db.QueryRowContext(ctx, query,
		listID, input.Name, input.Quantity, input.Unit, input.Category, input.RecipeName,
	).Scan(
		&item.ID, &item.ListID, &item.Name, &item.Quantity, &item.Unit,
		&item.Category, &item.IsChecked, &item.RecipeName, &item.SyncVersion,
		&item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)
	if err != nil {
		return nil, err
	}

	return item, nil
}

// UpdateItem updates an existing shopping item
func (r *ShoppingRepository) UpdateItem(ctx context.Context, itemID, listID uuid.UUID, input *model.ShoppingItemInput) (*model.ShoppingItem, error) {
	query := `
		UPDATE shopping_items
		SET name = $3, quantity = $4, unit = $5, category = $6, recipe_name = $7,
		    sync_version = sync_version + 1
		WHERE id = $1 AND list_id = $2 AND deleted_at IS NULL
		RETURNING id, list_id, name, quantity, unit, category, is_checked, recipe_name,
		          sync_version, created_at, updated_at, deleted_at
	`

	item := &model.ShoppingItem{}
	err := r.db.QueryRowContext(ctx, query,
		itemID, listID, input.Name, input.Quantity, input.Unit, input.Category, input.RecipeName,
	).Scan(
		&item.ID, &item.ListID, &item.Name, &item.Quantity, &item.Unit,
		&item.Category, &item.IsChecked, &item.RecipeName, &item.SyncVersion,
		&item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return item, nil
}

// ToggleItemChecked toggles the checked status of an item
func (r *ShoppingRepository) ToggleItemChecked(ctx context.Context, itemID, listID uuid.UUID) (*model.ShoppingItem, error) {
	query := `
		UPDATE shopping_items
		SET is_checked = NOT is_checked, sync_version = sync_version + 1
		WHERE id = $1 AND list_id = $2 AND deleted_at IS NULL
		RETURNING id, list_id, name, quantity, unit, category, is_checked, recipe_name,
		          sync_version, created_at, updated_at, deleted_at
	`

	item := &model.ShoppingItem{}
	err := r.db.QueryRowContext(ctx, query, itemID, listID).Scan(
		&item.ID, &item.ListID, &item.Name, &item.Quantity, &item.Unit,
		&item.Category, &item.IsChecked, &item.RecipeName, &item.SyncVersion,
		&item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
	)
	if err == sql.ErrNoRows {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	return item, nil
}

// DeleteItem soft deletes a shopping item
func (r *ShoppingRepository) DeleteItem(ctx context.Context, itemID, listID uuid.UUID) error {
	query := `
		UPDATE shopping_items
		SET deleted_at = NOW()
		WHERE id = $1 AND list_id = $2 AND deleted_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query, itemID, listID)
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

// GetChangesSince returns lists and items modified since the given timestamp (for sync)
func (r *ShoppingRepository) GetChangesSince(ctx context.Context, userID uuid.UUID, since time.Time) (lists []*model.ShoppingList, items []model.ShoppingItem, err error) {
	// Get changed lists
	listQuery := `
		SELECT id, user_id, name, description, icon, is_template, is_archived,
		       sync_version, created_at, updated_at, deleted_at
		FROM shopping_lists
		WHERE user_id = $1 AND updated_at > $2
		ORDER BY updated_at ASC
	`

	rows, err := r.db.QueryContext(ctx, listQuery, userID, since)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	for rows.Next() {
		list := &model.ShoppingList{}
		err := rows.Scan(
			&list.ID, &list.UserID, &list.Name, &list.Description, &list.Icon,
			&list.IsTemplate, &list.IsArchived, &list.SyncVersion,
			&list.CreatedAt, &list.UpdatedAt, &list.DeletedAt,
		)
		if err != nil {
			return nil, nil, err
		}
		lists = append(lists, list)
	}

	// Get changed items for user's lists
	itemQuery := `
		SELECT si.id, si.list_id, si.name, si.quantity, si.unit, si.category,
		       si.is_checked, si.recipe_name, si.sync_version,
		       si.created_at, si.updated_at, si.deleted_at
		FROM shopping_items si
		JOIN shopping_lists sl ON si.list_id = sl.id
		WHERE sl.user_id = $1 AND si.updated_at > $2
		ORDER BY si.updated_at ASC
	`

	itemRows, err := r.db.QueryContext(ctx, itemQuery, userID, since)
	if err != nil {
		return nil, nil, err
	}
	defer itemRows.Close()

	for itemRows.Next() {
		item := model.ShoppingItem{}
		err := itemRows.Scan(
			&item.ID, &item.ListID, &item.Name, &item.Quantity, &item.Unit,
			&item.Category, &item.IsChecked, &item.RecipeName, &item.SyncVersion,
			&item.CreatedAt, &item.UpdatedAt, &item.DeletedAt,
		)
		if err != nil {
			return nil, nil, err
		}
		items = append(items, item)
	}

	return lists, items, nil
}

// CompleteList moves checked items to pantry
func (r *ShoppingRepository) CompleteList(ctx context.Context, listID, userID uuid.UUID) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Get checked items
	queryChecked := `
		SELECT name, quantity, unit, category
		FROM shopping_items
		WHERE list_id = $1 AND is_checked = true AND deleted_at IS NULL
	`
	rows, err := tx.QueryContext(ctx, queryChecked, listID)
	if err != nil {
		return err
	}
	defer rows.Close()

	var itemsToMove []model.PantryItemInput
	for rows.Next() {
		var item model.PantryItemInput
		if err := rows.Scan(&item.Name, &item.Quantity, &item.Unit, &item.Category); err != nil {
			return err
		}
		itemsToMove = append(itemsToMove, item)
	}
	rows.Close() // Close specifically before next query

	// 2. Insert into Pantry (simple insert for MVP)
	queryInsertPantry := `
		INSERT INTO pantry_items (user_id, name, quantity, unit, category)
		VALUES ($1, $2, $3, $4, $5)
	`
	for _, item := range itemsToMove {
		_, err := tx.ExecContext(ctx, queryInsertPantry, userID, item.Name, item.Quantity, item.Unit, item.Category)
		if err != nil {
			return err
		}
	}

	// 3. Delete checked items from shopping list
	queryDeleteItems := `
		UPDATE shopping_items
		SET deleted_at = NOW(), sync_version = sync_version + 1
		WHERE list_id = $1 AND is_checked = true
	`
	_, err = tx.ExecContext(ctx, queryDeleteItems, listID)
	if err != nil {
		return err
	}

	// 4. Update List sync version
	_, err = tx.ExecContext(ctx, `UPDATE shopping_lists SET sync_version = sync_version + 1 WHERE id = $1`, listID)
	if err != nil {
		return err
	}

	return tx.Commit()
}
