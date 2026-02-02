-- Rollback Unified Extraction Jobs Migration

-- Drop new index
DROP INDEX IF EXISTS idx_video_jobs_type;

-- Remove new columns
ALTER TABLE video_jobs DROP COLUMN IF EXISTS save_auto;
ALTER TABLE video_jobs DROP COLUMN IF EXISTS mime_type;
ALTER TABLE video_jobs DROP COLUMN IF EXISTS source_path;
ALTER TABLE video_jobs DROP COLUMN IF EXISTS job_type;

-- Rename source_url back to video_url
ALTER TABLE video_jobs RENAME COLUMN source_url TO video_url;
