ALTER TABLE video_jobs
  ADD CONSTRAINT uq_video_jobs_idempotency
  UNIQUE (user_id, idempotency_key);
