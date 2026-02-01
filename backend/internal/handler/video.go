package handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/service/ai"
)

// jobTimeout is the maximum time allowed for a video extraction job
const jobTimeout = 30 * time.Minute

// maxConcurrentJobs limits how many video extraction jobs can run simultaneously
const maxConcurrentJobs = 5

type VideoHandler struct {
	jobRepo    JobRepository
	recipeRepo RecipeRepository
	extractor  ai.RecipeExtractor
	downloader VideoDownloader
	logger     *slog.Logger

	// activeJobs stores cancel functions for running jobs
	activeJobs sync.Map // map[uuid.UUID]context.CancelFunc

	// jobSemaphore limits concurrent video processing jobs
	jobSemaphore chan struct{}
}

func NewVideoHandler(
	jobRepo JobRepository,
	recipeRepo RecipeRepository,
	extractor ai.RecipeExtractor,
	downloader VideoDownloader,
	logger *slog.Logger,
) *VideoHandler {
	return &VideoHandler{
		jobRepo:      jobRepo,
		recipeRepo:   recipeRepo,
		extractor:    extractor,
		downloader:   downloader,
		logger:       logger,
		jobSemaphore: make(chan struct{}, maxConcurrentJobs),
	}
}

// Extract handles POST /api/v1/video/extract
// @Summary Start video recipe extraction
// @Description Submit video URL for AI-powered recipe extraction (async job)
// @Tags Jobs
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body SwaggerVideoExtractRequest true "Video URL and options"
// @Success 201 {object} SwaggerJobResponse "Job created"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request body"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 429 {object} SwaggerErrorResponse "Rate limit exceeded (5/hour)"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /video/extract [post]
func (h *VideoHandler) Extract(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req ai.ExtractionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.VideoURL == "" {
		response.BadRequest(w, "Video URL is required")
		return
	}

	// Create Job
	idempotencyKey := uuid.New().String() // Simple unique key for now
	job := model.NewVideoJob(claims.UserID, req.VideoURL, req.Language, req.DetailLevel, idempotencyKey)

	if err := h.jobRepo.Create(r.Context(), job); err != nil {
		h.logger.Error("Failed to create job", "error", err)
		response.InternalError(w)
		return
	}

	// Create cancellable context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), jobTimeout)

	// Store cancel function for later cancellation
	h.activeJobs.Store(job.ID, cancel)

	// Start processing in background with concurrency limit
	go func() {
		defer cancel()
		defer h.activeJobs.Delete(job.ID)

		// Acquire semaphore (blocks if at max capacity)
		select {
		case h.jobSemaphore <- struct{}{}:
			// Acquired slot, proceed
			defer func() { <-h.jobSemaphore }() // Release slot when done
		case <-ctx.Done():
			// Context cancelled while waiting for slot
			if err := h.jobRepo.MarkFailed(context.Background(), job.ID, "TIMEOUT", "Job timed out waiting for processing slot"); err != nil {
				h.logger.Error("Failed to mark job as timed out", "jobID", job.ID, "error", err)
			}
			return
		}

		h.processJob(ctx, job.ID, req)
	}()

	response.Created(w, job.ToResponse("")) // BaseURL empty for now
}

// GetJob handles GET /api/v1/jobs/{jobID}
// @Summary Get job status
// @Description Get the current status of a video extraction job
// @Tags Jobs
// @Produce json
// @Security BearerAuth
// @Param jobID path string true "Job UUID"
// @Success 200 {object} SwaggerJobResponse "Job status"
// @Failure 400 {object} SwaggerErrorResponse "Invalid job ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 403 {object} SwaggerErrorResponse "Access denied"
// @Failure 404 {object} SwaggerErrorResponse "Job not found"
// @Router /jobs/{jobID} [get]
func (h *VideoHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "jobID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid job ID")
		return
	}

	job, err := h.jobRepo.GetByID(r.Context(), id)
	if err != nil {
		if err == postgres.ErrJobNotFound {
			response.NotFound(w, "Job not found")
			return
		}
		response.InternalError(w)
		return
	}

	if job.UserID != claims.UserID {
		response.Forbidden(w, "Access denied")
		return
	}

	// Include Recipe if completed
	var resultRecipe *model.Recipe
	if job.Status == model.JobStatusCompleted && job.ResultRecipeID != nil {
		resultRecipe, _ = h.recipeRepo.GetByID(r.Context(), *job.ResultRecipeID)
	}

	resp := job.ToResponse("")
	resp.Recipe = resultRecipe
	response.OK(w, resp)
}

