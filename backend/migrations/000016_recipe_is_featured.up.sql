ALTER TABLE recipes ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_recipes_is_featured
  ON recipes(is_featured) WHERE is_featured = TRUE AND deleted_at IS NULL;
