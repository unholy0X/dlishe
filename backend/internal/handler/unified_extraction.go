package handler

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/service/ai"
)

// UnifiedExtractionHandler handles all recipe extraction types (url, image, video)
type UnifiedExtractionHandler struct {
	jobRepo    JobRepository
	recipeRepo RecipeRepository
	extractor  ai.RecipeExtractor
	enricher   ai.RecipeEnricher
	cacheRepo  *postgres.ExtractionCacheRepository
	downloader VideoDownloader
	redis      *redis.Client
	logger     *slog.Logger

	// activeJobs stores cancel functions for running jobs
	activeJobs sync.Map // map[uuid.UUID]context.CancelFunc

	// semaphores limit concurrent processing jobs
	// Video jobs are heavy (download+processing), so we limit them strictly
	// URL/Image jobs are lighter, so we allow more concurrency
	videoSemaphore chan struct{}
	lightSemaphore chan struct{}

	// tempDir for storing temporary files
	tempDir string
}

// NewUnifiedExtractionHandler creates a new unified extraction handler
func NewUnifiedExtractionHandler(
	jobRepo JobRepository,
	recipeRepo RecipeRepository,
	extractor ai.RecipeExtractor,
	enricher ai.RecipeEnricher,
	cacheRepo *postgres.ExtractionCacheRepository,
	downloader VideoDownloader,
	redisClient *redis.Client,
	logger *slog.Logger,
) *UnifiedExtractionHandler {
	h := &UnifiedExtractionHandler{
		jobRepo:        jobRepo,
		recipeRepo:     recipeRepo,
		extractor:      extractor,
		enricher:       enricher,
		cacheRepo:      cacheRepo,
		downloader:     downloader,
		redis:          redisClient,
		logger:         logger,
		videoSemaphore: make(chan struct{}, 2),  // Max 2 concurrent video jobs
		lightSemaphore: make(chan struct{}, 20), // Max 20 concurrent URL/image jobs
		tempDir:        os.TempDir(),
	}

	// Start distributed cancellation listener
	if redisClient != nil {
		go h.subscribeToCancellation()
	}

	return h
}

// UnifiedExtractRequest represents a unified extraction request
type UnifiedExtractRequest struct {
	Type         string `json:"type"`                   // "url", "image", "video"
	URL          string `json:"url,omitempty"`          // For url and video types
	ImageBase64  string `json:"imageBase64,omitempty"`  // For image type (JSON)
	MimeType     string `json:"mimeType,omitempty"`     // For image type
	Language     string `json:"language,omitempty"`     // "en", "fr", "es", "auto"
	DetailLevel  string `json:"detailLevel,omitempty"`  // "quick", "detailed"
	SaveAuto     bool   `json:"saveAuto,omitempty"`     // Auto-save extracted recipe
	ForceRefresh bool   `json:"forceRefresh,omitempty"` // Bypass cache and re-extract
}

