package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/model"
)

// unmarshalJSONB unmarshals JSONB data, logging a warning on corruption instead of failing silently
func unmarshalJSONB(data []byte, target interface{}, field string) {
	if err := json.Unmarshal(data, target); err != nil {
		slog.Warn("Corrupted JSONB data in recipe", "field", field, "error", err)
	}
}

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
	// Timeout to prevent long transactions
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

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

	// Marshal nutrition to JSON
	var nutritionJSON []byte
	if recipe.Nutrition != nil {
		nutritionJSON, err = json.Marshal(recipe.Nutrition)
		if err != nil {
			return err
		}
	}

	// Marshal dietary info to JSON
	var dietaryInfoJSON []byte
	if recipe.DietaryInfo != nil {
		dietaryInfoJSON, err = json.Marshal(recipe.DietaryInfo)
		if err != nil {
			return err
		}
	}

	// Insert recipe
	query := `
		INSERT INTO recipes (
			id, user_id, title, description, servings, prep_time, cook_time,
			difficulty, cuisine, thumbnail_url, source_type, source_url,
			source_recipe_id, source_metadata, tags, is_public, is_favorite,
			is_featured, featured_at,
			nutrition, dietary_info, sync_version, created_at, updated_at,
			content_language, translation_group_id
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
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
		recipe.SourceRecipeID,
		sourceMetadata,
		recipe.Tags,
		recipe.IsPublic,
		recipe.IsFavorite,
		recipe.IsFeatured,
		recipe.FeaturedAt,
		nutritionJSON,
		dietaryInfoJSON,
		recipe.SyncVersion,
		recipe.CreatedAt,
		recipe.UpdatedAt,
		recipe.ContentLanguage,
		recipe.TranslationGroupID,
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
			id, recipe_id, name, quantity, unit, category, section, is_optional,
			notes, video_timestamp, sort_order, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := tx.ExecContext(ctx, query,
		ing.ID,
		ing.RecipeID,
		ing.Name,
		ing.Quantity,
		ing.Unit,
		ing.Category,
		ing.Section,
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
			   source_recipe_id, source_metadata, tags, is_public, is_favorite,
			   is_featured, featured_at,
			   nutrition, dietary_info, sync_version, created_at, updated_at,
			   content_language, translation_group_id
		FROM recipes
		WHERE id = $1 AND deleted_at IS NULL
	`

	recipe := &model.Recipe{}
	var sourceMetadata, nutritionJSON, dietaryInfoJSON []byte
	var tags TextArray

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
		&recipe.SourceRecipeID,
		&sourceMetadata,
		&tags,
		&recipe.IsPublic,
		&recipe.IsFavorite,
		&recipe.IsFeatured,
		&recipe.FeaturedAt,
		&nutritionJSON,
		&dietaryInfoJSON,
		&recipe.SyncVersion,
		&recipe.CreatedAt,
		&recipe.UpdatedAt,
		&recipe.ContentLanguage,
		&recipe.TranslationGroupID,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecipeNotFound
		}
		return nil, err
	}

	recipe.Tags = []string(tags)

	if sourceMetadata != nil {
		unmarshalJSONB(sourceMetadata, &recipe.SourceMetadata, "source_metadata")
	}
	if nutritionJSON != nil {
		recipe.Nutrition = &model.RecipeNutrition{}
		unmarshalJSONB(nutritionJSON, recipe.Nutrition, "nutrition")
	}
	if dietaryInfoJSON != nil {
		recipe.DietaryInfo = &model.DietaryInfo{}
		unmarshalJSONB(dietaryInfoJSON, recipe.DietaryInfo, "dietary_info")
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
			   source_recipe_id, source_metadata, tags, is_public, is_favorite,
			   is_featured, featured_at,
			   nutrition, dietary_info, sync_version, created_at, updated_at,
			   content_language, translation_group_id
		FROM recipes
		WHERE user_id = $1 AND source_url = $2 AND deleted_at IS NULL
		LIMIT 1
	`

	recipe := &model.Recipe{}
	var sourceMetadata, nutritionJSON, dietaryInfoJSON []byte
	var tags TextArray

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
		&recipe.SourceRecipeID,
		&sourceMetadata,
		&tags,
		&recipe.IsPublic,
		&recipe.IsFavorite,
		&recipe.IsFeatured,
		&recipe.FeaturedAt,
		&nutritionJSON,
		&dietaryInfoJSON,
		&recipe.SyncVersion,
		&recipe.CreatedAt,
		&recipe.UpdatedAt,
		&recipe.ContentLanguage,
		&recipe.TranslationGroupID,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecipeNotFound
		}
		return nil, err
	}

	recipe.Tags = []string(tags)

	if sourceMetadata != nil {
		unmarshalJSONB(sourceMetadata, &recipe.SourceMetadata, "source_metadata")
	}
	if nutritionJSON != nil {
		recipe.Nutrition = &model.RecipeNutrition{}
		unmarshalJSONB(nutritionJSON, recipe.Nutrition, "nutrition")
	}
	if dietaryInfoJSON != nil {
		recipe.DietaryInfo = &model.DietaryInfo{}
		unmarshalJSONB(dietaryInfoJSON, recipe.DietaryInfo, "dietary_info")
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

// GetBySourceRecipeID retrieves a recipe by its source recipe ID for a specific user
// This is used to check if a user already has a clone of a recipe
func (r *RecipeRepository) GetBySourceRecipeID(ctx context.Context, userID, sourceRecipeID uuid.UUID) (*model.Recipe, error) {
	query := `
		SELECT id, user_id, title, description, servings, prep_time, cook_time,
			   difficulty, cuisine, thumbnail_url, source_type, source_url,
			   source_recipe_id, source_metadata, tags, is_public, is_favorite,
			   is_featured, featured_at,
			   nutrition, dietary_info, sync_version, created_at, updated_at,
			   content_language, translation_group_id
		FROM recipes
		WHERE user_id = $1 AND source_recipe_id = $2 AND deleted_at IS NULL
		LIMIT 1
	`

	recipe := &model.Recipe{}
	var sourceMetadata, nutritionJSON, dietaryInfoJSON []byte
	var tags TextArray

	err := r.db.QueryRowContext(ctx, query, userID, sourceRecipeID).Scan(
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
		&recipe.SourceRecipeID,
		&sourceMetadata,
		&tags,
		&recipe.IsPublic,
		&recipe.IsFavorite,
		&recipe.IsFeatured,
		&recipe.FeaturedAt,
		&nutritionJSON,
		&dietaryInfoJSON,
		&recipe.SyncVersion,
		&recipe.CreatedAt,
		&recipe.UpdatedAt,
		&recipe.ContentLanguage,
		&recipe.TranslationGroupID,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecipeNotFound
		}
		return nil, err
	}

	recipe.Tags = []string(tags)

	if sourceMetadata != nil {
		unmarshalJSONB(sourceMetadata, &recipe.SourceMetadata, "source_metadata")
	}
	if nutritionJSON != nil {
		recipe.Nutrition = &model.RecipeNutrition{}
		unmarshalJSONB(nutritionJSON, recipe.Nutrition, "nutrition")
	}
	if dietaryInfoJSON != nil {
		recipe.DietaryInfo = &model.DietaryInfo{}
		unmarshalJSONB(dietaryInfoJSON, recipe.DietaryInfo, "dietary_info")
	}

	return recipe, nil
}

func (r *RecipeRepository) getIngredients(ctx context.Context, recipeID uuid.UUID) ([]model.RecipeIngredient, error) {
	query := `
		SELECT id, recipe_id, name, quantity, unit, category, section, is_optional,
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
		var section sql.NullString // Handle possible NULLs for existing rows

		err := rows.Scan(
			&ing.ID,
			&ing.RecipeID,
			&ing.Name,
			&ing.Quantity,
			&ing.Unit,
			&ing.Category,
			&section,
			&ing.IsOptional,
			&ing.Notes,
			&ing.VideoTimestamp,
			&ing.SortOrder,
			&ing.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		if section.Valid {
			ing.Section = section.String
		} else {
			ing.Section = "Main" // Default for older records
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
			   r.source_recipe_id, r.source_metadata, r.tags, r.is_public, r.is_favorite,
			   r.is_featured, r.featured_at,
			   r.nutrition, r.dietary_info, r.sync_version, r.created_at, r.updated_at,
			   r.content_language, r.translation_group_id,
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
		var sourceMetadata, nutritionJSON, dietaryInfoJSON []byte
		var tags TextArray

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
			&recipe.SourceRecipeID,
			&sourceMetadata,
			&tags,
			&recipe.IsPublic,
			&recipe.IsFavorite,
			&recipe.IsFeatured,
			&recipe.FeaturedAt,
			&nutritionJSON,
			&dietaryInfoJSON,
			&recipe.SyncVersion,
			&recipe.CreatedAt,
			&recipe.UpdatedAt,
			&recipe.ContentLanguage,
			&recipe.TranslationGroupID,
			&recipe.IngredientCount,
			&recipe.StepCount,
		)
		if err != nil {
			return nil, 0, err
		}

		recipe.Tags = []string(tags)
		if sourceMetadata != nil {
			unmarshalJSONB(sourceMetadata, &recipe.SourceMetadata, "source_metadata")
		}
		if nutritionJSON != nil {
			recipe.Nutrition = &model.RecipeNutrition{}
			unmarshalJSONB(nutritionJSON, recipe.Nutrition, "nutrition")
		}
		if dietaryInfoJSON != nil {
			recipe.DietaryInfo = &model.DietaryInfo{}
			unmarshalJSONB(dietaryInfoJSON, recipe.DietaryInfo, "dietary_info")
		}

		recipes = append(recipes, recipe)
	}

	return recipes, total, rows.Err()
}

