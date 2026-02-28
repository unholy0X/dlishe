package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
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
	jobRepo             JobRepository
	recipeRepo          RecipeRepository
	userRepo            UserRepository
	extractor           ai.RecipeExtractor
	enricher            ai.RecipeEnricher
	cacheRepo           *postgres.ExtractionCacheRepository
	downloader          VideoDownloader
	instagramDownloader InstagramVideoDownloader
	redis               *redis.Client
	logger              *slog.Logger

	// activeJobs stores cancel functions for running jobs
	activeJobs sync.Map // map[uuid.UUID]context.CancelFunc

	// semaphores limit concurrent processing jobs
	// Video jobs are heavy (download+processing), so we limit them strictly
	// URL/Image jobs are lighter, so we allow more concurrency
	videoSemaphore chan struct{}
	lightSemaphore chan struct{}

	// tempDir for storing temporary files
	tempDir string

	// adminEmails whitelist for auto-public + unlimited extractions
	adminEmails []string
	// inspiratorEmails whitelist for auto-featured + unlimited extractions
	inspiratorEmails []string

	// thumbDownloader downloads remote thumbnails to local disk
	thumbDownloader ThumbnailDownloader
}

// NewUnifiedExtractionHandler creates a new unified extraction handler
func NewUnifiedExtractionHandler(
	jobRepo JobRepository,
	recipeRepo RecipeRepository,
	userRepo UserRepository,
	extractor ai.RecipeExtractor,
	enricher ai.RecipeEnricher,
	cacheRepo *postgres.ExtractionCacheRepository,
	downloader VideoDownloader,
	instagramDownloader InstagramVideoDownloader,
	thumbDownloader ThumbnailDownloader,
	redisClient *redis.Client,
	logger *slog.Logger,
	adminEmails []string,
	inspiratorEmails []string,
	maxVideoJobs int,
	maxLightJobs int,
) *UnifiedExtractionHandler {
	h := &UnifiedExtractionHandler{
		jobRepo:             jobRepo,
		recipeRepo:          recipeRepo,
		userRepo:            userRepo,
		extractor:           extractor,
		enricher:            enricher,
		cacheRepo:           cacheRepo,
		downloader:          downloader,
		instagramDownloader: instagramDownloader,
		thumbDownloader:     thumbDownloader,
		redis:               redisClient,
		logger:              logger,
		videoSemaphore:      make(chan struct{}, maxVideoJobs),
		lightSemaphore:      make(chan struct{}, maxLightJobs),
		tempDir:             os.TempDir(),
		adminEmails:         adminEmails,
		inspiratorEmails:    inspiratorEmails,
	}

	// Cleanup orphaned temp files from previous crashes
	go h.cleanupOrphanedTempFiles()

	// Start distributed cancellation listener
	if redisClient != nil {
		go h.subscribeToCancellation()
	}

	return h
}

// cleanupOrphanedTempFiles removes extract_*.tmp files left behind by crashed/restarted processes.
func (h *UnifiedExtractionHandler) cleanupOrphanedTempFiles() {
	pattern := filepath.Join(h.tempDir, "extract_*.tmp")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		h.logger.Warn("Failed to glob orphaned temp files", "error", err)
		return
	}

	cutoff := time.Now().Add(-1 * time.Hour)
	cleaned := 0
	for _, path := range matches {
		info, err := os.Stat(path)
		if err != nil {
			continue
		}
		// Only remove files older than 1 hour to avoid deleting active uploads
		if info.ModTime().Before(cutoff) {
			if err := os.Remove(path); err == nil {
				cleaned++
			}
		}
	}
	if cleaned > 0 {
		h.logger.Info("Cleaned up orphaned temp files", "count", cleaned)
	}
}

