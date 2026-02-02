-- Rollback: Remove source_recipe_id column

DROP INDEX IF EXISTS idx_recipes_source_recipe_id;
ALTER TABLE recipes DROP COLUMN IF EXISTS source_recipe_id;
