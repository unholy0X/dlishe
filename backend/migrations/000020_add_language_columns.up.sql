-- User's preferred content language for extraction fallback
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) NOT NULL DEFAULT 'en';

-- Language the recipe content is written in (set on every insert)
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS content_language VARCHAR(10) NOT NULL DEFAULT 'en';

-- Groups the EN + FR + AR versions of the same public recipe together.
-- NULL for all regular user recipes (Track B).
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS translation_group_id UUID DEFAULT NULL;

-- Index: fetch all translations of a public recipe by group
CREATE INDEX IF NOT EXISTS idx_recipes_translation_group
  ON recipes (translation_group_id)
  WHERE translation_group_id IS NOT NULL;

-- Index: fetch public recipes by language efficiently
CREATE INDEX IF NOT EXISTS idx_recipes_public_lang
  ON recipes (content_language, is_public, deleted_at)
  WHERE is_public = TRUE AND deleted_at IS NULL;