// UnifiedExtractRequest represents a unified extraction request
type UnifiedExtractRequest struct {
	Type         string       `json:"type"`                   // "url", "image", "video"
	URL          string       `json:"url,omitempty"`          // For url and video types
	ImageBase64  string       `json:"imageBase64,omitempty"`  // For image type (JSON) — legacy single image
	MimeType     string       `json:"mimeType,omitempty"`     // For image type — legacy single mime
	Images       []ImageInput `json:"images,omitempty"`       // New multi-image field
	Language     string       `json:"language,omitempty"`     // "en", "fr", "es", "auto"
	DetailLevel  string       `json:"detailLevel,omitempty"`  // "quick", "detailed"
	SaveAuto     interface{}  `json:"saveAuto,omitempty"`     // Auto-save extracted recipe (bool or string)
	ForceRefresh interface{}  `json:"forceRefresh,omitempty"` // Bypass cache and re-extract (bool or string)
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

	// Check admin/inspirator status once — used for quota bypass and auto-public/featured
	isAdmin := model.IsAdminEmail(user.Email, h.adminEmails)
	isInspirator := model.IsInspiratorEmail(user.Email, h.inspiratorEmails)

	// Enforce subscription tier limits on extractions (admins and inspirators bypass)
	if !isAdmin && !isInspirator && h.userRepo != nil {
		sub, err := h.userRepo.GetSubscription(r.Context(), user.ID)
		if err != nil {
			h.logger.Warn("Failed to get subscription for limit check", "error", err, "user_id", user.ID)
			// Non-fatal: default to free limits below
		}
		entitlement := "free"
		if sub != nil {
			entitlement = sub.Entitlement
		}
		limits, ok := model.TierLimits[entitlement]
		if !ok {
			limits = model.TierLimits["free"]
		}
		if limits.Extractions < 0 {
			// Unlimited — skip check
		} else {
			count, err := h.jobRepo.CountUsedThisMonth(r.Context(), user.ID)
			if err != nil {
				h.logger.Error("Failed to count monthly extractions", "error", err)
				response.InternalError(w)
				return
			}
			if count >= limits.Extractions {
				response.ErrorJSON(w, http.StatusTooManyRequests, "QUOTA_EXCEEDED",
					fmt.Sprintf("Monthly extraction limit reached (%d/%d). Upgrade to Pro for unlimited extractions.",
						count, limits.Extractions), nil)
				return
			}
		}
	}

	// Parse request based on content type
	var req UnifiedExtractRequest
	var imageDataList [][]byte
	var imageMimeTypes []string
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
			imageData, err := io.ReadAll(file)
			if err != nil {
				response.BadRequest(w, "Failed to read image file")
				return
			}
			mimeType := req.MimeType
			if mimeType == "" {
				mimeType = header.Header.Get("Content-Type")
				if mimeType == "" {
					mimeType = detectMimeType(imageData)
				}
			}
			imageDataList = [][]byte{imageData}
			imageMimeTypes = []string{mimeType}
		}
	} else {
		// Handle JSON request
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		// Resolve images: prefer new `images` array, fall back to legacy `imageBase64`
		if len(req.Images) > 0 {
			for i, img := range req.Images {
				if img.Base64 == "" {
					response.ValidationFailed(w, fmt.Sprintf("images[%d].base64", i), "Image data is required")
					return
				}
				decoded, err := decodeBase64Flexible(img.Base64)
				if err != nil {
					response.ValidationFailed(w, fmt.Sprintf("images[%d].base64", i), "Invalid base64 encoding")
					return
				}
				mt := img.MimeType
				if mt == "" {
					mt = detectMimeType(decoded)
				}
				imageDataList = append(imageDataList, decoded)
				imageMimeTypes = append(imageMimeTypes, mt)
			}
		} else if req.ImageBase64 != "" {
			decoded, err := decodeBase64Flexible(req.ImageBase64)
			if err != nil {
				response.ValidationFailed(w, "imageBase64", "Invalid base64 encoding")
				return
			}
			mt := req.MimeType
			if mt == "" {
				mt = detectMimeType(decoded)
			}
			imageDataList = [][]byte{decoded}
			imageMimeTypes = []string{mt}
		}

		// Default saveAuto to true for JSON requests if not explicitly set
		if req.SaveAuto == nil {
			req.SaveAuto = true
		}
	}

	// Helper to parse loose booleans (handle string "true"/true)
	parseBool := func(v interface{}) bool {
		switch val := v.(type) {
		case bool:
			return val
		case string:
			return strings.ToLower(val) == "true"
		default:
			return false
		}
	}

	saveAuto := parseBool(req.SaveAuto)
	forceRefresh := parseBool(req.ForceRefresh)

	// Resolve type: explicit or auto-detect from inputs
	if req.Type == "" {
		switch {
		case len(imageDataList) > 0:
			req.Type = "image"
		case req.URL != "" && ai.IsSupportedPlatform(req.URL):
			req.Type = "video"
		case req.URL != "":
			req.Type = "url"
		}
	}

	var jobType model.JobType
	switch strings.ToLower(req.Type) {
	case "url":
		jobType = model.JobTypeURL
	case "image":
		jobType = model.JobTypeImage
	case "video":
		jobType = model.JobTypeVideo
	default:
		response.ValidationFailed(w, "type", "Must be 'url', 'image', or 'video', or provide a URL/image to auto-detect")
		return
	}

	// Validate based on type
	switch jobType {
	case model.JobTypeURL:
		if req.URL == "" {
			response.ValidationFailed(w, "url", "URL is required for URL extraction")
			return
		}
		// Max URL length
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
		if len(imageDataList) == 0 {
			response.ValidationFailed(w, "image", "Image is required for image extraction")
			return
		}
		validTypes := map[string]bool{
			"image/jpeg": true, "image/png": true, "image/webp": true, "image/gif": true,
		}
		for i, data := range imageDataList {
			if len(data) > 10*1024*1024 {
				response.ValidationFailed(w, fmt.Sprintf("images[%d]", i), "Image size exceeds 10MB limit")
				return
			}
			if !validTypes[imageMimeTypes[i]] {
				response.ValidationFailed(w, fmt.Sprintf("images[%d].mimeType", i), "Unsupported image type. Use JPEG, PNG, WebP, or GIF")
				return
			}
		}

	case model.JobTypeVideo:
		if req.URL == "" {
			response.ValidationFailed(w, "url", "Video URL is required for video extraction")
			return
		}
		// Max URL length
		if len(req.URL) > 2083 {
			response.ValidationFailed(w, "url", "URL too long (max 2083 characters)")
			return
		}
		// Instagram: requires cookies to be configured on the server.
		if isInstagramURL(req.URL) && !h.instagramDownloader.IsConfigured() {
			response.ErrorJSON(w, http.StatusUnprocessableEntity, "PLATFORM_NOT_SUPPORTED",
				"Instagram video extraction is not currently available. Please try sharing a YouTube or TikTok link instead, or save the video to your device and upload it directly.", nil)
			return
		}
	}

	// Validate language code if explicitly provided
	if req.Language != "" && req.Language != "auto" {
		validLangs := map[string]bool{"en": true, "fr": true, "ar": true}
		if !validLangs[req.Language] {
			response.ValidationFailed(w, "language", "must be 'en', 'fr', or 'ar'")
			return
		}
	}

	// Resolve effective language.
	// Priority: explicit request param → user's stored preference → "en"
	effectiveLangCode := req.Language
	if effectiveLangCode == "" || effectiveLangCode == "auto" {
		if dbUser, err := h.userRepo.GetByID(r.Context(), user.ID); err == nil && dbUser.PreferredLanguage != "" {
			effectiveLangCode = dbUser.PreferredLanguage
		} else {
			if err != nil {
				h.logger.Warn("Failed to fetch user preferred language, defaulting to 'en'",
					"error", err, "user_id", user.ID)
			}
			effectiveLangCode = "en"
		}
	}

	// We need to pass the resolved name to the request for Gemini,
	// but keep the ISO code in the job model for database persistence.
	req.Language = effectiveLangCode

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

	// Path 5: If a public/featured recipe for this URL already exists in the user's language,
	// clone it directly without burning Gemini tokens on re-extraction.
	if jobType == model.JobTypeURL && !forceRefresh && req.URL != "" {
		normalizedURL := model.NormalizeURL(req.URL)
		if pubRecipe, err := h.recipeRepo.GetPublicBySourceURL(r.Context(), normalizedURL, effectiveLangCode); err == nil && pubRecipe != nil {
			var cloneID uuid.UUID
			// Check if user already has a clone of this public recipe
			if existingClone, err := h.recipeRepo.GetBySourceRecipeID(r.Context(), user.ID, pubRecipe.ID); err == nil && existingClone != nil {
				cloneID = existingClone.ID
			} else {
				// Create a new clone for this user
				if id, err := h.clonePublicRecipeForUser(r.Context(), pubRecipe, user.ID); err == nil {
					cloneID = id
				}
			}

			if cloneID != uuid.Nil {
				// Create a completed job so the client can poll and receive the result
				syntheticKey := fmt.Sprintf("%s|%s|%s", user.ID.String(), sourceURL, effectiveLangCode)
				syntheticJob := model.NewExtractionJob(user.ID, model.JobTypeURL, sourceURL, effectiveLangCode, req.DetailLevel, saveAuto, false)
				syntheticJob.IdempotencyKey = &syntheticKey
				if err := h.jobRepo.Create(r.Context(), syntheticJob); err == nil {
					if err := h.jobRepo.MarkCompleted(r.Context(), syntheticJob.ID, cloneID); err != nil {
						h.logger.Warn("Failed to mark synthetic job as completed (Path 5)", "error", err)
					}
					h.logger.Info("Served public recipe clone without Gemini extraction (Path 5)",
						"publicID", pubRecipe.ID, "cloneID", cloneID, "url", sourceURL)
					response.Created(w, map[string]string{
						"jobId":  syntheticJob.ID.String(),
						"status": string(model.JobStatusCompleted),
					})
					return
				}
				// If synthetic job creation fails, fall through to normal extraction
			}
		}
	}

	// Duplicate Prevention: check if this user already has an active OR completed job for this content.
	// Uses a deterministic idempotency key so concurrent/repeat requests match.
	var idempotencyKey string
	if jobType == model.JobTypeVideo || jobType == model.JobTypeURL {
		idempotencyKey = fmt.Sprintf("%s|%s|%s", user.ID.String(), sourceURL, effectiveLangCode)

		if existingJob, err := h.jobRepo.GetByIdempotencyKey(r.Context(), user.ID, idempotencyKey); err == nil {
			if existingJob.Status == model.JobStatusPending ||
				existingJob.Status == model.JobStatusDownloading ||
				existingJob.Status == model.JobStatusProcessing ||
				existingJob.Status == model.JobStatusExtracting {

				h.logger.Info("Returning existing active job (idempotency hit)", "jobID", existingJob.ID)
				response.Created(w, map[string]string{
					"jobId":  existingJob.ID.String(),
					"status": string(existingJob.Status),
				})
				return
			}
			// Completed job with result — skip re-extraction (unless force refresh)
			if !forceRefresh && existingJob.Status == model.JobStatusCompleted && existingJob.ResultRecipeID != nil {
				h.logger.Info("Returning existing completed job (duplicate prevention)", "jobID", existingJob.ID)
				response.Created(w, map[string]string{
					"jobId":  existingJob.ID.String(),
					"status": string(existingJob.Status),
				})
				return
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
		saveAuto,
		forceRefresh,
	)

	// Set deterministic idempotency key (matches the check above).
	// For image jobs, we hash the image content to detect duplicates.
	if idempotencyKey != "" {
		job.IdempotencyKey = &idempotencyKey
	} else if jobType == model.JobTypeImage && len(imageDataList) > 0 {
		// Hash all images together for idempotency
		hasher := sha256.New()
		for _, data := range imageDataList {
			hasher.Write(data)
		}
		hashStr := hex.EncodeToString(hasher.Sum(nil))
		imgIdempotencyKey := fmt.Sprintf("%s|image|%s", user.ID.String(), hashStr)

		if existingJob, err := h.jobRepo.GetByIdempotencyKey(r.Context(), user.ID, imgIdempotencyKey); err == nil {
			if existingJob.Status == model.JobStatusPending ||
				existingJob.Status == model.JobStatusProcessing ||
				existingJob.Status == model.JobStatusExtracting {

				h.logger.Info("Returning existing active job (image idempotency hit)", "jobID", existingJob.ID)
				response.Created(w, map[string]string{
					"jobId":  existingJob.ID.String(),
					"status": string(existingJob.Status),
				})
				return
			}
			// Completed job with result — skip re-extraction (unless force refresh)
			if !forceRefresh && existingJob.Status == model.JobStatusCompleted && existingJob.ResultRecipeID != nil {
				h.logger.Info("Returning existing completed job (image duplicate prevention)", "jobID", existingJob.ID)
				response.Created(w, map[string]string{
					"jobId":  existingJob.ID.String(),
					"status": string(existingJob.Status),
				})
				return
			}
		}

		job.IdempotencyKey = &imgIdempotencyKey
		// Store content hash as source URL so recipe-level dedup (GetBySourceURL) also catches re-scans
		job.SourceURL = "image-hash://" + hashStr
	}

	// For image jobs, save image(s) to temp file(s)
	if jobType == model.JobTypeImage && len(imageDataList) > 0 {
		var paths []string
		for i, data := range imageDataList {
			tempPath := filepath.Join(h.tempDir, fmt.Sprintf("extract_%s_%d.tmp", job.ID.String(), i))
			if err := os.WriteFile(tempPath, data, 0644); err != nil {
				h.logger.Error("Failed to save temp image", "error", err, "index", i)
				// Cleanup any already written files
				for _, p := range paths {
					os.Remove(p)
				}
				response.InternalError(w)
				return
			}
			paths = append(paths, tempPath)
		}
		job.SetSourcePaths(paths, imageMimeTypes)
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

	// Start processing in background.
	// This goroutine owns: context lifetime, activeJobs cleanup, semaphore, panic recovery.
	// processJob must NOT duplicate any of these responsibilities.
	go func() {
		defer cancel()
		defer h.activeJobs.Delete(job.ID)

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

		h.processJob(ctx, job, isAdmin, isInspirator)
	}()

	// Return job ID immediately
	response.Created(w, map[string]string{
		"jobId":  job.ID.String(),
		"status": string(job.Status),
	})
}

// processJob handles the background processing for all extraction types
func (h *UnifiedExtractionHandler) processJob(ctx context.Context, job *model.ExtractionJob, isAdmin bool, isInspirator bool) {
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

	// NOTE: Cleanup (activeJobs.Delete, cancel, panic recovery) is owned by the
	// calling goroutine in Extract(). Do not duplicate here.

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
			if err := h.jobRepo.UpdateProgress(ctx, job.ID, status, progress, msg); err != nil {
				logger.Warn("Failed to update job progress",
					"error", err, "job_id", job.ID, "status", status, "progress", progress)
			}
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
		} else if isTransientError(err) {
			failJob("TRANSIENT_FAILURE", err.Error())
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
	refined, refineErr := h.extractor.RefineRecipe(ctx, result, job.Language)
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
		enrichInput.Language = job.Language
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

	// Always save the extracted recipe to prevent data loss after burning AI tokens.
	// Previously saveAuto=false would discard the result with no retrieval path.
	updateProgress(model.JobStatusExtracting, 95, "Saving recipe...")
	recipeID, saveErr := h.saveExtractedRecipe(ctx, job, result, enrichment, isAdmin, isInspirator)
	if saveErr != nil {
		h.logger.Error("Failed to save recipe", "error", saveErr)
		failJob("SAVE_FAILED", "Failed to save recipe. Please try again.")
		return
	}
	if err := h.jobRepo.MarkCompleted(ctx, job.ID, recipeID); err != nil {
		h.logger.Error("Failed to mark job completed — recipe was saved but job status is stale",
			"error", err, "job_id", job.ID, "recipe_id", recipeID)
	}
}

// isTransientError checks if an error is caused by transient infrastructure issues
// (rate limits, server errors, timeouts) rather than bad user input.
// Jobs failing with transient errors get TRANSIENT_FAILURE and don't count against quota.
func isTransientError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "429") ||
		strings.Contains(msg, "503") ||
		strings.Contains(msg, "500") ||
		strings.Contains(msg, "timeout") ||
		strings.Contains(msg, "connection reset") ||
		strings.Contains(msg, "RESOURCE_EXHAUSTED") ||
		strings.Contains(msg, "max retries exceeded")
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
			Section:        ing.Section,
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

// processImageExtraction handles image extraction (single or multi-image)
func (h *UnifiedExtractionHandler) processImageExtraction(ctx context.Context, job *model.ExtractionJob, updateProgress func(model.JobStatus, int, string)) (*ai.ExtractionResult, error) {
	updateProgress(model.JobStatusProcessing, 10, "Reading image...")

	paths, mimeTypes := job.GetSourcePaths()
	if len(paths) == 0 {
		return nil, fmt.Errorf("image source path not found")
	}

	var imageDataList [][]byte
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("failed to read image: %w", err)
		}
		imageDataList = append(imageDataList, data)
	}

	// Cleanup temp files after reading
	defer func() {
		for _, path := range paths {
			os.Remove(path)
		}
	}()

	// Use filename from SourceURL if available for better feedback
	msg := "Extracting recipe from image..."
	if len(imageDataList) > 1 {
		msg = fmt.Sprintf("Analyzing %d images...", len(imageDataList))
	} else if job.SourceURL != "" && job.SourceURL != "image" {
		msg = fmt.Sprintf("Analyzing image: %s...", job.SourceURL)
	}

	updateProgress(model.JobStatusExtracting, 30, msg)

	result, err := h.extractor.ExtractFromImages(ctx, imageDataList, mimeTypes)
	if err != nil {
		return nil, fmt.Errorf("failed to extract from image: %w", err)
	}

	updateProgress(model.JobStatusExtracting, 70, "Processing recipe...")
	return result, nil
}

