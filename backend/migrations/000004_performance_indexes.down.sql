-- Rollback performance indexes

DROP INDEX IF EXISTS idx_recipe_steps_recipe;
DROP INDEX IF EXISTS idx_recipe_ingredients_recipe;
DROP INDEX IF EXISTS idx_recipes_source_url;
DROP INDEX IF EXISTS idx_shopping_items_checked;
