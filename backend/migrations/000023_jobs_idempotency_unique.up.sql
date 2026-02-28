-- Remove duplicate (user_id, idempotency_key) rows that would block the constraint.
-- Keeps the most recently created job for each duplicate pair; deletes the older ones.
DELETE FROM video_jobs
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY user_id, idempotency_key
                   ORDER BY created_at DESC
               ) AS rn
        FROM video_jobs
        WHERE idempotency_key IS NOT NULL
    ) ranked
    WHERE rn > 1
);

ALTER TABLE video_jobs
  ADD CONSTRAINT uq_video_jobs_idempotency
  UNIQUE (user_id, idempotency_key);