// processVideoExtraction handles video extraction.
// YouTube URLs are sent directly to Gemini (no yt-dlp download needed).
// Other platforms (TikTok, Facebook, Vimeo, etc.) use yt-dlp as before.
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

	// YouTube: pass URL directly to Gemini (skips yt-dlp entirely).
	// This avoids the "no JS runtime" and "sign in to confirm you're not a bot"
	// errors that yt-dlp encounters with YouTube on server environments.
	if isYouTubeURL(job.SourceURL) {
		return h.processYouTubeExtraction(ctx, job, updateProgress)
	}

	// Instagram: use dedicated GraphQL downloader instead of yt-dlp.
	if isInstagramURL(job.SourceURL) {
		return h.processInstagramExtraction(ctx, job, updateProgress)
	}

	// Other platforms: download with yt-dlp, then upload to Gemini.
	return h.processYtDlpExtraction(ctx, job, updateProgress)
}

// processYouTubeExtraction handles YouTube videos by passing the URL directly
// to Gemini, which natively understands YouTube content. Metadata and thumbnail
// are fetched via YouTube's public oEmbed API (no auth required).
func (h *UnifiedExtractionHandler) processYouTubeExtraction(ctx context.Context, job *model.ExtractionJob, updateProgress func(model.JobStatus, int, string)) (*ai.ExtractionResult, error) {
	updateProgress(model.JobStatusProcessing, 10, "Fetching video info...")

	// Fetch metadata via oEmbed (best-effort, non-blocking on failure)
	oembed := fetchYouTubeOEmbed(ctx, job.SourceURL)
	thumbnailURL := oembed.ThumbnailURL

	var metadataStr string
	if oembed.Title != "" {
		h.logger.Info("YouTube oEmbed metadata fetched", "title", oembed.Title)
		metadataStr = fmt.Sprintf("Video Title: %s\nChannel: %s", oembed.Title, oembed.AuthorName)
		updateProgress(model.JobStatusExtracting, 20, fmt.Sprintf("Analyzing: %s...", oembed.Title))
	} else {
		updateProgress(model.JobStatusExtracting, 20, "Analyzing YouTube video...")
	}

	extractReq := ai.ExtractionRequest{
		VideoURL:    job.SourceURL, // pass the YouTube URL directly — Gemini handles it natively
		Language:    job.Language,
		DetailLevel: job.DetailLevel,
		Metadata:    metadataStr,
	}

	result, err := h.extractor.ExtractRecipe(ctx, extractReq, func(status model.JobStatus, progress int, msg string) {
		updateProgress(status, progress, msg)
	})
	if err != nil {
		return nil, fmt.Errorf("failed to extract from YouTube video: %w", err)
	}

	// Use oEmbed thumbnail if Gemini didn't provide one
	if result != nil && result.Thumbnail == "" && thumbnailURL != "" {
		result.Thumbnail = thumbnailURL
	}

	return result, nil
}

