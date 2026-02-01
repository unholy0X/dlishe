package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"

	"github.com/dishflow/backend/internal/model"
)

var (
	ErrRecipeNotFound = errors.New("recipe not found")
)

// RecipeRepository handles recipe database operations
type RecipeRepository struct {
	db *sql.DB
}

// NewRecipeRepository creates a new recipe repository
func NewRecipeRepository(db *sql.DB) *RecipeRepository {
	return &RecipeRepository{db: db}
}

// Create creates a new recipe with its ingredients and steps
func (r *RecipeRepository) Create(ctx context.Context, recipe *model.Recipe) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Marshal source metadata to JSON
	var sourceMetadata []byte
	if recipe.SourceMetadata != nil {
		sourceMetadata, err = json.Marshal(recipe.SourceMetadata)
		if err != nil {
			return err
		}
	}

	// Insert recipe
	query := `
		INSERT INTO recipes (
			id, user_id, title, description, servings, prep_time, cook_time,
			difficulty, cuisine, thumbnail_url, source_type, source_url,
			source_metadata, tags, is_favorite, sync_version, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
		)
	`

	_, err = tx.ExecContext(ctx, query,
		recipe.ID,
		recipe.UserID,
		recipe.Title,
		recipe.Description,
		recipe.Servings,
		recipe.PrepTime,
		recipe.CookTime,
		recipe.Difficulty,
		recipe.Cuisine,
		recipe.ThumbnailURL,
		recipe.SourceType,
		recipe.SourceURL,
		sourceMetadata,
		pq.Array(recipe.Tags),
		recipe.IsFavorite,
		recipe.SyncVersion,
		recipe.CreatedAt,
		recipe.UpdatedAt,
	)
	if err != nil {
		return err
	}

	// Insert ingredients
	for i := range recipe.Ingredients {
		ing := &recipe.Ingredients[i]
		if ing.ID == uuid.Nil {
			ing.ID = uuid.New()
		}
		ing.RecipeID = recipe.ID
		ing.SortOrder = i
		ing.CreatedAt = time.Now().UTC()

		err = r.insertIngredient(ctx, tx, ing)
		if err != nil {
			return err
		}
	}

	// Insert steps
	for i := range recipe.Steps {
		step := &recipe.Steps[i]
		if step.ID == uuid.Nil {
			step.ID = uuid.New()
		}
		step.RecipeID = recipe.ID
		step.StepNumber = i + 1
		step.CreatedAt = time.Now().UTC()

		err = r.insertStep(ctx, tx, step)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *RecipeRepository) insertIngredient(ctx context.Context, tx *sql.Tx, ing *model.RecipeIngredient) error {
	query := `
		INSERT INTO recipe_ingredients (
			id, recipe_id, name, quantity, unit, category, is_optional,
			notes, video_timestamp, sort_order, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := tx.ExecContext(ctx, query,
		ing.ID,
		ing.RecipeID,
		ing.Name,
		ing.Quantity,
		ing.Unit,
		ing.Category,
		ing.IsOptional,
		ing.Notes,
		ing.VideoTimestamp,
		ing.SortOrder,
		ing.CreatedAt,
	)
	return err
}

func (r *RecipeRepository) insertStep(ctx context.Context, tx *sql.Tx, step *model.RecipeStep) error {
	query := `
		INSERT INTO recipe_steps (
			id, recipe_id, step_number, instruction, duration_seconds,
			technique, temperature, video_timestamp_start, video_timestamp_end, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := tx.ExecContext(ctx, query,
		step.ID,
		step.RecipeID,
		step.StepNumber,
		step.Instruction,
		step.DurationSeconds,
		step.Technique,
		step.Temperature,
		step.VideoTimestampStart,
		step.VideoTimestampEnd,
		step.CreatedAt,
	)
	return err
}

// GetByID retrieves a recipe by ID with ingredients and steps
func (r *RecipeRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Recipe, error) {
	query := `
		SELECT id, user_id, title, description, servings, prep_time, cook_time,
			   difficulty, cuisine, thumbnail_url, source_type, source_url,
			   source_metadata, tags, is_favorite, sync_version, created_at, updated_at
		FROM recipes
		WHERE id = $1 AND deleted_at IS NULL
	`

	recipe := &model.Recipe{}
	var sourceMetadata []byte
	var tags pq.StringArray

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&recipe.ID,
		&recipe.UserID,
		&recipe.Title,
		&recipe.Description,
		&recipe.Servings,
		&recipe.PrepTime,
		&recipe.CookTime,
		&recipe.Difficulty,
		&recipe.Cuisine,
		&recipe.ThumbnailURL,
		&recipe.SourceType,
		&recipe.SourceURL,
		&sourceMetadata,
		&tags,
		&recipe.IsFavorite,
		&recipe.SyncVersion,
		&recipe.CreatedAt,
		&recipe.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecipeNotFound
		}
		return nil, err
	}

	recipe.Tags = tags

	if sourceMetadata != nil {
		json.Unmarshal(sourceMetadata, &recipe.SourceMetadata)
	}

	// Load ingredients
	recipe.Ingredients, err = r.getIngredients(ctx, id)
	if err != nil {
		return nil, err
	}

	// Load steps
	recipe.Steps, err = r.getSteps(ctx, id)
	if err != nil {
		return nil, err
	}

	return recipe, nil
}

