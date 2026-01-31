package model

import (
	"time"

	"github.com/google/uuid"
)

// JobStatus represents the status of a video extraction job
type JobStatus string

const (
	JobStatusPending     JobStatus = "pending"
	JobStatusDownloading JobStatus = "downloading"
	JobStatusProcessing  JobStatus = "processing"
	JobStatusExtracting  JobStatus = "extracting"
	JobStatusCompleted   JobStatus = "completed"
	JobStatusFailed      JobStatus = "failed"
	JobStatusCancelled   JobStatus = "cancelled"
)

// VideoJob represents a video-to-recipe extraction job
type VideoJob struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	UserID         uuid.UUID  `json:"userId" db:"user_id"`
	VideoURL       string     `json:"videoUrl" db:"video_url"`
	Language       string     `json:"language" db:"language"`         // "en", "fr", "es", "auto"
	DetailLevel    string     `json:"detailLevel" db:"detail_level"` // "quick", "detailed"
	Status         JobStatus  `json:"status" db:"status"`
	Progress       int        `json:"progress" db:"progress"`             // 0-100
	StatusMessage  *string    `json:"statusMessage,omitempty" db:"status_message"`
	ResultRecipeID *uuid.UUID `json:"resultRecipeId,omitempty" db:"result_recipe_id"`
	ErrorCode      *string    `json:"errorCode,omitempty" db:"error_code"`
	ErrorMessage   *string    `json:"errorMessage,omitempty" db:"error_message"`
	IdempotencyKey *string    `json:"-" db:"idempotency_key"`
	StartedAt      *time.Time `json:"startedAt,omitempty" db:"started_at"`
	CompletedAt    *time.Time `json:"completedAt,omitempty" db:"completed_at"`
	CreatedAt      time.Time  `json:"createdAt" db:"created_at"`
}

// JobResponse is the API response for a job
type JobResponse struct {
	JobID            string     `json:"jobId"`
	Status           JobStatus  `json:"status"`
	Progress         int        `json:"progress"`
	Message          string     `json:"message,omitempty"`
	StatusURL        string     `json:"statusUrl,omitempty"`
	StreamURL        string     `json:"streamUrl,omitempty"`
	EstimatedSeconds int        `json:"estimatedSeconds,omitempty"`
	Recipe           *Recipe    `json:"recipe,omitempty"`
	Error            *JobError  `json:"error,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
	CompletedAt      *time.Time `json:"completedAt,omitempty"`
}

// JobError represents an error in a job
type JobError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Retryable bool   `json:"retryable"`
}

// NewVideoJob creates a new video extraction job
func NewVideoJob(userID uuid.UUID, videoURL, language, detailLevel, idempotencyKey string) *VideoJob {
	return &VideoJob{
		ID:             uuid.New(),
		UserID:         userID,
		VideoURL:       videoURL,
		Language:       language,
		DetailLevel:    detailLevel,
		Status:         JobStatusPending,
		Progress:       0,
		IdempotencyKey: &idempotencyKey,
		CreatedAt:      time.Now().UTC(),
	}
}

// ToResponse converts a VideoJob to an API response
func (j *VideoJob) ToResponse(baseURL string) JobResponse {
	resp := JobResponse{
		JobID:     j.ID.String(),
		Status:    j.Status,
		Progress:  j.Progress,
		CreatedAt: j.CreatedAt,
	}

	if j.StatusMessage != nil {
		resp.Message = *j.StatusMessage
	}

	if j.Status == JobStatusPending || j.Status == JobStatusDownloading ||
	   j.Status == JobStatusProcessing || j.Status == JobStatusExtracting {
		resp.StatusURL = baseURL + "/api/v1/jobs/" + j.ID.String()
		resp.StreamURL = baseURL + "/api/v1/jobs/" + j.ID.String() + "/stream"
		resp.EstimatedSeconds = 45 // Default estimate
	}

	if j.CompletedAt != nil {
		resp.CompletedAt = j.CompletedAt
	}

	if j.Status == JobStatusFailed && j.ErrorCode != nil {
		resp.Error = &JobError{
			Code:      *j.ErrorCode,
			Message:   *j.ErrorMessage,
			Retryable: isRetryableError(*j.ErrorCode),
		}
	}

	return resp
}

// isRetryableError determines if an error code is retryable
func isRetryableError(code string) bool {
	retryableCodes := map[string]bool{
		"DOWNLOAD_FAILED":     true,
		"GEMINI_UNAVAILABLE":  true,
		"TIMEOUT":             true,
		"RATE_LIMITED":        true,
	}
	return retryableCodes[code]
}

// UpdateProgress updates the job progress and status message
func (j *VideoJob) UpdateProgress(status JobStatus, progress int, message string) {
	j.Status = status
	j.Progress = progress
	j.StatusMessage = &message
}

// MarkCompleted marks the job as completed with a recipe
func (j *VideoJob) MarkCompleted(recipeID uuid.UUID) {
	now := time.Now().UTC()
	j.Status = JobStatusCompleted
	j.Progress = 100
	j.ResultRecipeID = &recipeID
	j.CompletedAt = &now
	msg := "Recipe extracted successfully"
	j.StatusMessage = &msg
}

// MarkFailed marks the job as failed with an error
func (j *VideoJob) MarkFailed(code, message string) {
	now := time.Now().UTC()
	j.Status = JobStatusFailed
	j.ErrorCode = &code
	j.ErrorMessage = &message
	j.CompletedAt = &now
}

// MarkCancelled marks the job as cancelled
func (j *VideoJob) MarkCancelled() {
	now := time.Now().UTC()
	j.Status = JobStatusCancelled
	j.CompletedAt = &now
	msg := "Job cancelled by user"
	j.StatusMessage = &msg
}