// processJob handles the background processing
func (h *VideoHandler) processJob(ctx context.Context, jobID uuid.UUID, req ai.ExtractionRequest) {
	// Helper to check if cancelled
	isCancelled := func() bool {
		select {
		case <-ctx.Done():
			return true
		default:
			return false
		}
	}

	// Helper to update progress
	updateProgress := func(status model.JobStatus, progress int, msg string) {
		if isCancelled() {
			return
		}
		if err := h.jobRepo.UpdateProgress(ctx, jobID, status, progress, msg); err != nil {
			h.logger.Error("Failed to update job progress", "jobID", jobID, "error", err)
		}
	}

	// Helper to fail
	failJob := func(code, msg string) {
		if err := h.jobRepo.MarkFailed(ctx, jobID, code, msg); err != nil {
			h.logger.Error("Failed to mark job as failed", "jobID", jobID, "error", err)
		}
	}

	// Check if already cancelled before starting
	if isCancelled() {
		failJob("CANCELLED", "Job was cancelled before starting")
		return
	}

	updateProgress(model.JobStatusDownloading, 10, "Downloading video...")

	// 1. Download Video
	localPath, thumbnailPath, err := h.downloader.Download(req.VideoURL)
	if err != nil {
		if isCancelled() {
			failJob("CANCELLED", "Job was cancelled during download")
			return
		}
		h.logger.Error("Download failed", "error", err)
		failJob("DOWNLOAD_FAILED", "Failed to download video: "+err.Error())
		return
	}
	defer func() {
		if err := h.downloader.Cleanup(localPath); err != nil {
			h.logger.Warn("Failed to cleanup temp file", "path", localPath, "error", err)
		}
		// Cleanup thumbnail if it exists
		if thumbnailPath != "" {
			if err := h.downloader.Cleanup(thumbnailPath); err != nil {
				h.logger.Warn("Failed to cleanup thumbnail", "path", thumbnailPath, "error", err)
			}
		}
	}()

	// Check cancellation after download
	if isCancelled() {
		failJob("CANCELLED", "Job was cancelled after download")
		return
	}

	// 2. Extract Recipe
	// Repurpose req.VideoURL to pass local path to Gemini service
	extractReq := req
	extractReq.VideoURL = localPath

	result, err := h.extractor.ExtractRecipe(ctx, extractReq, func(status model.JobStatus, progress int, msg string) {
		updateProgress(status, progress, msg)
	})
	if err != nil {
		if isCancelled() || ctx.Err() != nil {
			failJob("CANCELLED", "Job was cancelled during extraction")
			return
		}
		h.logger.Error("Extraction failed", "error", err)
		failJob("EXTRACTION_FAILED", "AI processing failed: "+err.Error())
		return
	}

	// Check cancellation after extraction
	if isCancelled() {
		failJob("CANCELLED", "Job was cancelled after extraction")
		return
	}

	// 2.5. Refine Recipe
	updateProgress(model.JobStatusExtracting, 92, "Refining recipe...")
	refinedResult, err := h.extractor.RefineRecipe(ctx, result)
	if err != nil {
		h.logger.Warn("Refinement failed, using raw extraction", "error", err)
		// Fall back to original result if refinement fails
	} else {
		h.logger.Info("Recipe refined successfully")
		result = refinedResult
	}

	// Check cancellation after refinement
	if isCancelled() {
		failJob("CANCELLED", "Job was cancelled after refinement")
		return
	}

	// 3. Save Recipe
	updateProgress(model.JobStatusExtracting, 95, "Saving recipe...")

	// Prepare thumbnail URL (data URL from local file)
	var thumbnailURL *string
	if thumbnailPath != "" {
		thumbnailData, err := os.ReadFile(thumbnailPath)
		if err == nil {
			// Convert to base64 data URL
			dataURL := fmt.Sprintf("data:image/jpeg;base64,%s", base64.StdEncoding.EncodeToString(thumbnailData))
			thumbnailURL = &dataURL
			h.logger.Info("Thumbnail extracted successfully", "size", len(thumbnailData))
		} else {
			h.logger.Warn("Failed to read thumbnail file", "error", err)
		}
	}

	recipe := &model.Recipe{
		ID:           uuid.New(),
		Title:        result.Title,
		Description:  &result.Description,
		Servings:     &result.Servings,
		PrepTime:     &result.PrepTime,
		CookTime:     &result.CookTime,
		Difficulty:   &result.Difficulty,
		Cuisine:      &result.Cuisine,
		ThumbnailURL: thumbnailURL, // Use extracted thumbnail instead of AI result
		SourceType:   "video_extraction",
		SourceURL:    &req.VideoURL,
		IsFavorite:   false,
		Tags:         result.Tags,
	}

	// Get UserID from job
	job, err := h.jobRepo.GetByID(ctx, jobID)
	if err != nil {
		failJob("INTERNAL_ERROR", "Failed to retrieve job details")
		return
	}
	recipe.UserID = job.UserID

	// Convert ingredients with validation
	h.logger.Info("Converting ingredients", "count", len(result.Ingredients))
	for i, ing := range result.Ingredients {
		// Skip ingredients with empty names
		if ing.Name == "" {
			h.logger.Warn("Skipping ingredient with empty name", "index", i)
			continue
		}

		// Map safe fields
		unit := ing.Unit
		notes := ing.Notes

		// Validate and normalize category - CRITICAL: empty category causes DB failure
		category := model.NormalizeCategory(ing.Category)

		ts := int(ing.VideoTimestamp * 60)
		modelIng := model.RecipeIngredient{
			ID:             uuid.New(),
			RecipeID:       recipe.ID,
			Name:           ing.Name,
			Unit:           &unit,
			Category:       category,
			IsOptional:     ing.IsOptional,
			Notes:          &notes,
			VideoTimestamp: &ts,
			SortOrder:      i,
			CreatedAt:      recipe.CreatedAt,
		}

		// Try parsing quantity
		if ing.Quantity != "" {
			if val, err := strconv.ParseFloat(ing.Quantity, 64); err == nil {
				modelIng.Quantity = &val
			}
		}

		recipe.Ingredients = append(recipe.Ingredients, modelIng)
	}
	h.logger.Info("Ingredients converted", "finalCount", len(recipe.Ingredients))

	// Convert steps
	for i, step := range result.Steps {
		tech := step.Technique
		temp := step.Temperature
		dur := step.DurationSeconds
		start := int(step.VideoTimestampStart * 60)
		end := int(step.VideoTimestampEnd * 60)

		modelStep := model.RecipeStep{
			ID:                  uuid.New(),
			RecipeID:            recipe.ID,
			StepNumber:          i + 1,
			Instruction:         step.Instruction,
			DurationSeconds:     &dur,
			Technique:           &tech,
			Temperature:         &temp,
			VideoTimestampStart: &start,
			VideoTimestampEnd:   &end,
			CreatedAt:           recipe.CreatedAt,
		}
		recipe.Steps = append(recipe.Steps, modelStep)
	}

	if err := h.recipeRepo.Create(ctx, recipe); err != nil {
		h.logger.Error("Failed to save recipe", "error", err)
		failJob("SAVE_FAILED", "Failed to save extracted recipe")
		return
	}

	// 4. Complete Job
	if err := h.jobRepo.MarkCompleted(ctx, jobID, recipe.ID); err != nil {
		h.logger.Error("Failed to mark job completed", "error", err)
	}
}