// ListPublic retrieves all public/suggested recipes with ingredient/step counts
func (r *RecipeRepository) ListPublic(ctx context.Context, limit, offset int) ([]*model.Recipe, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM recipes WHERE is_public = TRUE AND deleted_at IS NULL`
	var total int
	err := r.db.QueryRowContext(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get public recipes in random order so users see different suggestions each time
	query := `
		SELECT r.id, r.user_id, r.title, r.description, r.servings, r.prep_time, r.cook_time,
			   r.difficulty, r.cuisine, r.thumbnail_url, r.source_type, r.source_url,
			   r.source_recipe_id, r.source_metadata, r.tags, r.is_public, r.is_favorite,
			   r.is_featured, r.featured_at,
			   r.nutrition, r.dietary_info, r.sync_version, r.created_at, r.updated_at,
			   r.content_language, r.translation_group_id,
			   COALESCE((SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id), 0) AS ingredient_count,
			   COALESCE((SELECT COUNT(*) FROM recipe_steps WHERE recipe_id = r.id), 0) AS step_count
		FROM recipes r
		WHERE r.is_public = TRUE AND r.deleted_at IS NULL
		ORDER BY RANDOM()
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var recipes []*model.Recipe
	for rows.Next() {
		recipe := &model.Recipe{}
		var sourceMetadata, nutritionJSON, dietaryInfoJSON []byte
		var tags TextArray

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
			&recipe.SourceRecipeID,
			&sourceMetadata,
			&tags,
			&recipe.IsPublic,
			&recipe.IsFavorite,
			&recipe.IsFeatured,
			&recipe.FeaturedAt,
			&nutritionJSON,
			&dietaryInfoJSON,
			&recipe.SyncVersion,
			&recipe.CreatedAt,
			&recipe.UpdatedAt,
			&recipe.ContentLanguage,
			&recipe.TranslationGroupID,
			&recipe.IngredientCount,
			&recipe.StepCount,
		)
		if err != nil {
			return nil, 0, err
		}

		recipe.Tags = []string(tags)
		if sourceMetadata != nil {
			unmarshalJSONB(sourceMetadata, &recipe.SourceMetadata, "source_metadata")
		}
		if nutritionJSON != nil {
			recipe.Nutrition = &model.RecipeNutrition{}
			unmarshalJSONB(nutritionJSON, recipe.Nutrition, "nutrition")
		}
		if dietaryInfoJSON != nil {
			recipe.DietaryInfo = &model.DietaryInfo{}
			unmarshalJSONB(dietaryInfoJSON, recipe.DietaryInfo, "dietary_info")
		}

		recipes = append(recipes, recipe)
	}

	return recipes, total, rows.Err()
}

