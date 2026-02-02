package handler

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
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

// Extract handles video extraction (DEPRECATED - use UnifiedExtractionHandler.Extract instead)
// This handler is kept for backwards compatibility but is no longer routed.
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

// GetJob (DEPRECATED - use UnifiedExtractionHandler.GetJob instead)
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
	localPath, thumbnailURL, err := h.downloader.Download(req.VideoURL)
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
	}()

	// Log thumbnail URL if found
	if thumbnailURL != "" {
		h.logger.Info("Thumbnail CDN URL extracted", "url", thumbnailURL)
	}

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

	// Use CDN thumbnail URL directly (no base64 encoding needed)
	var thumbnailURLPtr *string
	if thumbnailURL != "" {
		thumbnailURLPtr = &thumbnailURL
	}

	now := time.Now().UTC()
	recipe := &model.Recipe{
		ID:           uuid.New(),
		Title:        result.Title,
		Description:  &result.Description,
		Servings:     &result.Servings,
		PrepTime:     &result.PrepTime,
		CookTime:     &result.CookTime,
		Difficulty:   &result.Difficulty,
		Cuisine:      &result.Cuisine,
		ThumbnailURL: thumbnailURLPtr, // CDN URL from YouTube/TikTok
		SourceType:   "video",
		SourceURL:    &req.VideoURL,
		IsFavorite:   false,
		Tags:         result.Tags,
		CreatedAt:    now,
		UpdatedAt:    now,
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

// CancelJob (DEPRECATED - use UnifiedExtractionHandler.CancelJob instead)
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

// ListJobs (DEPRECATED - use UnifiedExtractionHandler.ListJobs instead)
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
