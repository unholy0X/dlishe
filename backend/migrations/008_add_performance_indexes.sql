-- Migration: Add performance indexes for production
-- Date: 2026-02-03
-- Issue: #9 - Missing database indexes causing slow queries

-- Index for user's job history (most common query pattern)
-- Speeds up: GET /api/v1/jobs (with pagination)
CREATE INDEX IF NOT EXISTS idx_video_jobs_user_created 
    ON video_jobs(user_id, created_at DESC);

-- Index for active jobs (cleanup/monitoring queries)
-- Speeds up: Finding stuck jobs, monitoring active extractions
CREATE INDEX IF NOT EXISTS idx_video_jobs_user_status 
    ON video_jobs(user_id, status) 
    WHERE status IN ('pending', 'downloading', 'processing', 'extracting');

-- Index for recipe source URL lookups (deduplication check)
-- Speeds up: GetBySourceURL() - prevents duplicate recipe creation
-- Critical for cache hit detection
CREATE INDEX IF NOT EXISTS idx_recipes_user_source_url
    ON recipes(user_id, source_url)
    WHERE deleted_at IS NULL;

-- Index for recipe listing with soft-delete filter
-- Speeds up: GET /api/v1/recipes (user recipe list)
CREATE INDEX IF NOT EXISTS idx_recipes_user_deleted
    ON recipes(user_id, deleted_at, created_at DESC);

-- Composite index for shopping list queries
-- Speeds up: Shopping list item lookups
CREATE INDEX IF NOT EXISTS idx_shopping_items_list_category
    ON shopping_items(list_id, category)
    WHERE deleted_at IS NULL;
