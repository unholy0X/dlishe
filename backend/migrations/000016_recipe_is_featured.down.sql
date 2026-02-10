DROP INDEX IF EXISTS idx_recipes_is_featured;
ALTER TABLE recipes DROP COLUMN IF EXISTS featured_at;
ALTER TABLE recipes DROP COLUMN IF EXISTS is_featured;