// processInstagramExtraction handles Instagram reels/videos by downloading via
// the GraphQL API, then uploading to Gemini for recipe extraction.
func (h *UnifiedExtractionHandler) processInstagramExtraction(ctx context.Context, job *model.ExtractionJob, updateProgress func(model.JobStatus, int, string)) (*ai.ExtractionResult, error) {
	updateProgress(model.JobStatusDownloading, 10, "Downloading Instagram reel...")

	localPath, thumbnailURL, err := h.instagramDownloader.Download(ctx, job.SourceURL)
	if err != nil {
		// Provide user-friendly error messages for common failures
		errMsg := err.Error()
		if strings.Contains(errMsg, "not a video") {
			return nil, fmt.Errorf("this Instagram post is not a video — only Reels and video posts are supported")
		}
		if strings.Contains(errMsg, "private or deleted") {
			return nil, fmt.Errorf("this Instagram post is private or has been deleted")
		}
		if strings.Contains(errMsg, "429") {
			return nil, fmt.Errorf("429: Instagram rate limited — please try again in a few minutes")
		}
		if strings.Contains(errMsg, "doc_id may be expired") {
			h.logger.Error("Instagram doc_id appears expired — update INSTAGRAM_DOC_ID env var", "error", err)
			return nil, fmt.Errorf("Instagram extraction is temporarily unavailable — please try again later")
		}
		return nil, fmt.Errorf("failed to download Instagram video: %w", err)
	}
	defer h.instagramDownloader.Cleanup(localPath)

	if thumbnailURL != "" {
		h.logger.Info("Instagram thumbnail URL extracted", "url", thumbnailURL)
	}

	// Fetch metadata for context
	var metadataStr string
	meta, err := h.instagramDownloader.GetMetadata(ctx, job.SourceURL)
	if err != nil {
		h.logger.Warn("Failed to fetch Instagram metadata", "error", err, "url", job.SourceURL)
	} else {
		h.logger.Info("Instagram metadata fetched", "title", meta.Title, "description_len", len(meta.Description))
		metadataStr = fmt.Sprintf("Video Title: %s\nVideo Description:\n%s", meta.Title, meta.Description)
		updateProgress(model.JobStatusExtracting, 40, fmt.Sprintf("Analyzing: %s...", meta.Title))
	}

	if metadataStr == "" {
		updateProgress(model.JobStatusExtracting, 40, "Extracting recipe from Instagram reel...")
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
		return nil, fmt.Errorf("failed to extract from Instagram video: %w", err)
	}

	// Use Instagram thumbnail if Gemini didn't provide one
	if result != nil && result.Thumbnail == "" && thumbnailURL != "" {
		result.Thumbnail = thumbnailURL
	}

	return result, nil
}

