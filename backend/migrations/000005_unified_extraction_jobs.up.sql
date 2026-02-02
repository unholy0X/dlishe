-- Unified Extraction Jobs Migration
-- Adds support for URL and image extraction alongside video extraction

-- Add job_type column with default 'video' for backwards compatibility
ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(20) DEFAULT 'video';

-- Rename video_url to source_url for consistency (keep video_url as alias)
ALTER TABLE video_jobs RENAME COLUMN video_url TO source_url;

-- Add source_path for storing temp file paths (images)
ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS source_path TEXT;

-- Add mime_type for image extraction
ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

-- Add save_auto flag
ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS save_auto BOOLEAN DEFAULT TRUE;

-- Update existing records to have job_type = 'video'
UPDATE video_jobs SET job_type = 'video' WHERE job_type IS NULL;

-- Add index for job_type filtering
CREATE INDEX IF NOT EXISTS idx_video_jobs_type ON video_jobs(user_id, job_type);

-- Comment: Table is still named video_jobs for backwards compatibility
-- In a future major version, consider renaming to extraction_jobs