// Extract handles POST /api/v1/recipes/extract
// @Summary Extract recipe (unified)
// @Description Extract a recipe from URL, image, or video using AI. Returns a job ID for async processing.
// @Tags Recipes
// @Accept multipart/form-data,application/json
// @Produce json
// @Security BearerAuth
// @Param type formData string true "Extraction type" Enums(url, image, video)
// @Param url formData string false "URL for url/video extraction"
// @Param image formData file false "Image file for image extraction (multipart)"
// @Param language formData string false "Language hint" Enums(en, fr, es, auto)
// @Param detailLevel formData string false "Detail level" Enums(quick, detailed)
// @Param saveAuto formData bool false "Auto-save extracted recipe" default(true)
// @Param request body SwaggerUnifiedExtractRequest false "JSON request body"
// @Success 201 {object} SwaggerJobResponse "Job created"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 429 {object} SwaggerErrorResponse "Rate limit exceeded"
// @Failure 503 {object} SwaggerErrorResponse "Service unavailable"
// @Router /recipes/extract [post]
func (h *UnifiedExtractionHandler) Extract(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Check if extractor is available
	if h.extractor == nil {
		response.ErrorJSON(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE",
			"Recipe extraction service is not available", nil)
		return
	}

	// Parse request based on content type
	var req UnifiedExtractRequest
	var imageData []byte
	contentType := r.Header.Get("Content-Type")

	if strings.HasPrefix(contentType, "multipart/form-data") {
		// Handle multipart form upload
		if err := r.ParseMultipartForm(50 << 20); err != nil { // 50MB max for video
			response.BadRequest(w, "Failed to parse form: "+err.Error())
			return
		}
		defer r.MultipartForm.RemoveAll()

		req.Type = r.FormValue("type")
		req.URL = r.FormValue("url")
		req.Language = r.FormValue("language")
		req.DetailLevel = r.FormValue("detailLevel")
		req.SaveAuto = r.FormValue("saveAuto") != "false" // Default true
		req.ForceRefresh = r.FormValue("forceRefresh") == "true"
		req.MimeType = r.FormValue("mimeType")

		// Handle image file if present
		if file, header, err := r.FormFile("image"); err == nil {
			defer file.Close()
			imageData, err = io.ReadAll(file)
			if err != nil {
				response.BadRequest(w, "Failed to read image file")
				return
			}
			if req.MimeType == "" {
				req.MimeType = header.Header.Get("Content-Type")
				if req.MimeType == "" {
					req.MimeType = detectMimeType(imageData)
				}
			}
		}
	} else {
		// Handle JSON request
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		// Decode base64 image if provided
		if req.ImageBase64 != "" {
			var err error
			imageData, err = base64.StdEncoding.DecodeString(req.ImageBase64)
			if err != nil {
				response.ValidationFailed(w, "imageBase64", "Invalid base64 encoding")
				return
			}
			if req.MimeType == "" {
				req.MimeType = detectMimeType(imageData)
			}
		}

		// Default saveAuto to true for JSON requests if not explicitly set
		// Note: JSON unmarshalling sets false as default, so we check if the field was present
		// For simplicity, we'll default to true unless explicitly false in the request
	}

	// Validate type
	var jobType model.JobType
	switch strings.ToLower(req.Type) {
	case "url":
		jobType = model.JobTypeURL
	case "image":
		jobType = model.JobTypeImage
	case "video":
		jobType = model.JobTypeVideo
	default:
		response.ValidationFailed(w, "type", "Must be 'url', 'image', or 'video'")
		return
	}

	// Validate based on type
	switch jobType {
	case model.JobTypeURL:
		if req.URL == "" {
			response.ValidationFailed(w, "url", "URL is required for URL extraction")
			return
		}
		// SECURITY: Max URL length per RFC 2616 and browser limits
		// Prevents database bloat and DoS via huge URLs
		if len(req.URL) > 2083 {
			response.ValidationFailed(w, "url", "URL too long (max 2083 characters)")
			return
		}
		parsedURL, err := url.Parse(req.URL)
		if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
			response.ValidationFailed(w, "url", "Invalid URL format")
			return
		}

	case model.JobTypeImage:
		if len(imageData) == 0 {
			response.ValidationFailed(w, "image", "Image is required for image extraction")
			return
		}
		if len(imageData) > 10*1024*1024 {
			response.ValidationFailed(w, "image", "Image size exceeds 10MB limit")
			return
		}
		validTypes := map[string]bool{
			"image/jpeg": true, "image/png": true, "image/webp": true, "image/gif": true,
		}
		if !validTypes[req.MimeType] {
			response.ValidationFailed(w, "mimeType", "Unsupported image type. Use JPEG, PNG, WebP, or GIF")
			return
		}

	case model.JobTypeVideo:
		if req.URL == "" {
			response.ValidationFailed(w, "url", "Video URL is required for video extraction")
			return
		}
		// SECURITY: Same URLlength limit applies to video URLs
		if len(req.URL) > 2083 {
			response.ValidationFailed(w, "url", "URL too long (max 2083 characters)")
			return
		}
	}

	// Set defaults
	if req.Language == "" {
		req.Language = "auto"
	}
	if req.DetailLevel == "" {
		req.DetailLevel = "detailed"
	}

	// For image jobs, we can use the source URL to store the filename for better UX
	// This field is unused for image jobs anyway
	sourceURL := req.URL
	if jobType == model.JobTypeImage && strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		// Try to find the file header again to get filename
		// Since we already read the file, we need to be careful not to re-read body
		// But here we just need the filename from the already parsed form
		if r.MultipartForm != nil && r.MultipartForm.File != nil {
			if files := r.MultipartForm.File["image"]; len(files) > 0 {
				sourceURL = files[0].Filename
			}
		}
	}

	// Create job
	job := model.NewExtractionJob(
		user.ID,
		jobType,
		sourceURL,
		req.Language,
		req.DetailLevel,
		req.SaveAuto,
		req.ForceRefresh,
	)

	// For image jobs, save image to temp file
	if jobType == model.JobTypeImage && len(imageData) > 0 {
		tempPath := filepath.Join(h.tempDir, fmt.Sprintf("extract_%s.tmp", job.ID.String()))
		if err := os.WriteFile(tempPath, imageData, 0644); err != nil {
			h.logger.Error("Failed to save temp image", "error", err)
			response.InternalError(w)
			return
		}
		job.SetSourcePath(tempPath, req.MimeType)
	}

	// Save job to database
	if err := h.jobRepo.Create(r.Context(), job); err != nil {
		h.logger.Error("Failed to create job", "error", err)
		response.InternalError(w)
		return
	}

	// Create cancellable context with timeout
	timeout := 30 * time.Minute
	switch jobType {
	case model.JobTypeURL, model.JobTypeImage:
		timeout = 5 * time.Minute
	}
	// Use background context but carry over the logger from request
	reqLogger := middleware.GetLogger(r.Context())
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	ctx = context.WithValue(ctx, middleware.LoggerKey, reqLogger)

	// Store cancel function
	h.activeJobs.Store(job.ID, cancel)

	// Start processing in background
	go func() {
		defer cancel()
		defer h.activeJobs.Delete(job.ID)

		// Recover from any panics to prevent server crash
		defer func() {
			if r := recover(); r != nil {
				reqLogger.Error("Panic in job processing", "error", r, "jobID", job.ID)
				h.jobRepo.MarkFailed(context.Background(), job.ID, "INTERNAL_ERROR", "An unexpected error occurred")
			}
		}()

		// Acquire semaphore based on job type
		var semaphore chan struct{}
		if job.JobType == model.JobTypeVideo {
			semaphore = h.videoSemaphore
		} else {
			semaphore = h.lightSemaphore
		}

		select {
		case semaphore <- struct{}{}:
			defer func() { <-semaphore }()
		case <-ctx.Done():
			h.jobRepo.MarkFailed(context.Background(), job.ID, "TIMEOUT", "Job timed out waiting for processing slot")
			return
		}

		h.processJob(ctx, job)
	}()

	// Return job ID immediately
	response.Created(w, map[string]string{
		"jobId":  job.ID.String(),
		"status": string(job.Status),
	})
}