// processYtDlpExtraction handles non-YouTube platforms by downloading the video
// with yt-dlp, then uploading to Gemini for analysis.
func (h *UnifiedExtractionHandler) processYtDlpExtraction(ctx context.Context, job *model.ExtractionJob, updateProgress func(model.JobStatus, int, string)) (*ai.ExtractionResult, error) {
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

// clonePublicRecipeForUser creates a user-owned clone of a public/featured recipe.
// The source recipe must already include ingredients and steps.
func (h *UnifiedExtractionHandler) clonePublicRecipeForUser(ctx context.Context, source *model.Recipe, userID uuid.UUID) (uuid.UUID, error) {
	now := time.Now().UTC()
	sourceID := source.ID
	clone := &model.Recipe{
		ID:                 uuid.New(),
		UserID:             userID,
		Title:              source.Title,
		Description:        source.Description,
		Servings:           source.Servings,
		PrepTime:           source.PrepTime,
		CookTime:           source.CookTime,
		Difficulty:         source.Difficulty,
		Cuisine:            source.Cuisine,
		ThumbnailURL:       source.ThumbnailURL,
		SourceType:         "cloned",
		SourceURL:          source.SourceURL,
		SourceRecipeID:     &sourceID,
		Tags:               source.Tags,
		IsFavorite:         false,
		ContentLanguage:    source.ContentLanguage,
		TranslationGroupID: source.TranslationGroupID,
		Nutrition:          source.Nutrition,
		DietaryInfo:        source.DietaryInfo,
		SyncVersion:        1,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	for i, ing := range source.Ingredients {
		clone.Ingredients = append(clone.Ingredients, model.RecipeIngredient{
			ID:             uuid.New(),
			RecipeID:       clone.ID,
			Name:           ing.Name,
			Quantity:       ing.Quantity,
			Unit:           ing.Unit,
			Category:       ing.Category,
			Section:        ing.Section,
			IsOptional:     ing.IsOptional,
			Notes:          ing.Notes,
			VideoTimestamp: ing.VideoTimestamp,
			SortOrder:      i,
			CreatedAt:      now,
		})
	}

	for i, step := range source.Steps {
		clone.Steps = append(clone.Steps, model.RecipeStep{
			ID:                  uuid.New(),
			RecipeID:            clone.ID,
			StepNumber:          i + 1,
			Instruction:         step.Instruction,
			DurationSeconds:     step.DurationSeconds,
			Technique:           step.Technique,
			Temperature:         step.Temperature,
			VideoTimestampStart: step.VideoTimestampStart,
			VideoTimestampEnd:   step.VideoTimestampEnd,
			CreatedAt:           now,
		})
	}

	if err := h.recipeRepo.Create(ctx, clone); err != nil {
		return uuid.Nil, fmt.Errorf("failed to create public recipe clone: %w", err)
	}
	return clone.ID, nil
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
			Section:        ing.Section,
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
func (h *UnifiedExtractionHandler) saveExtractedRecipe(ctx context.Context, job *model.ExtractionJob, result *ai.ExtractionResult, enrichment *ai.EnrichmentResult, isAdmin bool, isInspirator bool) (uuid.UUID, error) {
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
	// This prevents duplicates when the same URL is submitted multiple times.
	// Language-aware: only dedup if the existing recipe is in the same language.
	if job.SourceURL != "" {
		// Normalize URL before checking to handle variations (mobile URLs, query params, etc.)
		normalizedURL := model.NormalizeURL(job.SourceURL)
		existingRecipe, err := h.recipeRepo.GetBySourceURL(ctx, job.UserID, normalizedURL)
		if err == nil && existingRecipe != nil {
			// Same language (or legacy empty language) → return existing to avoid duplicate
			if existingRecipe.ContentLanguage == "" || existingRecipe.ContentLanguage == job.Language {
				h.logger.Info("Recipe from this URL already exists for user (same language), returning existing",
					"recipeID", existingRecipe.ID,
					"userID", job.UserID,
					"sourceURL", normalizedURL)
				return existingRecipe.ID, nil
			}
			// Different language → create a new copy in the new language
			h.logger.Info("Recipe from this URL exists in different language, creating new copy",
				"existingLang", existingRecipe.ContentLanguage,
				"newLang", job.Language,
				"sourceURL", normalizedURL)
		}
		// If err is ErrRecipeNotFound, continue with creation
	}

	// Download thumbnail to local disk so it doesn't expire
	thumbnailForDB := result.Thumbnail
	if thumbnailForDB != "" && h.thumbDownloader != nil {
		if localURL, err := h.thumbDownloader.Download(ctx, thumbnailForDB); err != nil {
			h.logger.Warn("Failed to download thumbnail, keeping original URL",
				"url", thumbnailForDB, "error", err)
		} else {
			thumbnailForDB = localURL
		}
	}

	recipe := &model.Recipe{
		ID:              uuid.New(),
		UserID:          job.UserID,
		Title:           result.Title,
		Description:     stringPtr(result.Description),
		Servings:        intPtr(result.Servings),
		PrepTime:        intPtr(result.PrepTime),
		CookTime:        intPtr(result.CookTime),
		Difficulty:      stringPtr(result.Difficulty),
		Cuisine:         stringPtr(result.Cuisine),
		SourceType:      sourceType,
		SourceURL:       stringPtr(job.SourceURL),
		ThumbnailURL:    stringPtr(thumbnailForDB),
		Tags:            result.Tags,
		CreatedAt:       time.Now().UTC(),
		UpdatedAt:       time.Now().UTC(),
		IsPublic:        isAdmin,
		IsFeatured:      isInspirator,
		ContentLanguage: job.Language,
	}

	if isInspirator {
		now := time.Now().UTC()
		recipe.FeaturedAt = &now
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

		section := ing.Section
		if section == "" {
			section = "Main"
		}

		recipe.Ingredients = append(recipe.Ingredients, model.RecipeIngredient{
			ID:         uuid.New(),
			RecipeID:   recipe.ID,
			Name:       ing.Name,
			Quantity:   qty,
			Unit:       stringPtr(ing.Unit),
			Category:   category,
			Section:    section,
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

// subscribeToCancellation listens for cancellation messages from other instances.
// Automatically reconnects on Redis disconnection with exponential backoff.
func (h *UnifiedExtractionHandler) subscribeToCancellation() {
	backoff := 1 * time.Second
	maxBackoff := 30 * time.Second

	for {
		err := h.runCancellationSubscriber()
		if err != nil {
			h.logger.Error("Cancellation subscriber disconnected, reconnecting...", "error", err, "backoff", backoff)
		}

		time.Sleep(backoff)
		backoff *= 2
		if backoff > maxBackoff {
			backoff = maxBackoff
		}
	}
}

func (h *UnifiedExtractionHandler) runCancellationSubscriber() error {
	ctx := context.Background()
	pubsub := h.redis.Subscribe(ctx, "jobs:cancellation")
	defer pubsub.Close()

	// Verify subscription is working
	if _, err := pubsub.Receive(ctx); err != nil {
		return fmt.Errorf("subscribe failed: %w", err)
	}

	h.logger.Info("Started distributed cancellation listener")
	ch := pubsub.Channel()

	for msg := range ch {
		jobID, err := uuid.Parse(msg.Payload)
		if err != nil {
			continue
		}

		if cancelFn, ok := h.activeJobs.Load(jobID); ok {
			if cancel, ok := cancelFn.(context.CancelFunc); ok {
				h.logger.Info("Received distributed cancellation signal", "jobID", jobID)
				cancel()
			}
		}
	}

	return fmt.Errorf("subscription channel closed")
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
		if errors.Is(err, postgres.ErrJobNotFound) {
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

	// Convert to response — recipe title already JOIN-ed in ListByUser, no extra queries
	resp := make([]model.JobResponse, 0)
	for _, job := range jobs {
		jobResp := job.ToResponse("")
		jobResp.RecipeTitle = job.RecipeTitle
		if job.ResultRecipeID != nil {
			id := job.ResultRecipeID.String()
			jobResp.ResultRecipeID = &id
		}
		jobResp.RecipeThumbnailURL = job.RecipeThumbnailURL
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
		if errors.Is(err, postgres.ErrJobNotFound) {
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
	if job.ResultRecipeID != nil {
		id := job.ResultRecipeID.String()
		resp.ResultRecipeID = &id
	}
	if resultRecipe != nil {
		resp.RecipeThumbnailURL = resultRecipe.ThumbnailURL
	}
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
	if cancelFn, ok := h.activeJobs.Load(jobID); ok {
		if cancel, ok := cancelFn.(context.CancelFunc); ok {
			cancel()
		}
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
