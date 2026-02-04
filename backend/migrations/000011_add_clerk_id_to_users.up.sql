-- Migration: Add clerk_id to users for external auth integration
-- Date: 2026-02-04

-- Add clerk_id column (nullable for now to support data migration if needed, but intended to be unique)
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id VARCHAR(255);

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id) WHERE deleted_at IS NULL;

-- Comment
COMMENT ON COLUMN users.clerk_id IS 'External authentication ID from Clerk';
