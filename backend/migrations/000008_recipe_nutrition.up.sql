-- Add nutrition and dietary info columns to recipes
-- Migration: 000008_recipe_nutrition

-- Nutrition info (calories, macros per serving)
ALTER TABLE recipes ADD COLUMN nutrition JSONB;

-- Dietary flags and allergens
ALTER TABLE recipes ADD COLUMN dietary_info JSONB;

-- Index for dietary filtering (e.g., find all vegetarian recipes)
CREATE INDEX idx_recipes_dietary ON recipes USING gin(dietary_info) WHERE deleted_at IS NULL;

-- Index for nutrition-based queries (e.g., low-calorie recipes)
CREATE INDEX idx_recipes_nutrition ON recipes USING gin(nutrition) WHERE deleted_at IS NULL;

-- Comment explaining the JSONB structure
COMMENT ON COLUMN recipes.nutrition IS 'Per-serving nutrition: {calories, protein, carbs, fat, fiber, sugar, sodium, tags[], confidence}';
COMMENT ON COLUMN recipes.dietary_info IS 'Dietary flags: {isVegetarian, isVegan, isGlutenFree, isDairyFree, isNutFree, isKeto, isHalal, isKosher, allergens[], mealTypes[]}';