// Update updates a recipe
func (r *RecipeRepository) Update(ctx context.Context, recipe *model.Recipe) error {
	// Timeout for updates
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

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

	var nutritionJSON []byte
	if recipe.Nutrition != nil {
		nutritionJSON, err = json.Marshal(recipe.Nutrition)
		if err != nil {
			return err
		}
	}

	var dietaryInfoJSON []byte
	if recipe.DietaryInfo != nil {
		dietaryInfoJSON, err = json.Marshal(recipe.DietaryInfo)
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
			source_url = $11, source_recipe_id = $12, source_metadata = $13, tags = $14,
			is_public = $15, is_favorite = $16, is_featured = $17, featured_at = $18,
			nutrition = $19, dietary_info = $20,
			sync_version = $21, updated_at = $22, content_language = $23, translation_group_id = $24
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
		recipe.SourceRecipeID,
		sourceMetadata,
		recipe.Tags,
		recipe.IsPublic,
		recipe.IsFavorite,
		recipe.IsFeatured,
		recipe.FeaturedAt,
		nutritionJSON,
		dietaryInfoJSON,
		recipe.SyncVersion,
		recipe.UpdatedAt,
		recipe.ContentLanguage,
		recipe.TranslationGroupID,
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

// SoftDelete soft deletes a recipe and removes it from any meal plans atomically.
func (r *RecipeRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	now := time.Now().UTC()
	result, err := tx.ExecContext(ctx, `
		UPDATE recipes
		SET deleted_at = $2, updated_at = $2
		WHERE id = $1 AND deleted_at IS NULL
	`, id, now)
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

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM meal_plan_entries WHERE recipe_id = $1
	`, id); err != nil {
		return err
	}

	return tx.Commit()
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
		       difficulty, cuisine, thumbnail_url, source_type, source_url, source_recipe_id, source_metadata,
		       tags, is_public, is_favorite, is_featured, featured_at,
		       nutrition, dietary_info, sync_version, created_at, updated_at,
		       content_language, translation_group_id, deleted_at
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
		var sourceMetadata, nutritionJSON, dietaryInfoJSON []byte
		var tags TextArray

		err := rows.Scan(
			&recipe.ID, &recipe.UserID, &recipe.Title, &recipe.Description,
			&recipe.Servings, &recipe.PrepTime, &recipe.CookTime,
			&recipe.Difficulty, &recipe.Cuisine, &recipe.ThumbnailURL,
			&recipe.SourceType, &recipe.SourceURL, &recipe.SourceRecipeID, &sourceMetadata,
			&tags, &recipe.IsPublic, &recipe.IsFavorite,
			&recipe.IsFeatured, &recipe.FeaturedAt,
			&nutritionJSON, &dietaryInfoJSON, &recipe.SyncVersion,
			&recipe.CreatedAt, &recipe.UpdatedAt,
			&recipe.ContentLanguage, &recipe.TranslationGroupID, &recipe.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		recipe.Tags = []string(tags)

		// Unmarshal source metadata
		if len(sourceMetadata) > 0 {
			if err := json.Unmarshal(sourceMetadata, &recipe.SourceMetadata); err != nil {
				return nil, err
			}
		}
		if len(nutritionJSON) > 0 {
			recipe.Nutrition = &model.RecipeNutrition{}
			if err := json.Unmarshal(nutritionJSON, recipe.Nutrition); err != nil {
				return nil, err
			}
		}
		if len(dietaryInfoJSON) > 0 {
			recipe.DietaryInfo = &model.DietaryInfo{}
			if err := json.Unmarshal(dietaryInfoJSON, recipe.DietaryInfo); err != nil {
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
	if errors.Is(err, ErrRecipeNotFound) {
		// Create new recipe
		return r.Create(ctx, recipe)
	}
	if err != nil {
		return err
	}

	// Update existing recipe
	// Preserve ID and user_id
	recipe.UserID = existing.UserID
	return r.Update(ctx, recipe)
}

// ListForRecommendations retrieves all recipes for a user with full ingredients loaded
// This is optimized for the recommendation engine which needs ingredient data for matching
// Uses single JOIN query to load ingredients
func (r *RecipeRepository) ListForRecommendations(ctx context.Context, userID uuid.UUID) ([]*model.Recipe, error) {
	// CRITICAL: Single query with LEFT JOIN to avoid N+1 problem
	// Before: 100 recipes = 1 recipe query + 100 ingredient queries = 101 queries (~5 seconds)
	// After: 100 recipes = 1 query with JOIN (~300ms)
	query := `
		SELECT
			r.id, r.user_id, r.title, r.description, r.servings, r.prep_time, r.cook_time,
			r.difficulty, r.cuisine, r.thumbnail_url, r.source_type, r.source_url,
			r.source_recipe_id, r.source_metadata, r.tags, r.is_public, r.is_favorite,
			r.is_featured, r.featured_at,
			r.nutrition, r.dietary_info, r.sync_version, r.created_at, r.updated_at,
			r.content_language, r.translation_group_id,
			i.id as ing_id, i.name as ing_name, i.quantity, i.unit, i.category, i.section,
			i.is_optional, i.sort_order
		FROM recipes r
		LEFT JOIN recipe_ingredients i ON i.recipe_id = r.id
		WHERE (r.user_id = $1 OR r.is_public = TRUE) AND r.deleted_at IS NULL
		  AND r.id IN (SELECT id FROM recipes WHERE (user_id = $1 OR is_public = TRUE) AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 200)
		ORDER BY r.created_at DESC, i.sort_order ASC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Group results by recipe ID
	recipesMap := make(map[uuid.UUID]*model.Recipe)
	var recipeOrder []uuid.UUID // Preserve order

	for rows.Next() {
		var (
			recipeID                      uuid.UUID
			userID                        uuid.UUID
			title                         string
			description, difficulty       *string
			cuisine, thumbnailURL         *string
			sourceType                    string
			sourceURL                     sql.NullString
			sourceRecipeID                sql.NullString
			servings, prepTime, cookTime  *int
			sourceMetadata, nutritionJSON []byte
			dietaryInfoJSON               []byte
			tags                          TextArray
			isPublic, isFavorite          bool
			isFeatured                    bool
			featuredAt                    *time.Time
			syncVersion                   int
			createdAt, updatedAt          time.Time
			contentLanguage               string
			translationGroupID            *uuid.UUID
			// Ingredient fields (nullable since LEFT JOIN)
			ingID      sql.NullString
			ingName    sql.NullString
			quantity   sql.NullFloat64
			unit       sql.NullString
			category   sql.NullString
			ingSection sql.NullString
			isOptional sql.NullBool
			sortOrder  sql.NullInt64
		)

		err := rows.Scan(
			&recipeID, &userID, &title, &description, &servings, &prepTime, &cookTime,
			&difficulty, &cuisine, &thumbnailURL, &sourceType, &sourceURL,
			&sourceRecipeID, &sourceMetadata, &tags, &isPublic, &isFavorite,
			&isFeatured, &featuredAt,
			&nutritionJSON, &dietaryInfoJSON, &syncVersion, &createdAt, &updatedAt,
			&contentLanguage, &translationGroupID,
			&ingID, &ingName, &quantity, &unit, &category, &ingSection, &isOptional, &sortOrder,
		)
		if err != nil {
			return nil, err
		}

		// Get or create recipe
		recipe, exists := recipesMap[recipeID]
		if !exists {
			recipe = &model.Recipe{
				ID:                 recipeID,
				UserID:             userID,
				Title:              title,
				Description:        description,
				Servings:           servings,
				PrepTime:           prepTime,
				CookTime:           cookTime,
				Difficulty:         difficulty,
				Cuisine:            cuisine,
				ThumbnailURL:       thumbnailURL,
				SourceType:         sourceType,
				Tags:               []string(tags),
				IsPublic:           isPublic,
				IsFavorite:         isFavorite,
				IsFeatured:         isFeatured,
				FeaturedAt:         featuredAt,
				SyncVersion:        syncVersion,
				CreatedAt:          createdAt,
				UpdatedAt:          updatedAt,
				ContentLanguage:    contentLanguage,
				TranslationGroupID: translationGroupID,
				Ingredients:        []model.RecipeIngredient{},
			}
			if sourceURL.Valid {
				url := sourceURL.String
				recipe.SourceURL = &url
			}
			if sourceRecipeID.Valid {
				srcID, _ := uuid.Parse(sourceRecipeID.String)
				recipe.SourceRecipeID = &srcID
			}
			if sourceMetadata != nil {
				unmarshalJSONB(sourceMetadata, &recipe.SourceMetadata, "source_metadata")
			}
			if nutritionJSON != nil {
				recipe.Nutrition = &model.RecipeNutrition{}
				unmarshalJSONB(nutritionJSON, recipe.Nutrition, "nutrition")
			}
			if dietaryInfoJSON != nil {
				recipe.DietaryInfo = &model.DietaryInfo{}
				unmarshalJSONB(dietaryInfoJSON, recipe.DietaryInfo, "dietary_info")
			}
			recipesMap[recipeID] = recipe
			recipeOrder = append(recipeOrder, recipeID)
		}

		// Add ingredient if it exists (LEFT JOIN may return NULL ingredients)
		if ingID.Valid && ingName.Valid {
			ingredient := model.RecipeIngredient{
				Name:       ingName.String,
				IsOptional: isOptional.Bool,
			}
			if ingID.Valid {
				id, _ := uuid.Parse(ingID.String)
				ingredient.ID = id
			}
			if quantity.Valid {
				q := quantity.Float64
				ingredient.Quantity = &q
			}
			if unit.Valid {
				u := unit.String
				ingredient.Unit = &u
			}
			if category.Valid {
				ingredient.Category = category.String
			}
			if ingSection.Valid {
				ingredient.Section = ingSection.String
			} else {
				ingredient.Section = "Main"
			}
			if sortOrder.Valid {
				ingredient.SortOrder = int(sortOrder.Int64)
			}
			recipe.Ingredients = append(recipe.Ingredients, ingredient)
		}
	}

	// Convert map to slice in original order
	recipes := make([]*model.Recipe, 0, len(recipeOrder))
	for _, id := range recipeOrder {
		recipes = append(recipes, recipesMap[id])
	}

	return recipes, rows.Err()
}

// Search searches user's recipes by query string.
// Matches against title, cuisine, description, and tags using case-insensitive matching.
// Returns lightweight recipe summaries (no ingredients/steps) for fast suggestion display.
//
// Security: Query is parameterized to prevent SQL injection.
// Performance: Uses ILIKE with indexed columns. Suitable for <10k recipes per user.
// Fault tolerance: Returns empty slice (not nil) on no results. Timeouts prevent runaway queries.
func (r *RecipeRepository) Search(ctx context.Context, userID uuid.UUID, query string, limit int) ([]*model.Recipe, error) {
	// Timeout for search
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	// Sanitize limit
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	// Empty query returns empty results
	query = strings.TrimSpace(query)
	if query == "" {
		return []*model.Recipe{}, nil
	}

	// Build search pattern for ILIKE
	searchPattern := "%" + query + "%"

	// Query searches title, cuisine, description, and tags with ranking:
	// - Exact title prefix matches rank highest (0)
	// - Other title matches rank second (1)
	// - Cuisine/description/tag matches rank third (2)
	sqlQuery := `
		SELECT r.id, r.user_id, r.title, r.description, r.servings, r.prep_time, r.cook_time,
		       r.difficulty, r.cuisine, r.thumbnail_url, r.source_type, r.source_url,
		       r.source_recipe_id, r.source_metadata, r.tags, r.is_public, r.is_favorite,
		       r.is_featured, r.featured_at,
		       r.nutrition, r.dietary_info, r.sync_version, r.created_at, r.updated_at,
		       r.content_language, r.translation_group_id,
		       COALESCE((SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id), 0) AS ingredient_count,
		       COALESCE((SELECT COUNT(*) FROM recipe_steps WHERE recipe_id = r.id), 0) AS step_count
		FROM recipes r
		WHERE r.user_id = $1
		  AND r.deleted_at IS NULL
		  AND (
		      r.title ILIKE $2
		      OR r.cuisine ILIKE $2
		      OR r.description ILIKE $2
		      OR EXISTS (SELECT 1 FROM unnest(r.tags) AS tag WHERE tag ILIKE $2)
		  )
		ORDER BY
		    CASE
		        WHEN r.title ILIKE $3 || '%' THEN 0  -- Prefix match ranks highest
		        WHEN r.title ILIKE $2 THEN 1         -- Any title match
		        ELSE 2                                -- Other matches
		    END,
		    r.is_favorite DESC,  -- Favorites bubble up within same rank
		    r.title
		LIMIT $4
	`

	rows, err := r.db.QueryContext(ctx, sqlQuery, userID, searchPattern, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Pre-allocate with reasonable capacity
	recipes := make([]*model.Recipe, 0, limit)

	for rows.Next() {
		recipe := &model.Recipe{}
		var sourceMetadata, nutritionJSON, dietaryInfoJSON []byte
		var tags TextArray

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
			&recipe.SourceRecipeID,
			&sourceMetadata,
			&tags,
			&recipe.IsPublic,
			&recipe.IsFavorite,
			&recipe.IsFeatured,
			&recipe.FeaturedAt,
			&nutritionJSON,
			&dietaryInfoJSON,
			&recipe.SyncVersion,
			&recipe.CreatedAt,
			&recipe.UpdatedAt,
			&recipe.ContentLanguage,
			&recipe.TranslationGroupID,
			&recipe.IngredientCount,
			&recipe.StepCount,
		)
		if err != nil {
			return nil, err
		}

		recipe.Tags = []string(tags)

		// Unmarshal JSONB fields gracefully (log warning, don't fail)
		if sourceMetadata != nil {
			unmarshalJSONB(sourceMetadata, &recipe.SourceMetadata, "source_metadata")
		}
		if nutritionJSON != nil {
			recipe.Nutrition = &model.RecipeNutrition{}
			unmarshalJSONB(nutritionJSON, recipe.Nutrition, "nutrition")
		}
		if dietaryInfoJSON != nil {
			recipe.DietaryInfo = &model.DietaryInfo{}
			unmarshalJSONB(dietaryInfoJSON, recipe.DietaryInfo, "dietary_info")
		}

		recipes = append(recipes, recipe)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return recipes, nil
}

// SearchPublic searches public (suggested) recipes by title, cuisine, description, and tags.
func (r *RecipeRepository) SearchPublic(ctx context.Context, query string, limit int) ([]*model.Recipe, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	query = strings.TrimSpace(query)
	if query == "" {
		return []*model.Recipe{}, nil
	}

	searchPattern := "%" + query + "%"

	sqlQuery := `
		SELECT r.id, r.user_id, r.title, r.description, r.servings, r.prep_time, r.cook_time,
		       r.difficulty, r.cuisine, r.thumbnail_url, r.source_type, r.source_url,
		       r.source_recipe_id, r.source_metadata, r.tags, r.is_public, r.is_favorite,
		       r.is_featured, r.featured_at,
		       r.nutrition, r.dietary_info, r.sync_version, r.created_at, r.updated_at,
		       r.content_language, r.translation_group_id,
		       COALESCE((SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id), 0) AS ingredient_count,
		       COALESCE((SELECT COUNT(*) FROM recipe_steps WHERE recipe_id = r.id), 0) AS step_count
		FROM recipes r
		WHERE (r.is_public = TRUE OR r.is_featured = TRUE)
		  AND r.deleted_at IS NULL
		  AND (
		      r.title ILIKE $1
		      OR r.cuisine ILIKE $1
		      OR r.description ILIKE $1
		      OR EXISTS (SELECT 1 FROM unnest(r.tags) AS tag WHERE tag ILIKE $1)
		  )
		ORDER BY
		    CASE
		        WHEN r.title ILIKE $2 || '%' THEN 0
		        WHEN r.title ILIKE $1 THEN 1
		        ELSE 2
		    END,
		    r.is_featured DESC,
		    r.title
		LIMIT $3
	`

	rows, err := r.db.QueryContext(ctx, sqlQuery, searchPattern, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	recipes := make([]*model.Recipe, 0, limit)

	for rows.Next() {
		recipe := &model.Recipe{}
		var sourceMetadata, nutritionJSON, dietaryInfoJSON []byte
		var tags TextArray

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
			&recipe.SourceRecipeID,
			&sourceMetadata,
			&tags,
			&recipe.IsPublic,
			&recipe.IsFavorite,
			&recipe.IsFeatured,
			&recipe.FeaturedAt,
			&nutritionJSON,
			&dietaryInfoJSON,
			&recipe.SyncVersion,
			&recipe.CreatedAt,
			&recipe.UpdatedAt,
			&recipe.ContentLanguage,
			&recipe.TranslationGroupID,
			&recipe.IngredientCount,
			&recipe.StepCount,
		)
		if err != nil {
			return nil, err
		}

		recipe.Tags = []string(tags)

		if sourceMetadata != nil {
			unmarshalJSONB(sourceMetadata, &recipe.SourceMetadata, "source_metadata")
		}
		if nutritionJSON != nil {
			recipe.Nutrition = &model.RecipeNutrition{}
			unmarshalJSONB(nutritionJSON, recipe.Nutrition, "nutrition")
		}
		if dietaryInfoJSON != nil {
			recipe.DietaryInfo = &model.DietaryInfo{}
			unmarshalJSONB(dietaryInfoJSON, recipe.DietaryInfo, "dietary_info")
		}

		recipes = append(recipes, recipe)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return recipes, nil
}

// ListFeatured retrieves all featured recipes with ingredient/step counts
func (r *RecipeRepository) ListFeatured(ctx context.Context, limit, offset int) ([]*model.Recipe, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM recipes WHERE is_featured = TRUE AND deleted_at IS NULL`
	var total int
	err := r.db.QueryRowContext(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	// Get featured recipes in random order
	query := `
		SELECT r.id, r.user_id, r.title, r.description, r.servings, r.prep_time, r.cook_time,
			   r.difficulty, r.cuisine, r.thumbnail_url, r.source_type, r.source_url,
			   r.source_recipe_id, r.source_metadata, r.tags, r.is_public, r.is_favorite,
			   r.is_featured, r.featured_at,
			   r.nutrition, r.dietary_info, r.sync_version, r.created_at, r.updated_at,
			   r.content_language, r.translation_group_id,
			   COALESCE((SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id), 0) AS ingredient_count,
			   COALESCE((SELECT COUNT(*) FROM recipe_steps WHERE recipe_id = r.id), 0) AS step_count
		FROM recipes r
		WHERE r.is_featured = TRUE AND r.deleted_at IS NULL
		ORDER BY RANDOM()
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var recipes []*model.Recipe
	for rows.Next() {
		recipe := &model.Recipe{}
		var sourceMetadata, nutritionJSON, dietaryInfoJSON []byte
		var tags TextArray

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
			&recipe.SourceRecipeID,
			&sourceMetadata,
			&tags,
			&recipe.IsPublic,
			&recipe.IsFavorite,
			&recipe.IsFeatured,
			&recipe.FeaturedAt,
			&nutritionJSON,
			&dietaryInfoJSON,
			&recipe.SyncVersion,
			&recipe.CreatedAt,
			&recipe.UpdatedAt,
			&recipe.ContentLanguage,
			&recipe.TranslationGroupID,
			&recipe.IngredientCount,
			&recipe.StepCount,
		)
		if err != nil {
			return nil, 0, err
		}

		recipe.Tags = []string(tags)
		if sourceMetadata != nil {
			unmarshalJSONB(sourceMetadata, &recipe.SourceMetadata, "source_metadata")
		}
		if nutritionJSON != nil {
			recipe.Nutrition = &model.RecipeNutrition{}
			unmarshalJSONB(nutritionJSON, recipe.Nutrition, "nutrition")
		}
		if dietaryInfoJSON != nil {
			recipe.DietaryInfo = &model.DietaryInfo{}
			unmarshalJSONB(dietaryInfoJSON, recipe.DietaryInfo, "dietary_info")
		}

		recipes = append(recipes, recipe)
	}

	return recipes, total, rows.Err()
}