// processJob handles the background processing for all extraction types
func (h *UnifiedExtractionHandler) processJob(ctx context.Context, job *model.ExtractionJob) {
	logger := middleware.GetLogger(ctx)
	logger.Info("JobStarted",
		"job_id", job.ID,
		"type", job.JobType, // Changed from job.Type to job.JobType to match model.ExtractionJob
		"user_id", job.UserID,
		"source_url", job.SourceURL,
	)

	// Determine extraction strategy based on job type
	var err error

	// Mark status as extracting/downloading
	if job.JobType == model.JobTypeVideo {
		err = h.jobRepo.UpdateProgress(ctx, job.ID, model.JobStatusDownloading, 10, "Downloading video...")
	} else {
		err = h.jobRepo.UpdateProgress(ctx, job.ID, model.JobStatusExtracting, 10, "Analyzing content...")
	}

	if err != nil {
		logger.Error("Failed to update job status", "error", err, "job_id", job.ID)
		return
	}
	// CRITICAL: Clean up activeJobs map when job completes (success, failure, or cancellation)
	// This prevents unbounded memory growth as jobs accumulate
	defer func() {
		h.activeJobs.Delete(job.ID)
		h.logger.Debug("Cleaned up job from activeJobs map", "jobID", job.ID)
	}()

	// Helper functions
	isCancelled := func() bool {
		select {
		case <-ctx.Done():
			return true
		default:
			return false
		}
	}

	updateProgress := func(status model.JobStatus, progress int, msg string) {
		if !isCancelled() {
			h.jobRepo.UpdateProgress(ctx, job.ID, status, progress, msg)
		}
	}

	failJob := func(code, msg string) {
		h.jobRepo.MarkFailed(ctx, job.ID, code, msg)
	}

	if isCancelled() {
		failJob("CANCELLED", "Job was cancelled")
		return
	}

	var result *ai.ExtractionResult

	switch job.JobType {
	case model.JobTypeURL:
		result, err = h.processURLExtraction(ctx, job, updateProgress)
	case model.JobTypeImage:
		result, err = h.processImageExtraction(ctx, job, updateProgress)
	case model.JobTypeVideo:
		result, err = h.processVideoExtraction(ctx, job, updateProgress)
	default:
		failJob("INVALID_TYPE", "Unknown job type")
		return
	}

	if err != nil {
		if isCancelled() {
			failJob("CANCELLED", "Job was cancelled")
		} else if errors.Is(err, model.ErrIrrelevantContent) {
			failJob("CONTENT_IRRELEVANT", err.Error())
		} else {
			failJob("EXTRACTION_FAILED", err.Error())
		}
		return
	}

	if result == nil || result.Title == "" || len(result.Ingredients) == 0 {
		failJob("NO_RECIPE_FOUND", "No recipe could be extracted")
		return
	}

	// Log raw result for debugging (Monitoring Strategy)
	if resultJSON, err := json.Marshal(result); err == nil {
		logger.Info("GeminiRawResponse",
			"job_id", job.ID,
			"json_length", len(resultJSON),
			"payload", string(resultJSON),
		)
	}

	// Refine the recipe
	updateProgress(model.JobStatusExtracting, 85, "Refining recipe...")
	refined, refineErr := h.extractor.RefineRecipe(ctx, result)
	if refineErr == nil && refined != nil {
		result = refined
	}

	if isCancelled() {
		failJob("CANCELLED", "Job was cancelled")
		return
	}

	// Enrich with nutrition and dietary info
	var enrichment *ai.EnrichmentResult
	if h.enricher != nil {
		updateProgress(model.JobStatusExtracting, 90, "Analyzing nutrition and dietary info...")
		enrichInput := h.extractionResultToEnrichmentInput(result)
		enrichment, err = h.enricher.EnrichRecipe(ctx, enrichInput)
		if err != nil {
			// Log but continue without enrichment
			h.logger.Warn("Enrichment failed", "error", err)
		} else if enrichmentJSON, err := json.Marshal(enrichment); err == nil {
			// Log raw enrichment result (Monitoring Strategy)
			logger.Info("GeminiEnrichmentResult",
				"job_id", job.ID,
				"json_length", len(enrichmentJSON),
				"payload", string(enrichmentJSON),
			)
		}
	}

	if isCancelled() {
		failJob("CANCELLED", "Job was cancelled")
		return
	}

	// Cache URL/video extraction results (not images as they're not URL-based)
	if h.cacheRepo != nil && (job.JobType == model.JobTypeURL || job.JobType == model.JobTypeVideo) && job.SourceURL != "" {
		go h.cacheExtractionResult(job.SourceURL, result, enrichment)
	}

	// Save recipe if saveAuto is enabled
	if job.SaveAuto {
		updateProgress(model.JobStatusExtracting, 95, "Saving recipe...")
		recipeID, saveErr := h.saveExtractedRecipe(ctx, job, result, enrichment)
		if saveErr != nil {
			h.logger.Error("Failed to save recipe", "error", saveErr)
			failJob("SAVE_FAILED", "Failed to save recipe: "+saveErr.Error())
			return
		}
		h.jobRepo.MarkCompleted(ctx, job.ID, recipeID)
	} else {
		// Mark as completed without saving
		// Store result in status message for retrieval
		h.jobRepo.MarkCompleted(ctx, job.ID, uuid.Nil)
	}
}