// CancelJob handles POST /api/v1/jobs/{jobID}/cancel
// @Summary Cancel a job
// @Description Cancel a running video extraction job
// @Tags Jobs
// @Security BearerAuth
// @Param jobID path string true "Job UUID"
// @Success 204 "Job cancelled"
// @Failure 400 {object} SwaggerErrorResponse "Invalid job ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 403 {object} SwaggerErrorResponse "Access denied"
// @Failure 404 {object} SwaggerErrorResponse "Job not found"
// @Router /jobs/{jobID}/cancel [post]
func (h *VideoHandler) CancelJob(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "jobID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid job ID")
		return
	}

	// Verify ownership
	job, err := h.jobRepo.GetByID(r.Context(), id)
	if err != nil {
		if err == postgres.ErrJobNotFound {
			response.NotFound(w, "Job not found")
			return
		}
		response.InternalError(w)
		return
	}
	if job.UserID != claims.UserID {
		response.Forbidden(w, "Access denied")
		return
	}

	// Cancel the running job if it's active
	if cancelFn, ok := h.activeJobs.Load(id); ok {
		if cancel, ok := cancelFn.(context.CancelFunc); ok {
			cancel() // Signal the goroutine to stop
			h.logger.Info("Cancelled running job", "jobID", id)
		}
	}

	if err := h.jobRepo.MarkCancelled(r.Context(), id); err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// ListJobs handles GET /api/v1/jobs
// @Summary List user's jobs
// @Description Get list of video extraction jobs for the current user
// @Tags Jobs
// @Produce json
// @Security BearerAuth
// @Success 200 {array} SwaggerJobResponse "List of jobs"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /jobs [get]
func (h *VideoHandler) ListJobs(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	jobs, err := h.jobRepo.ListByUser(r.Context(), claims.UserID, 20, 0) // Simple limit for now
	if err != nil {
		response.InternalError(w)
		return
	}

	if jobs == nil {
		jobs = []*model.VideoJob{}
	}

	// Convert to response
	resp := make([]model.JobResponse, 0)
	for _, job := range jobs {
		jobResp := job.ToResponse("")

		// Populate basic recipe info if completed
		if job.Status == model.JobStatusCompleted && job.ResultRecipeID != nil {
			if recipe, err := h.recipeRepo.GetByID(r.Context(), *job.ResultRecipeID); err == nil {
				jobResp.Recipe = recipe
			}
		}

		resp = append(resp, jobResp)
	}

	response.OK(w, resp)
}
