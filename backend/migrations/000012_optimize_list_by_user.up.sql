CREATE INDEX IF NOT EXISTS idx_recipes_user_created_at 
ON recipes(user_id, created_at DESC) 
WHERE deleted_at IS NULL;
