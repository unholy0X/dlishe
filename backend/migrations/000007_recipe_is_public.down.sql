-- Rollback: Remove is_public column

DROP INDEX IF EXISTS idx_recipes_is_public;
ALTER TABLE recipes DROP COLUMN IF EXISTS is_public;
