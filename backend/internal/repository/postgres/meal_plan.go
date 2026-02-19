package postgres

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/model"
)

// MealPlanRepository handles meal plan data access
type MealPlanRepository struct {
	db *sql.DB
}

// NewMealPlanRepository creates a new meal plan repository
func NewMealPlanRepository(db *sql.DB) *MealPlanRepository {
	return &MealPlanRepository{db: db}
}

// GetOrCreateByWeek returns the plan for a given week, creating one if it doesn't exist
func (r *MealPlanRepository) GetOrCreateByWeek(ctx context.Context, userID uuid.UUID, weekStart time.Time) (*model.MealPlan, error) {
	query := `
		INSERT INTO meal_plans (user_id, week_start)
		VALUES ($1, $2)
		ON CONFLICT (user_id, week_start) DO UPDATE SET updated_at = now()
		RETURNING id, user_id, week_start, title, created_at, updated_at
	`

	plan := &model.MealPlan{}
	err := r.db.QueryRowContext(ctx, query, userID, weekStart).Scan(
		&plan.ID, &plan.UserID, &plan.WeekStart, &plan.Title,
		&plan.CreatedAt, &plan.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	entries, err := r.GetEntriesWithRecipes(ctx, plan.ID)
	if err != nil {
		return nil, err
	}
	plan.Entries = entries

	return plan, nil
}

// GetByID returns a meal plan by its ID, scoped to user
func (r *MealPlanRepository) GetByID(ctx context.Context, planID, userID uuid.UUID) (*model.MealPlan, error) {
	query := `
		SELECT id, user_id, week_start, title, created_at, updated_at
		FROM meal_plans
		WHERE id = $1 AND user_id = $2
	`

	plan := &model.MealPlan{}
	err := r.db.QueryRowContext(ctx, query, planID, userID).Scan(
		&plan.ID, &plan.UserID, &plan.WeekStart, &plan.Title,
		&plan.CreatedAt, &plan.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	entries, err := r.GetEntriesWithRecipes(ctx, plan.ID)
	if err != nil {
		return nil, err
	}
	plan.Entries = entries

	return plan, nil
}

// UpdateTitle updates the title of a meal plan
func (r *MealPlanRepository) UpdateTitle(ctx context.Context, planID, userID uuid.UUID, title string) (*model.MealPlan, error) {
	query := `
		UPDATE meal_plans
		SET title = $3, updated_at = now()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, week_start, title, created_at, updated_at
	`

	plan := &model.MealPlan{}
	err := r.db.QueryRowContext(ctx, query, planID, userID, title).Scan(
		&plan.ID, &plan.UserID, &plan.WeekStart, &plan.Title,
		&plan.CreatedAt, &plan.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, model.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	entries, err := r.GetEntriesWithRecipes(ctx, plan.ID)
	if err != nil {
		return nil, err
	}
	plan.Entries = entries

	return plan, nil
}

// AddEntry adds a recipe to a meal plan slot
func (r *MealPlanRepository) AddEntry(ctx context.Context, planID uuid.UUID, input *model.MealPlanEntryInput) (*model.MealPlanEntry, error) {
	// Get next sort order for this slot
	var maxSort int
	err := r.db.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(sort_order), -1) FROM meal_plan_entries
		WHERE plan_id = $1 AND day_index = $2 AND meal_type = $3
	`, planID, input.DayIndex, input.MealType).Scan(&maxSort)
	if err != nil {
		return nil, err
	}

	query := `
		INSERT INTO meal_plan_entries (plan_id, recipe_id, day_index, meal_type, sort_order)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, plan_id, recipe_id, day_index, meal_type, sort_order, created_at
	`

	entry := &model.MealPlanEntry{}
	err = r.db.QueryRowContext(ctx, query,
		planID, input.RecipeID, input.DayIndex, input.MealType, maxSort+1,
	).Scan(
		&entry.ID, &entry.PlanID, &entry.RecipeID, &entry.DayIndex,
		&entry.MealType, &entry.SortOrder, &entry.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Fetch recipe info for the response
	r.db.QueryRowContext(ctx, `
		SELECT title, thumbnail_url, prep_time, cook_time FROM recipes WHERE id = $1
	`, input.RecipeID).Scan(&entry.RecipeTitle, &entry.ThumbnailURL, &entry.PrepTime, &entry.CookTime)

	// Update plan's updated_at
	r.db.ExecContext(ctx, `UPDATE meal_plans SET updated_at = now() WHERE id = $1`, planID)

	return entry, nil
}

// RemoveEntry removes a recipe from a meal plan slot
func (r *MealPlanRepository) RemoveEntry(ctx context.Context, planID, entryID uuid.UUID) error {
	query := `DELETE FROM meal_plan_entries WHERE id = $1 AND plan_id = $2`

	result, err := r.db.ExecContext(ctx, query, entryID, planID)
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

	// Update plan's updated_at
	r.db.ExecContext(ctx, `UPDATE meal_plans SET updated_at = now() WHERE id = $1`, planID)

	return nil
}

// GetEntriesWithRecipes returns all entries for a plan with recipe details joined
func (r *MealPlanRepository) GetEntriesWithRecipes(ctx context.Context, planID uuid.UUID) ([]model.MealPlanEntry, error) {
	query := `
		SELECT e.id, e.plan_id, e.recipe_id, e.day_index, e.meal_type, e.sort_order, e.created_at,
		       r.title, r.thumbnail_url, r.prep_time, r.cook_time
		FROM meal_plan_entries e
		JOIN recipes r ON r.id = e.recipe_id AND r.deleted_at IS NULL
		WHERE e.plan_id = $1
		ORDER BY e.day_index, e.meal_type, e.sort_order
	`

	rows, err := r.db.QueryContext(ctx, query, planID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []model.MealPlanEntry
	for rows.Next() {
		entry := model.MealPlanEntry{}
		err := rows.Scan(
			&entry.ID, &entry.PlanID, &entry.RecipeID, &entry.DayIndex,
			&entry.MealType, &entry.SortOrder, &entry.CreatedAt,
			&entry.RecipeTitle, &entry.ThumbnailURL, &entry.PrepTime, &entry.CookTime,
		)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}

	if entries == nil {
		entries = []model.MealPlanEntry{}
	}

	return entries, rows.Err()
}

// GetPlanRecipeIngredients returns all ingredients from all recipes in a plan
func (r *MealPlanRepository) GetPlanRecipeIngredients(ctx context.Context, planID uuid.UUID) ([]model.RecipeIngredient, []string, error) {
	query := `
		SELECT DISTINCT ri.name, ri.quantity, ri.unit, ri.category, r.title
		FROM meal_plan_entries e
		JOIN recipes r ON r.id = e.recipe_id AND r.deleted_at IS NULL
		JOIN recipe_ingredients ri ON ri.recipe_id = r.id
		WHERE e.plan_id = $1
		ORDER BY ri.category, ri.name
	`

	rows, err := r.db.QueryContext(ctx, query, planID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var ingredients []model.RecipeIngredient
	var recipeNames []string
	for rows.Next() {
		var ing model.RecipeIngredient
		var recipeName string
		err := rows.Scan(&ing.Name, &ing.Quantity, &ing.Unit, &ing.Category, &recipeName)
		if err != nil {
			return nil, nil, err
		}
		ingredients = append(ingredients, ing)
		recipeNames = append(recipeNames, recipeName)
	}

	return ingredients, recipeNames, rows.Err()
}
