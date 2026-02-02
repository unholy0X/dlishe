-- Remove nutrition and dietary info columns
-- Migration: 000008_recipe_nutrition (rollback)

DROP INDEX IF EXISTS idx_recipes_nutrition;
DROP INDEX IF EXISTS idx_recipes_dietary;
ALTER TABLE recipes DROP COLUMN IF EXISTS dietary_info;
ALTER TABLE recipes DROP COLUMN IF EXISTS nutrition;