// GetBySourceURL retrieves a recipe by source URL for a specific user
// Returns ErrRecipeNotFound if no recipe with that source URL exists
func (r *RecipeRepository) GetBySourceURL(ctx context.Context, userID uuid.UUID, sourceURL string) (*model.Recipe, error) {
	query := `
		SELECT id, user_id, title, description, servings, prep_time, cook_time,
			   difficulty, cuisine, thumbnail_url, source_type, source_url,
			   source_metadata, tags, is_favorite, sync_version, created_at, updated_at
		FROM recipes
		WHERE user_id = $1 AND source_url = $2 AND deleted_at IS NULL
		LIMIT 1
	`

	recipe := &model.Recipe{}
	var sourceMetadata []byte
	var tags pq.StringArray

	err := r.db.QueryRowContext(ctx, query, userID, sourceURL).Scan(
		&recipe.ID,
		&recipe.UserID,
		&recipe.Title,
		&recipe.Description,
		&recipe.Servings,
		&recipe.PrepTime,
		&recipe.CookTime,
		&recipe.Difficulty,
		&recipe.Cuisine,
		&recipe.ThumbnailURL,
		&recipe.SourceType,
		&recipe.SourceURL,
		&sourceMetadata,
		&tags,
		&recipe.IsFavorite,
		&recipe.SyncVersion,
		&recipe.CreatedAt,
		&recipe.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecipeNotFound
		}
		return nil, err
	}

	recipe.Tags = tags

	if sourceMetadata != nil {
		json.Unmarshal(sourceMetadata, &recipe.SourceMetadata)
	}

	// Load ingredients
	recipe.Ingredients, err = r.getIngredients(ctx, recipe.ID)
	if err != nil {
		return nil, err
	}

	// Load steps
	recipe.Steps, err = r.getSteps(ctx, recipe.ID)
	if err != nil {
		return nil, err
	}

	return recipe, nil
}

