-- Add is_public column for suggested/public recipes
-- Public recipes are visible to all users and can be saved/cloned to their collection

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for efficiently querying public recipes
CREATE INDEX IF NOT EXISTS idx_recipes_is_public ON recipes(is_public) WHERE is_public = TRUE AND deleted_at IS NULL;

COMMENT ON COLUMN recipes.is_public IS 'When true, recipe is visible to all users as a suggested recipe';
