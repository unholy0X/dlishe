DROP INDEX IF EXISTS idx_video_jobs_deleted_at;
ALTER TABLE video_jobs DROP COLUMN IF EXISTS deleted_at;