func (r *RecipeRepository) getIngredients(ctx context.Context, recipeID uuid.UUID) ([]model.RecipeIngredient, error) {
	query := `
		SELECT id, recipe_id, name, quantity, unit, category, is_optional,
			   notes, video_timestamp, sort_order, created_at
		FROM recipe_ingredients
		WHERE recipe_id = $1
		ORDER BY sort_order
	`

	rows, err := r.db.QueryContext(ctx, query, recipeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ingredients []model.RecipeIngredient
	for rows.Next() {
		var ing model.RecipeIngredient
		err := rows.Scan(
			&ing.ID,
			&ing.RecipeID,
			&ing.Name,
			&ing.Quantity,
			&ing.Unit,
			&ing.Category,
			&ing.IsOptional,
			&ing.Notes,
			&ing.VideoTimestamp,
			&ing.SortOrder,
			&ing.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		ingredients = append(ingredients, ing)
	}

	return ingredients, rows.Err()
}

func (r *RecipeRepository) getSteps(ctx context.Context, recipeID uuid.UUID) ([]model.RecipeStep, error) {
	query := `
		SELECT id, recipe_id, step_number, instruction, duration_seconds,
			   technique, temperature, video_timestamp_start, video_timestamp_end, created_at
		FROM recipe_steps
		WHERE recipe_id = $1
		ORDER BY step_number
	`

	rows, err := r.db.QueryContext(ctx, query, recipeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var steps []model.RecipeStep
	for rows.Next() {
		var step model.RecipeStep
		err := rows.Scan(
			&step.ID,
			&step.RecipeID,
			&step.StepNumber,
			&step.Instruction,
			&step.DurationSeconds,
			&step.Technique,
			&step.Temperature,
			&step.VideoTimestampStart,
			&step.VideoTimestampEnd,
			&step.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		steps = append(steps, step)
	}

	return steps, rows.Err()
}

// ListByUser retrieves all recipes for a user with ingredient/step counts
func (r *RecipeRepository) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Recipe, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM recipes WHERE user_id = $1 AND deleted_at IS NULL`
	var total int
	err := r.db.QueryRowContext(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get recipes with ingredient and step counts (single query, no N+1)
	query := `
		SELECT r.id, r.user_id, r.title, r.description, r.servings, r.prep_time, r.cook_time,
			   r.difficulty, r.cuisine, r.thumbnail_url, r.source_type, r.source_url,
			   r.source_metadata, r.tags, r.is_favorite, r.sync_version, r.created_at, r.updated_at,
			   COALESCE((SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id), 0) AS ingredient_count,
			   COALESCE((SELECT COUNT(*) FROM recipe_steps WHERE recipe_id = r.id), 0) AS step_count
		FROM recipes r
		WHERE r.user_id = $1 AND r.deleted_at IS NULL
		ORDER BY r.created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var recipes []*model.Recipe
	for rows.Next() {
		recipe := &model.Recipe{}
		var sourceMetadata []byte
		var tags pq.StringArray

		err := rows.Scan(
			&recipe.ID,
			&recipe.UserID,
			&recipe.Title,
			&recipe.Description,
			&recipe.Servings,
			&recipe.PrepTime,
			&recipe.CookTime,
			&recipe.Difficulty,
			&recipe.Cuisine,
			&recipe.ThumbnailURL,
			&recipe.SourceType,
			&recipe.SourceURL,
			&sourceMetadata,
			&tags,
			&recipe.IsFavorite,
			&recipe.SyncVersion,
			&recipe.CreatedAt,
			&recipe.UpdatedAt,
			&recipe.IngredientCount,
			&recipe.StepCount,
		)
		if err != nil {
			return nil, 0, err
		}

		recipe.Tags = tags
		if sourceMetadata != nil {
			json.Unmarshal(sourceMetadata, &recipe.SourceMetadata)
		}

		recipes = append(recipes, recipe)
	}

	return recipes, total, rows.Err()
}

// Update updates a recipe
func (r *RecipeRepository) Update(ctx context.Context, recipe *model.Recipe) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var sourceMetadata []byte
	if recipe.SourceMetadata != nil {
		sourceMetadata, err = json.Marshal(recipe.SourceMetadata)
		if err != nil {
			return err
		}
	}

	recipe.UpdatedAt = time.Now().UTC()
	recipe.SyncVersion++

	query := `
		UPDATE recipes SET
			title = $2, description = $3, servings = $4, prep_time = $5, cook_time = $6,
			difficulty = $7, cuisine = $8, thumbnail_url = $9, source_type = $10,
			source_url = $11, source_metadata = $12, tags = $13, is_favorite = $14,
			sync_version = $15, updated_at = $16
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := tx.ExecContext(ctx, query,
		recipe.ID,
		recipe.Title,
		recipe.Description,
		recipe.Servings,
		recipe.PrepTime,
		recipe.CookTime,
		recipe.Difficulty,
		recipe.Cuisine,
		recipe.ThumbnailURL,
		recipe.SourceType,
		recipe.SourceURL,
		sourceMetadata,
		pq.Array(recipe.Tags),
		recipe.IsFavorite,
		recipe.SyncVersion,
		recipe.UpdatedAt,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrRecipeNotFound
	}

	// Delete existing ingredients and steps
	_, err = tx.ExecContext(ctx, "DELETE FROM recipe_ingredients WHERE recipe_id = $1", recipe.ID)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, "DELETE FROM recipe_steps WHERE recipe_id = $1", recipe.ID)
	if err != nil {
		return err
	}

	// Re-insert ingredients
	for i := range recipe.Ingredients {
		ing := &recipe.Ingredients[i]
		if ing.ID == uuid.Nil {
			ing.ID = uuid.New()
		}
		ing.RecipeID = recipe.ID
		ing.SortOrder = i
		ing.CreatedAt = time.Now().UTC()

		err = r.insertIngredient(ctx, tx, ing)
		if err != nil {
			return err
		}
	}

	// Re-insert steps
	for i := range recipe.Steps {
		step := &recipe.Steps[i]
		if step.ID == uuid.Nil {
			step.ID = uuid.New()
		}
		step.RecipeID = recipe.ID
		step.StepNumber = i + 1
		step.CreatedAt = time.Now().UTC()

		err = r.insertStep(ctx, tx, step)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// SoftDelete soft deletes a recipe
func (r *RecipeRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE recipes
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
		return ErrRecipeNotFound
	}

	return nil
}

// SetFavorite sets the favorite status of a recipe
func (r *RecipeRepository) SetFavorite(ctx context.Context, id uuid.UUID, favorite bool) error {
	query := `
		UPDATE recipes
		SET is_favorite = $2, updated_at = $3, sync_version = sync_version + 1
		WHERE id = $1 AND deleted_at IS NULL
	`

	now := time.Now().UTC()
	result, err := r.db.ExecContext(ctx, query, id, favorite, now)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrRecipeNotFound
	}

	return nil
}

// CountByUser counts recipes for a user
func (r *RecipeRepository) CountByUser(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM recipes WHERE user_id = $1 AND deleted_at IS NULL`
	var count int
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	return count, err
}

// GetChangesSince returns recipes modified since the given timestamp (for sync)
func (r *RecipeRepository) GetChangesSince(ctx context.Context, userID uuid.UUID, since time.Time) ([]model.Recipe, error) {
	query := `
		SELECT id, user_id, title, description, servings, prep_time, cook_time,
		       difficulty, cuisine, thumbnail_url, source_type, source_url, source_metadata,
		       tags, is_favorite, sync_version, created_at, updated_at, deleted_at
		FROM recipes
		WHERE user_id = $1 AND updated_at > $2
		ORDER BY updated_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query, userID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var recipes []model.Recipe
	for rows.Next() {
		var recipe model.Recipe
		var sourceMetadata []byte

		err := rows.Scan(
			&recipe.ID, &recipe.UserID, &recipe.Title, &recipe.Description,
			&recipe.Servings, &recipe.PrepTime, &recipe.CookTime,
			&recipe.Difficulty, &recipe.Cuisine, &recipe.ThumbnailURL,
			&recipe.SourceType, &recipe.SourceURL, &sourceMetadata,
			pq.Array(&recipe.Tags), &recipe.IsFavorite, &recipe.SyncVersion,
			&recipe.CreatedAt, &recipe.UpdatedAt, &recipe.DeletedAt,
		)
		if err != nil {
			return nil, err
		}

		// Unmarshal source metadata
		if len(sourceMetadata) > 0 {
			if err := json.Unmarshal(sourceMetadata, &recipe.SourceMetadata); err != nil {
				return nil, err
			}
		}

		// Get ingredients and steps
		ingredients, err := r.getIngredients(ctx, recipe.ID)
		if err != nil {
			return nil, err
		}
		recipe.Ingredients = ingredients

		steps, err := r.getSteps(ctx, recipe.ID)
		if err != nil {
			return nil, err
		}
		recipe.Steps = steps

		recipes = append(recipes, recipe)
	}

	return recipes, rows.Err()
}

// Upsert creates or updates a recipe (for sync)
func (r *RecipeRepository) Upsert(ctx context.Context, recipe *model.Recipe) error {
	// Check if recipe exists
	existing, err := r.GetByID(ctx, recipe.ID)
	if err == model.ErrNotFound {
		// Create new recipe
		return r.Create(ctx, recipe)
	}
	if err != nil {
		return err
	}

	// Update existing recipe
	// We need to preserve the ID and user_id
	recipe.UserID = existing.UserID
	return r.Update(ctx, recipe)
}
