-- Add source_recipe_id column for tracking cloned recipes
-- This column stores the ID of the original recipe when a recipe is cloned/saved from another user

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;

-- Add index for finding clones of a recipe
CREATE INDEX IF NOT EXISTS idx_recipes_source_recipe_id ON recipes(source_recipe_id) WHERE source_recipe_id IS NOT NULL;

-- Comment on column
COMMENT ON COLUMN recipes.source_recipe_id IS 'ID of the original recipe if this recipe was cloned/saved from another user';
