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

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/service/ai"
)

type VideoHandler struct {
	jobRepo    JobRepository
	recipeRepo RecipeRepository
	extractor  ai.RecipeExtractor
	downloader VideoDownloader
	logger     *slog.Logger
}

func NewVideoHandler(
	jobRepo JobRepository,
	recipeRepo RecipeRepository,
	extractor ai.RecipeExtractor,
	downloader VideoDownloader,
	logger *slog.Logger,
) *VideoHandler {
	return &VideoHandler{
		jobRepo:    jobRepo,
		recipeRepo: recipeRepo,
		extractor:  extractor,
		downloader: downloader,
		logger:     logger,
	}
}

// Extract handles the video extraction request
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

	// Start processing in background
	go h.processJob(job.ID, req)

	response.Created(w, job.ToResponse("")) // BaseURL empty for now
}

// GetJob retrieves a job status
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
func (h *VideoHandler) processJob(jobID uuid.UUID, req ai.ExtractionRequest) {
	ctx := context.Background() // New context for background task

	// Helper to update progress
	updateProgress := func(status model.JobStatus, progress int, msg string) {
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

	updateProgress(model.JobStatusDownloading, 10, "Downloading video...")

	// 1. Download Video
	localPath, thumbnailPath, err := h.downloader.Download(req.VideoURL)
	if err != nil {
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

	// 2. Extract Recipe
	// Repurpose req.VideoURL to pass local path to Gemini service
	extractReq := req
	extractReq.VideoURL = localPath

	result, err := h.extractor.ExtractRecipe(ctx, extractReq, func(status model.JobStatus, progress int, msg string) {
		updateProgress(status, progress, msg)
	})
	if err != nil {
		h.logger.Error("Extraction failed", "error", err)
		failJob("EXTRACTION_FAILED", "AI processing failed: "+err.Error())
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

	// Convert ingredients
	for i, ing := range result.Ingredients {
		// Map safe fields
		unit := ing.Unit
		notes := ing.Notes

		ts := int(ing.VideoTimestamp * 60)
		modelIng := model.RecipeIngredient{
			ID:             uuid.New(),
			RecipeID:       recipe.ID,
			Name:           ing.Name,
			Unit:           &unit,
			Category:       ing.Category,
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

// CancelJob handles job cancellation
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

	if err := h.jobRepo.MarkCancelled(r.Context(), id); err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// ListJobs lists jobs for the current user
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
