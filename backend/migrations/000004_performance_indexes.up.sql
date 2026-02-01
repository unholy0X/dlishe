-- Performance indexes for frequently queried columns
-- These improve query speed as data grows

-- Shopping items: frequently filtered by list and checked status
CREATE INDEX IF NOT EXISTS idx_shopping_items_checked 
ON shopping_items(list_id, is_checked) 
WHERE deleted_at IS NULL;

-- Recipes: source_url lookup for idempotency checks
CREATE INDEX IF NOT EXISTS idx_recipes_source_url 
ON recipes(user_id, source_url) 
WHERE deleted_at IS NULL AND source_url IS NOT NULL;

-- Recipe ingredients: lookup by recipe
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe 
ON recipe_ingredients(recipe_id);

-- Recipe steps: lookup and ordering by recipe
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe 
ON recipe_steps(recipe_id, step_number);
