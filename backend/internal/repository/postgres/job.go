package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/model"
)

var (
	ErrJobNotFound = errors.New("job not found")
)

// JobRepository handles video job database operations
type JobRepository struct {
	db *sql.DB
}

// NewJobRepository creates a new job repository
func NewJobRepository(db *sql.DB) *JobRepository {
	return &JobRepository{db: db}
}

// Create creates a new extraction job
func (r *JobRepository) Create(ctx context.Context, job *model.ExtractionJob) error {
	query := `
		INSERT INTO video_jobs (
			id, user_id, job_type, source_url, source_path, mime_type,
			language, detail_level, save_auto, status,
			progress, status_message, idempotency_key, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	_, err := r.db.ExecContext(ctx, query,
		job.ID,
		job.UserID,
		job.JobType,
		job.SourceURL,
		job.SourcePath,
		job.MimeType,
		job.Language,
		job.DetailLevel,
		job.SaveAuto,
		job.Status,
		job.Progress,
		job.StatusMessage,
		job.IdempotencyKey,
		job.CreatedAt,
	)

	return err
}

// GetByID retrieves a job by ID
func (r *JobRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.ExtractionJob, error) {
	query := `
		SELECT id, user_id, COALESCE(job_type, 'video'), source_url, source_path, mime_type,
			   language, detail_level, COALESCE(save_auto, true), status,
			   progress, status_message, result_recipe_id, error_code,
			   error_message, idempotency_key, started_at, completed_at, created_at
		FROM video_jobs
		WHERE id = $1
	`

	job := &model.ExtractionJob{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&job.ID,
		&job.UserID,
		&job.JobType,
		&job.SourceURL,
		&job.SourcePath,
		&job.MimeType,
		&job.Language,
		&job.DetailLevel,
		&job.SaveAuto,
		&job.Status,
		&job.Progress,
		&job.StatusMessage,
		&job.ResultRecipeID,
		&job.ErrorCode,
		&job.ErrorMessage,
		&job.IdempotencyKey,
		&job.StartedAt,
		&job.CompletedAt,
		&job.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrJobNotFound
		}
		return nil, err
	}

	return job, nil
}

// GetByIdempotencyKey retrieves a job by idempotency key
func (r *JobRepository) GetByIdempotencyKey(ctx context.Context, userID uuid.UUID, key string) (*model.ExtractionJob, error) {
	query := `
		SELECT id, user_id, COALESCE(job_type, 'video'), source_url, source_path, mime_type,
			   language, detail_level, COALESCE(save_auto, true), status,
			   progress, status_message, result_recipe_id, error_code,
			   error_message, idempotency_key, started_at, completed_at, created_at
		FROM video_jobs
		WHERE user_id = $1 AND idempotency_key = $2
	`

	job := &model.ExtractionJob{}
	err := r.db.QueryRowContext(ctx, query, userID, key).Scan(
		&job.ID,
		&job.UserID,
		&job.JobType,
		&job.SourceURL,
		&job.SourcePath,
		&job.MimeType,
		&job.Language,
		&job.DetailLevel,
		&job.SaveAuto,
		&job.Status,
		&job.Progress,
		&job.StatusMessage,
		&job.ResultRecipeID,
		&job.ErrorCode,
		&job.ErrorMessage,
		&job.IdempotencyKey,
		&job.StartedAt,
		&job.CompletedAt,
		&job.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrJobNotFound
		}
		return nil, err
	}

	return job, nil
}

// ListByUser retrieves all jobs for a user
func (r *JobRepository) ListByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.ExtractionJob, error) {
	query := `
		SELECT id, user_id, COALESCE(job_type, 'video'), source_url, source_path, mime_type,
			   language, detail_level, COALESCE(save_auto, true), status,
			   progress, status_message, result_recipe_id, error_code,
			   error_message, idempotency_key, started_at, completed_at, created_at
		FROM video_jobs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []*model.ExtractionJob
	for rows.Next() {
		job := &model.ExtractionJob{}
		err := rows.Scan(
			&job.ID,
			&job.UserID,
			&job.JobType,
			&job.SourceURL,
			&job.SourcePath,
			&job.MimeType,
			&job.Language,
			&job.DetailLevel,
			&job.SaveAuto,
			&job.Status,
			&job.Progress,
			&job.StatusMessage,
			&job.ResultRecipeID,
			&job.ErrorCode,
			&job.ErrorMessage,
			&job.IdempotencyKey,
			&job.StartedAt,
			&job.CompletedAt,
			&job.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		jobs = append(jobs, job)
	}

	return jobs, rows.Err()
}

// Update updates a job
func (r *JobRepository) Update(ctx context.Context, job *model.ExtractionJob) error {
	query := `
		UPDATE video_jobs SET
			status = $2, progress = $3, status_message = $4,
			result_recipe_id = $5, error_code = $6, error_message = $7,
			started_at = $8, completed_at = $9, source_path = $10, mime_type = $11
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query,
		job.ID,
		job.Status,
		job.Progress,
		job.StatusMessage,
		job.ResultRecipeID,
		job.ErrorCode,
		job.ErrorMessage,
		job.StartedAt,
		job.CompletedAt,
		job.SourcePath,
		job.MimeType,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrJobNotFound
	}

	return nil
}

// UpdateProgress updates just the progress fields
func (r *JobRepository) UpdateProgress(ctx context.Context, id uuid.UUID, status model.JobStatus, progress int, message string) error {
	query := `
		UPDATE video_jobs
		SET status = $2, progress = $3, status_message = $4
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query, id, status, progress, message)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrJobNotFound
	}

	return nil
}

