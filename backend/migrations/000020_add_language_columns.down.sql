DROP INDEX IF EXISTS idx_recipes_public_lang;
DROP INDEX IF EXISTS idx_recipes_translation_group;
ALTER TABLE recipes DROP COLUMN IF EXISTS translation_group_id;
ALTER TABLE recipes DROP COLUMN IF EXISTS content_language;
ALTER TABLE users   DROP COLUMN IF EXISTS preferred_language;