// processURLExtraction handles URL extraction with caching
func (h *UnifiedExtractionHandler) processURLExtraction(ctx context.Context, job *model.ExtractionJob, updateProgress func(model.JobStatus, int, string)) (*ai.ExtractionResult, error) {
	// Check cache first (unless force refresh is requested)
	if h.cacheRepo != nil && !job.ForceRefresh {
		updateProgress(model.JobStatusProcessing, 5, "Checking cache...")
		cached, err := h.cacheRepo.GetByURL(ctx, job.SourceURL)
		if err == nil && cached != nil && cached.ExtractionResult != nil {
			h.logger.Info("Cache hit for URL extraction", "url", job.SourceURL)
			// Increment hit count asynchronously
			go h.cacheRepo.IncrementHitCount(context.Background(), cached.URLHash)
			// Convert cached data to extraction result
			return h.cachedDataToExtractionResult(cached.ExtractionResult), nil
		}
		// Cache miss - continue with extraction
	} else if job.ForceRefresh {
		h.logger.Info("Force refresh requested, bypassing cache", "url", job.SourceURL)
	}

	updateProgress(model.JobStatusProcessing, 10, "Fetching webpage...")

	result, err := h.extractor.ExtractFromWebpage(ctx, job.SourceURL, func(status model.JobStatus, progress int, msg string) {
		updateProgress(status, progress, msg)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to extract from URL: %w", err)
	}

	updateProgress(model.JobStatusExtracting, 70, "Processing recipe...")
	return result, nil
}

// cachedDataToExtractionResult converts cached data back to extraction result
func (h *UnifiedExtractionHandler) cachedDataToExtractionResult(cached *model.CachedExtractionData) *ai.ExtractionResult {
	result := &ai.ExtractionResult{
		Title:       cached.Title,
		Description: cached.Description,
		Servings:    cached.Servings,
		PrepTime:    cached.PrepTime,
		CookTime:    cached.CookTime,
		Difficulty:  cached.Difficulty,
		Cuisine:     cached.Cuisine,
		Tags:        cached.Tags,
		Thumbnail:   cached.ImageURL,
	}

	// Convert ingredients
	result.Ingredients = make([]ai.ExtractedIngredient, len(cached.Ingredients))
	for i, ing := range cached.Ingredients {
		result.Ingredients[i] = ai.ExtractedIngredient{
			Name:           ing.Name,
			Quantity:       ing.Quantity,
			Unit:           ing.Unit,
			Category:       ing.Category,
			IsOptional:     ing.IsOptional,
			Notes:          ing.Notes,
			VideoTimestamp: ing.VideoTimestamp,
		}
	}

	// Convert steps
	result.Steps = make([]ai.ExtractedStep, len(cached.Steps))
	for i, step := range cached.Steps {
		result.Steps[i] = ai.ExtractedStep{
			StepNumber:          step.StepNumber,
			Instruction:         step.Instruction,
			DurationSeconds:     step.DurationSeconds,
			Technique:           step.Technique,
			Temperature:         step.Temperature,
			VideoTimestampStart: step.VideoTimestampStart,
			VideoTimestampEnd:   step.VideoTimestampEnd,
		}
	}

	return result
}

// processImageExtraction handles image extraction
func (h *UnifiedExtractionHandler) processImageExtraction(ctx context.Context, job *model.ExtractionJob, updateProgress func(model.JobStatus, int, string)) (*ai.ExtractionResult, error) {
	updateProgress(model.JobStatusProcessing, 10, "Reading image...")

	if job.SourcePath == nil || *job.SourcePath == "" {
		return nil, fmt.Errorf("image source path not found")
	}

	imageData, err := os.ReadFile(*job.SourcePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read image: %w", err)
	}

	// Cleanup temp file after reading
	defer os.Remove(*job.SourcePath)

	mimeType := "image/jpeg"
	if job.MimeType != nil {
		mimeType = *job.MimeType
	}

	// Use filename from SourceURL if available for better feedback
	msg := "Extracting recipe from image..."
	if job.SourceURL != "" && job.SourceURL != "image" {
		msg = fmt.Sprintf("Analyzing image: %s...", job.SourceURL)
	}

	updateProgress(model.JobStatusExtracting, 30, msg)

	result, err := h.extractor.ExtractFromImage(ctx, imageData, mimeType)
	if err != nil {
		return nil, fmt.Errorf("failed to extract from image: %w", err)
	}

	updateProgress(model.JobStatusExtracting, 70, "Processing recipe...")
	return result, nil
}

// processVideoExtraction handles video extraction
func (h *UnifiedExtractionHandler) processVideoExtraction(ctx context.Context, job *model.ExtractionJob, updateProgress func(model.JobStatus, int, string)) (*ai.ExtractionResult, error) {
	// Check cache first (unless force refresh is requested)
	if h.cacheRepo != nil && !job.ForceRefresh {
		updateProgress(model.JobStatusProcessing, 5, "Checking cache...")
		cached, err := h.cacheRepo.GetByURL(ctx, job.SourceURL)
		if err == nil && cached != nil && cached.ExtractionResult != nil {
			h.logger.Info("Cache hit for video extraction", "url", job.SourceURL)
			// Increment hit count asynchronously
			go h.cacheRepo.IncrementHitCount(context.Background(), cached.URLHash)
			// Convert cached data to extraction result
			return h.cachedDataToExtractionResult(cached.ExtractionResult), nil
		}
		// Cache miss - continue with extraction
		h.logger.Info("Cache miss for video extraction", "url", job.SourceURL)
	} else if job.ForceRefresh {
		h.logger.Info("Force refresh requested, bypassing cache", "url", job.SourceURL)
	}

	updateProgress(model.JobStatusDownloading, 10, "Downloading video...")

	localPath, thumbnailURL, err := h.downloader.Download(ctx, job.SourceURL)
	if err != nil {
		return nil, fmt.Errorf("failed to download video: %w", err)
	}
	defer h.downloader.Cleanup(localPath)

	// Log thumbnail URL if found
	if thumbnailURL != "" {
		h.logger.Info("Thumbnail CDN URL extracted", "url", thumbnailURL)
	}

	// Fetch metadata (title, description)
	var metadataStr string
	meta, err := h.downloader.GetMetadata(ctx, job.SourceURL)
	if err != nil {
		h.logger.Warn("Failed to fetch video metadata", "error", err, "url", job.SourceURL)
	} else {
		h.logger.Info("Video metadata fetched", "title", meta.Title, "description_len", len(meta.Description))
		// Format metadata for AI
		metadataStr = fmt.Sprintf("Video Title: %s\nVideo Description:\n%s", meta.Title, meta.Description)

		// Update status with video title for better user feedback
		updateProgress(model.JobStatusExtracting, 40, fmt.Sprintf("Analyzing video: %s...", meta.Title))
	}

	if metadataStr == "" {
		updateProgress(model.JobStatusExtracting, 40, "Extracting recipe from video...")
	}

	extractReq := ai.ExtractionRequest{
		VideoURL:    localPath,
		Language:    job.Language,
		DetailLevel: job.DetailLevel,
		Metadata:    metadataStr,
	}

	result, err := h.extractor.ExtractRecipe(ctx, extractReq, func(status model.JobStatus, progress int, msg string) {
		updateProgress(status, progress, msg)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to extract from video: %w", err)
	}

	// Use CDN thumbnail URL if extraction didn't provide one
	if result != nil && result.Thumbnail == "" && thumbnailURL != "" {
		result.Thumbnail = thumbnailURL
	}

	return result, nil
}

// extractionResultToEnrichmentInput converts extraction result to enrichment input
func (h *UnifiedExtractionHandler) extractionResultToEnrichmentInput(result *ai.ExtractionResult) *ai.EnrichmentInput {
	ingredients := make([]string, len(result.Ingredients))
	for i, ing := range result.Ingredients {
		// Format as "quantity unit name (notes)"
		formatted := ""
		if ing.Quantity != "" {
			formatted = ing.Quantity
		}
		if ing.Unit != "" {
			if formatted != "" {
				formatted += " "
			}
			formatted += ing.Unit
		}
		if formatted != "" {
			formatted += " "
		}
		formatted += ing.Name
		if ing.Notes != "" {
			formatted += " (" + ing.Notes + ")"
		}
		ingredients[i] = formatted
	}

	steps := make([]string, len(result.Steps))
	for i, step := range result.Steps {
		steps[i] = step.Instruction
	}

	return &ai.EnrichmentInput{
		Title:       result.Title,
		Servings:    result.Servings,
		Ingredients: ingredients,
		Steps:       steps,
		PrepTime:    result.PrepTime,
		CookTime:    result.CookTime,
		Cuisine:     result.Cuisine,
	}
}

// cacheExtractionResult saves the extraction result to cache
func (h *UnifiedExtractionHandler) cacheExtractionResult(url string, result *ai.ExtractionResult, enrichment *ai.EnrichmentResult) {
	// Recover from any panics to prevent goroutine crash
	defer func() {
		if r := recover(); r != nil {
			h.logger.Error("Panic in cacheExtractionResult", "error", r, "url", url)
		}
	}()

	// Safety check
	if result == nil {
		h.logger.Warn("Cannot cache nil extraction result", "url", url)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Build cached data
	cachedData := &model.CachedExtractionData{
		Title:       result.Title,
		Description: result.Description,
		Servings:    result.Servings,
		PrepTime:    result.PrepTime,
		CookTime:    result.CookTime,
		Difficulty:  result.Difficulty,
		Cuisine:     result.Cuisine,
		Tags:        result.Tags,
		SourceURL:   url,
		ImageURL:    result.Thumbnail,
	}

	// Update servings from enrichment if extraction didn't provide
	if cachedData.Servings == 0 && enrichment != nil && enrichment.ServingsEstimate != nil {
		if enrichment.ServingsEstimate.Confidence >= ai.MinConfidenceThreshold {
			cachedData.Servings = enrichment.ServingsEstimate.Value
		}
	}

	// Convert ingredients
	cachedData.Ingredients = make([]model.CachedIngredient, len(result.Ingredients))
	for i, ing := range result.Ingredients {
		cachedData.Ingredients[i] = model.CachedIngredient{
			Name:           ing.Name,
			Quantity:       ing.Quantity,
			Unit:           ing.Unit,
			Category:       ing.Category,
			IsOptional:     ing.IsOptional,
			Notes:          ing.Notes,
			VideoTimestamp: ing.VideoTimestamp,
		}
	}

	// Convert steps
	cachedData.Steps = make([]model.CachedStep, len(result.Steps))
	for i, step := range result.Steps {
		cachedData.Steps[i] = model.CachedStep{
			StepNumber:          step.StepNumber,
			Instruction:         step.Instruction,
			DurationSeconds:     step.DurationSeconds,
			Technique:           step.Technique,
			Temperature:         step.Temperature,
			VideoTimestampStart: step.VideoTimestampStart,
			VideoTimestampEnd:   step.VideoTimestampEnd,
		}
	}

	// Add enrichment data
	if enrichment != nil {
		if enrichment.Nutrition != nil && enrichment.Nutrition.Confidence >= ai.MinConfidenceThreshold {
			cachedData.Nutrition = &model.RecipeNutrition{
				Calories:   enrichment.Nutrition.PerServing.Calories,
				Protein:    enrichment.Nutrition.PerServing.Protein,
				Carbs:      enrichment.Nutrition.PerServing.Carbs,
				Fat:        enrichment.Nutrition.PerServing.Fat,
				Fiber:      enrichment.Nutrition.PerServing.Fiber,
				Sugar:      enrichment.Nutrition.PerServing.Sugar,
				Sodium:     enrichment.Nutrition.PerServing.Sodium,
				Tags:       enrichment.Nutrition.Tags,
				Confidence: enrichment.Nutrition.Confidence,
			}
		}
		if enrichment.DietaryInfo != nil && enrichment.DietaryInfo.Confidence >= ai.MinConfidenceThreshold {
			cachedData.DietaryInfo = &model.DietaryInfo{
				Allergens: enrichment.DietaryInfo.Allergens,
				MealTypes: enrichment.DietaryInfo.MealTypes,
			}
			if enrichment.DietaryInfo.IsVegetarian != nil {
				cachedData.DietaryInfo.IsVegetarian = *enrichment.DietaryInfo.IsVegetarian
			}
			if enrichment.DietaryInfo.IsVegan != nil {
				cachedData.DietaryInfo.IsVegan = *enrichment.DietaryInfo.IsVegan
			}
			if enrichment.DietaryInfo.IsGlutenFree != nil {
				cachedData.DietaryInfo.IsGlutenFree = *enrichment.DietaryInfo.IsGlutenFree
			}
			if enrichment.DietaryInfo.IsDairyFree != nil {
				cachedData.DietaryInfo.IsDairyFree = *enrichment.DietaryInfo.IsDairyFree
			}
			if enrichment.DietaryInfo.IsNutFree != nil {
				cachedData.DietaryInfo.IsNutFree = *enrichment.DietaryInfo.IsNutFree
			}
			if enrichment.DietaryInfo.IsKeto != nil {
				cachedData.DietaryInfo.IsKeto = *enrichment.DietaryInfo.IsKeto
			}
			if enrichment.DietaryInfo.IsHalal != nil {
				cachedData.DietaryInfo.IsHalal = *enrichment.DietaryInfo.IsHalal
			}
			if enrichment.DietaryInfo.IsKosher != nil {
				cachedData.DietaryInfo.IsKosher = *enrichment.DietaryInfo.IsKosher
			}
		}
	}

	// Save to cache
	cache := model.NewExtractionCache(url, cachedData)
	if err := h.cacheRepo.Set(ctx, cache); err != nil {
		h.logger.Warn("Failed to cache extraction result", "error", err, "url", url)
	} else {
		h.logger.Info("Cached extraction result", "url", url)
	}
}

// saveExtractedRecipe saves the extracted recipe to the database
func (h *UnifiedExtractionHandler) saveExtractedRecipe(ctx context.Context, job *model.ExtractionJob, result *ai.ExtractionResult, enrichment *ai.EnrichmentResult) (uuid.UUID, error) {
	sourceType := "extraction"
	switch job.JobType {
	case model.JobTypeURL:
		sourceType = "webpage"
	case model.JobTypeImage:
		sourceType = "image"
	case model.JobTypeVideo:
		sourceType = "video"
	}

	// DEDUPLICATION: Check if user already has a recipe from this source URL
	// This prevents duplicates when the same URL is submitted multiple times
	if job.SourceURL != "" {
		// Normalize URL before checking to handle variations (mobile URLs, query params, etc.)
		normalizedURL := model.NormalizeURL(job.SourceURL)
		existingRecipe, err := h.recipeRepo.GetBySourceURL(ctx, job.UserID, normalizedURL)
		if err == nil && existingRecipe != nil {
			// Recipe already exists! Return existing ID instead of creating duplicate
			h.logger.Info("Recipe from this URL already exists for user, returning existing recipe",
				"recipeID", existingRecipe.ID,
				"userID", job.UserID,
				"sourceURL", normalizedURL)
			return existingRecipe.ID, nil
		}
		// If err is ErrRecipeNotFound, continue with creation
	}

	recipe := &model.Recipe{
		ID:           uuid.New(),
		UserID:       job.UserID,
		Title:        result.Title,
		Description:  stringPtr(result.Description),
		Servings:     intPtr(result.Servings),
		PrepTime:     intPtr(result.PrepTime),
		CookTime:     intPtr(result.CookTime),
		Difficulty:   stringPtr(result.Difficulty),
		Cuisine:      stringPtr(result.Cuisine),
		SourceType:   sourceType,
		SourceURL:    stringPtr(job.SourceURL),
		ThumbnailURL: stringPtr(result.Thumbnail),
		Tags:         result.Tags,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	// Apply enrichment data
	if enrichment != nil {
		// Use servings estimate if extraction didn't provide
		if recipe.Servings == nil && enrichment.ServingsEstimate != nil && enrichment.ServingsEstimate.Confidence >= ai.MinConfidenceThreshold {
			recipe.Servings = &enrichment.ServingsEstimate.Value
		}

		// Apply nutrition
		if enrichment.Nutrition != nil && enrichment.Nutrition.Confidence >= ai.MinConfidenceThreshold {
			recipe.Nutrition = &model.RecipeNutrition{
				Calories:   enrichment.Nutrition.PerServing.Calories,
				Protein:    enrichment.Nutrition.PerServing.Protein,
				Carbs:      enrichment.Nutrition.PerServing.Carbs,
				Fat:        enrichment.Nutrition.PerServing.Fat,
				Fiber:      enrichment.Nutrition.PerServing.Fiber,
				Sugar:      enrichment.Nutrition.PerServing.Sugar,
				Sodium:     enrichment.Nutrition.PerServing.Sodium,
				Tags:       enrichment.Nutrition.Tags,
				Confidence: enrichment.Nutrition.Confidence,
			}
		}

		// Apply dietary info
		if enrichment.DietaryInfo != nil && enrichment.DietaryInfo.Confidence >= ai.MinConfidenceThreshold {
			recipe.DietaryInfo = &model.DietaryInfo{
				Allergens: enrichment.DietaryInfo.Allergens,
				MealTypes: enrichment.DietaryInfo.MealTypes,
			}
			if enrichment.DietaryInfo.IsVegetarian != nil {
				recipe.DietaryInfo.IsVegetarian = *enrichment.DietaryInfo.IsVegetarian
			}
			if enrichment.DietaryInfo.IsVegan != nil {
				recipe.DietaryInfo.IsVegan = *enrichment.DietaryInfo.IsVegan
			}
			if enrichment.DietaryInfo.IsGlutenFree != nil {
				recipe.DietaryInfo.IsGlutenFree = *enrichment.DietaryInfo.IsGlutenFree
			}
			if enrichment.DietaryInfo.IsDairyFree != nil {
				recipe.DietaryInfo.IsDairyFree = *enrichment.DietaryInfo.IsDairyFree
			}
			if enrichment.DietaryInfo.IsNutFree != nil {
				recipe.DietaryInfo.IsNutFree = *enrichment.DietaryInfo.IsNutFree
			}
			if enrichment.DietaryInfo.IsKeto != nil {
				recipe.DietaryInfo.IsKeto = *enrichment.DietaryInfo.IsKeto
			}
			if enrichment.DietaryInfo.IsHalal != nil {
				recipe.DietaryInfo.IsHalal = *enrichment.DietaryInfo.IsHalal
			}
			if enrichment.DietaryInfo.IsKosher != nil {
				recipe.DietaryInfo.IsKosher = *enrichment.DietaryInfo.IsKosher
			}
		}
	}

	// Convert ingredients
	for i, ing := range result.Ingredients {
		if ing.Name == "" {
			continue
		}

		qty := parseQuantity(ing.Quantity)
		category := model.NormalizeCategory(ing.Category)

		recipe.Ingredients = append(recipe.Ingredients, model.RecipeIngredient{
			ID:         uuid.New(),
			RecipeID:   recipe.ID,
			Name:       ing.Name,
			Quantity:   qty,
			Unit:       stringPtr(ing.Unit),
			Category:   category,
			IsOptional: ing.IsOptional,
			Notes:      stringPtr(ing.Notes),
			SortOrder:  i,
		})
	}

	// Convert steps
	for _, step := range result.Steps {
		recipe.Steps = append(recipe.Steps, model.RecipeStep{
			ID:              uuid.New(),
			RecipeID:        recipe.ID,
			StepNumber:      step.StepNumber,
			Instruction:     step.Instruction,
			DurationSeconds: intPtr(step.DurationSeconds),
			Technique:       stringPtr(step.Technique),
			Temperature:     stringPtr(step.Temperature),
		})
	}

	if err := h.recipeRepo.Create(ctx, recipe); err != nil {
		return uuid.Nil, err
	}

	return recipe.ID, nil
}

// CancelJobInternal cancels a running extraction job (internal use)
func (h *UnifiedExtractionHandler) CancelJobInternal(jobID uuid.UUID) {
	if cancelFn, ok := h.activeJobs.Load(jobID); ok {
		if cancel, ok := cancelFn.(context.CancelFunc); ok {
			cancel()
		}
	}
}

// GetJob handles GET /api/v1/jobs/{jobID}
// @Summary Get job status
// @Description Get the current status of an extraction job (url, image, or video)
// @Tags Jobs
// @Produce json
// @Security BearerAuth

// subscribeToCancellation listens for cancellation messages from other instances
func (h *UnifiedExtractionHandler) subscribeToCancellation() {
	ctx := context.Background()
	pubsub := h.redis.Subscribe(ctx, "jobs:cancellation")
	defer pubsub.Close()

	ch := pubsub.Channel()

	h.logger.Info("Started distributed cancellation listener")

	for msg := range ch {
		jobIDStr := msg.Payload
		jobID, err := uuid.Parse(jobIDStr)
		if err != nil {
			continue
		}

		// Check if we have this job running locally
		if cancelFn, ok := h.activeJobs.Load(jobID); ok {
			if cancel, ok := cancelFn.(context.CancelFunc); ok {
				h.logger.Info("Received distributed cancellation signal", "jobID", jobID)
				cancel()
			}
		}
	}
}

// CancelJob handles POST /api/v1/jobs/{jobID}/cancel
// @Summary Cancel a running job
// @Description Cancel a job by ID. Works across distributed instances via Redis Pub/Sub.
// @Tags Jobs
// @Security BearerAuth
// @Param jobID path string true "Job ID"
// @Success 204 "Job cancelled"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Job not found"
// @Router /jobs/{jobID}/cancel [post]
func (h *UnifiedExtractionHandler) CancelJob(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
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
	if job.UserID != user.ID {
		response.Forbidden(w, "Access denied")
		return
	}

	// 1. Cancel locally if present (fast path)
	if cancelFn, ok := h.activeJobs.Load(id); ok {
		if cancel, ok := cancelFn.(context.CancelFunc); ok {
			cancel()
			h.logger.Info("Cancelled job locally", "jobID", id)
		}
	}

	// 2. Publish cancellation signal to other instances
	if h.redis != nil {
		if err := h.redis.Publish(r.Context(), "jobs:cancellation", id.String()).Err(); err != nil {
			h.logger.Error("Failed to publish cancellation signal", "error", err, "jobID", id)
		}
	}

	// 3. Mark in DB as cancelled
	if err := h.jobRepo.MarkCancelled(r.Context(), id); err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// ListJobs returns a list of jobs for the user
func (h *UnifiedExtractionHandler) ListJobs(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	limit := 20
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 100 {
			limit = val
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil && val >= 0 {
			offset = val
		}
	}

	jobs, err := h.jobRepo.ListByUser(r.Context(), user.ID, limit, offset)
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

// GetJob returns a single job
func (h *UnifiedExtractionHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
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

	if job.UserID != user.ID {
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

// DeleteJob deletes a single job
func (h *UnifiedExtractionHandler) DeleteJob(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	jobIDStr := chi.URLParam(r, "jobID")
	jobID, err := uuid.Parse(jobIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid job ID")
		return
	}

	// First verify ownership
	job, err := h.jobRepo.GetByID(r.Context(), jobID)
	if err != nil {
		if errors.Is(err, postgres.ErrJobNotFound) {
			response.NotFound(w, "Job not found")
			return
		}
		response.InternalError(w)
		return
	}

	if job.UserID != user.ID {
		response.Forbidden(w, "Not authorized to access this job")
		return
	}

	// Cancel if active (just in case, though usually users delete finished jobs)
	if cancel, ok := h.activeJobs.Load(jobID); ok {
		cancel.(context.CancelFunc)()
		h.activeJobs.Delete(jobID)
	}

	// Delete from DB
	if err := h.jobRepo.Delete(r.Context(), jobID, user.ID); err != nil {
		h.logger.Error("Failed to delete job", "error", err)
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// ClearJobHistory deletes all finished jobs for the user
func (h *UnifiedExtractionHandler) ClearJobHistory(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	if err := h.jobRepo.DeleteAllByUser(r.Context(), user.ID); err != nil {
		h.logger.Error("Failed to clear job history", "error", err)
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}
