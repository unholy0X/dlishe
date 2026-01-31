-- DishFlow Initial Schema Rollback
-- Migration: 000001_init (down)

-- Drop triggers
DROP TRIGGER IF EXISTS shopping_items_updated_at ON shopping_items;
DROP TRIGGER IF EXISTS shopping_lists_updated_at ON shopping_lists;
DROP TRIGGER IF EXISTS pantry_items_updated_at ON pantry_items;
DROP TRIGGER IF EXISTS recipes_updated_at ON recipes;
DROP TRIGGER IF EXISTS users_updated_at ON users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at();

-- Drop tables (in reverse order of creation due to foreign keys)
DROP TABLE IF EXISTS usage_quotas;
DROP TABLE IF EXISTS shopping_items;
DROP TABLE IF EXISTS shopping_lists;
DROP TABLE IF EXISTS pantry_items;
DROP TABLE IF EXISTS video_jobs;
DROP TABLE IF EXISTS recipe_shares;
DROP TABLE IF EXISTS recipe_steps;
DROP TABLE IF EXISTS recipe_ingredients;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp";