// MarkStarted atomically marks a job as started
// Returns (true, nil) if successfully started
// Returns (false, nil) if job was already started by another goroutine
// Returns (_, error) on database error
// CRITICAL: This prevents race conditions where multiple goroutines try to process the same job
func (r *JobRepository) MarkStarted(ctx context.Context, id uuid.UUID) (bool, error) {
	query := `
		UPDATE video_jobs
		SET status = $2, started_at = $3
		WHERE id = $1 AND status = $4
		RETURNING id
	`

	now := time.Now().UTC()
	var returnedID uuid.UUID
	err := r.db.QueryRowContext(ctx, query, id, model.JobStatusDownloading, now, model.JobStatusPending).Scan(&returnedID)

	if err == sql.ErrNoRows {
		// Job was already started by another goroutine
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

// MarkCompleted marks a job as completed
func (r *JobRepository) MarkCompleted(ctx context.Context, id, recipeID uuid.UUID) error {
	query := `
		UPDATE video_jobs
		SET status = $2, progress = 100, result_recipe_id = $3,
			status_message = $4, completed_at = $5
		WHERE id = $1
	`

	now := time.Now().UTC()
	message := "Recipe extracted successfully"
	_, err := r.db.ExecContext(ctx, query, id, model.JobStatusCompleted, recipeID, message, now)
	return err
}

// MarkFailed marks a job as failed
func (r *JobRepository) MarkFailed(ctx context.Context, id uuid.UUID, errorCode, errorMessage string) error {
	query := `
		UPDATE video_jobs
		SET status = $2, error_code = $3, error_message = $4, completed_at = $5
		WHERE id = $1
	`

	now := time.Now().UTC()
	_, err := r.db.ExecContext(ctx, query, id, model.JobStatusFailed, errorCode, errorMessage, now)
	return err
}

// MarkCancelled marks a job as cancelled
func (r *JobRepository) MarkCancelled(ctx context.Context, id uuid.UUID) error {
	query := `
		UPDATE video_jobs
		SET status = $2, status_message = $3, completed_at = $4
		WHERE id = $1 AND status NOT IN ($5, $6, $7)
	`

	now := time.Now().UTC()
	message := "Job cancelled by user"
	result, err := r.db.ExecContext(ctx, query, id, model.JobStatusCancelled, message, now,
		model.JobStatusCompleted, model.JobStatusFailed, model.JobStatusCancelled)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return ErrJobNotFound
	}

	return nil
}

// CountPendingByUser counts pending/active jobs for a user
func (r *JobRepository) CountPendingByUser(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*) FROM video_jobs
		WHERE user_id = $1 AND status IN ($2, $3, $4, $5)
	`
	var count int
	err := r.db.QueryRowContext(ctx, query, userID,
		model.JobStatusPending,
		model.JobStatusDownloading,
		model.JobStatusProcessing,
		model.JobStatusExtracting,
	).Scan(&count)
	return count, err
}

// CountCompletedThisMonth counts completed extractions this month for a user
func (r *JobRepository) CountCompletedThisMonth(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*) FROM video_jobs
		WHERE user_id = $1
		AND status = $2
		AND completed_at >= date_trunc('month', CURRENT_DATE)
	`
	var count int
	err := r.db.QueryRowContext(ctx, query, userID, model.JobStatusCompleted).Scan(&count)
	return count, err
}

// MarkStuckJobsAsFailed finds jobs that have been in processing state too long and marks them as failed
func (r *JobRepository) MarkStuckJobsAsFailed(ctx context.Context, maxDuration time.Duration) (int, error) {
	query := `
		UPDATE video_jobs
		SET status = $1, 
		    error_code = $2, 
		    error_message = $3,
		    completed_at = $4
		WHERE status IN ($5, $6, $7, $8)
		AND started_at IS NOT NULL
		AND started_at < $9
		AND (completed_at IS NULL OR completed_at < started_at)
	`

	now := time.Now().UTC()
	cutoff := now.Add(-maxDuration)
	errorCode := "TIMEOUT"
	errorMessage := "Job timed out after exceeding maximum processing duration"

	result, err := r.db.ExecContext(ctx, query,
		model.JobStatusFailed,
		errorCode,
		errorMessage,
		now,
		model.JobStatusPending,
		model.JobStatusDownloading,
		model.JobStatusProcessing,
		model.JobStatusExtracting,
		cutoff,
	)
	if err != nil {
		return 0, err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}

	return int(rows), nil
}
