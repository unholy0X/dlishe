-- Soft-delete for video_jobs
-- Prevents quota bypass: users can clear job history without resetting extraction count
ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Index for filtering active (non-deleted) jobs in list queries
CREATE INDEX IF NOT EXISTS idx_video_jobs_deleted_at ON video_jobs(user_id, deleted_at) WHERE deleted_at IS NULL;
