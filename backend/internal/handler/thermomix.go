package handler

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/service/ai"
	"github.com/dishflow/backend/internal/service/cookidoo"
)

// CookidooPool is the interface the thermomix handler needs from the Cookidoo service.
type CookidooPool interface {
	CreateRecipe(ctx context.Context, recipe cookidoo.ThermomixRecipe) (string, error)
}

// ThermomixHandler handles Thermomix/Cookidoo export requests.
type ThermomixHandler struct {
	recipes   RecipeRepository
	jobRepo   JobRepository
	converter ai.ThermomixConverter
	pool      CookidooPool
}

func NewThermomixHandler(recipes RecipeRepository, jobRepo JobRepository, converter ai.ThermomixConverter, pool CookidooPool) *ThermomixHandler {
	return &ThermomixHandler{recipes: recipes, jobRepo: jobRepo, converter: converter, pool: pool}
}

// Export handles POST /api/v1/recipes/{id}/export/thermomix
//
// First call: creates a background job and returns {jobId, status: "pending"}.
// Subsequent calls while job is running: returns the existing {jobId, status}.
// After completion: returns {status: "completed", url} immediately from cache.
func (h *ThermomixHandler) Export(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	if h.pool == nil {
		response.ServiceUnavailable(w, "Thermomix export")
		return
	}
	if h.converter == nil {
		response.ServiceUnavailable(w, "AI conversion")
		return
	}

	recipeID, err := uuid.Parse(chi.URLParam(r, "recipeID"))
	if err != nil {
		response.BadRequest(w, "Invalid recipe ID")
		return
	}

	recipe, err := h.recipes.GetByID(r.Context(), recipeID)
	if err != nil {
		response.NotFound(w, "Recipe")
		return
	}

	if recipe.UserID != user.ID {
		response.Forbidden(w, "You do not own this recipe")
		return
	}

	if len(recipe.Ingredients) == 0 && len(recipe.Steps) == 0 {
		response.BadRequest(w, "Recipe has no ingredients or steps to export")
		return
	}

	force := r.URL.Query().Get("force") == "true"

	// Fast path: URL already cached — skip unless force re-export requested.
	if recipe.CookidooURL != nil && *recipe.CookidooURL != "" {
		if !force {
			response.OK(w, map[string]any{
				"status": "completed",
				"url":    *recipe.CookidooURL,
			})
			return
		}
		// Force re-export: wipe the cached URL so it gets replaced.
		_ = h.recipes.SetCookidooURL(r.Context(), recipe.ID, "")
	}

	// Idempotency key: one export job per recipe per user.
	// For force re-exports use a unique key so we bypass any existing job.
	idempotencyKey := "thermomix:" + recipeID.String()
	if force {
		idempotencyKey = fmt.Sprintf("thermomix:%s:r%d", recipeID.String(), time.Now().UnixMilli())
	}

	// Check for an existing job for this recipe.
	existingJob, err := h.jobRepo.GetByIdempotencyKey(r.Context(), user.ID, idempotencyKey)
	if err != nil && !errors.Is(err, postgres.ErrJobNotFound) {
		response.LogAndInternalError(w, err)
		return
	}

	if existingJob != nil {
		switch existingJob.Status {
		case model.JobStatusCompleted:
			// Job finished — return URL (also update recipe cache if missing).
			if existingJob.ResultURL != nil {
				_ = h.recipes.SetCookidooURL(r.Context(), recipeID, *existingJob.ResultURL)
				response.OK(w, map[string]any{
					"status": "completed",
					"url":    *existingJob.ResultURL,
				})
				return
			}
		case model.JobStatusPending, model.JobStatusProcessing:
			// Still running — client should keep polling.
			response.OK(w, map[string]any{
				"status": "processing",
				"jobId":  existingJob.ID.String(),
			})
			return
		case model.JobStatusFailed:
			// Previous attempt failed — fall through to create a fresh job.
		}
	}

	// Create a new job.
	job := &model.ExtractionJob{
		ID:             uuid.New(),
		UserID:         user.ID,
		JobType:        model.JobTypeThermomix,
		SourceURL:      recipeID.String(), // store recipe ID for reference
		Language:       recipe.ContentLanguage,
		DetailLevel:    "detailed",
		SaveAuto:       true,
		Status:         model.JobStatusPending,
		Progress:       0,
		IdempotencyKey: &idempotencyKey,
		CreatedAt:      time.Now().UTC(),
	}

	if err := h.jobRepo.Create(r.Context(), job); err != nil {
		response.LogAndInternalError(w, err)
		return
	}

	// Spawn background goroutine — fully decoupled from the HTTP request context.
	go h.runExport(job.ID, recipe)

	response.OK(w, map[string]any{
		"status": "processing",
		"jobId":  job.ID.String(),
	})
}

// runExport performs the Gemini conversion and Cookidoo publish in the background.
// It updates job status and persists the result URL when done.
func (h *ThermomixHandler) runExport(jobID uuid.UUID, recipe *model.Recipe) {
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	// Mark as processing.
	_ = h.jobRepo.UpdateProgress(ctx, jobID, model.JobStatusProcessing, 10, "Converting recipe with AI…")

	converted, err := h.converter.ConvertToThermomix(ctx, recipe)
	if err != nil {
		_ = h.jobRepo.MarkFailed(ctx, jobID, "CONVERSION_FAILED", err.Error())
		return
	}

	_ = h.jobRepo.UpdateProgress(ctx, jobID, model.JobStatusProcessing, 60, "Publishing to Cookidoo…")

	tmRecipe := buildThermomixRecipe(recipe, converted)
	publicURL, err := h.pool.CreateRecipe(ctx, tmRecipe)
	if err != nil {
		_ = h.jobRepo.MarkFailed(ctx, jobID, "COOKIDOO_FAILED", err.Error())
		return
	}

	// Persist URL on the recipe for instant future lookups.
	if err := h.recipes.SetCookidooURL(ctx, recipe.ID, publicURL); err != nil {
		slog.Default().Error("thermomix: failed to persist cookidoo URL on recipe",
			"job_id", jobID, "recipe_id", recipe.ID, "err", err)
	}

	// Mark job completed with the URL.
	if err := h.jobRepo.MarkCompletedWithURL(ctx, jobID, publicURL); err != nil {
		slog.Default().Error("thermomix: failed to mark job completed",
			"job_id", jobID, "err", err)
	}
}

// buildThermomixRecipe assembles the Cookidoo payload from the recipe and AI conversion.
func buildThermomixRecipe(recipe *model.Recipe, converted *ai.ThermomixConversionResult) cookidoo.ThermomixRecipe {
	totalSecs := recipe.TotalTime() * 60
	prepSecs := 0
	if recipe.PrepTime != nil {
		prepSecs = *recipe.PrepTime * 60
	}

	servings := 4
	if recipe.Servings != nil {
		servings = *recipe.Servings
	}

	lang := recipe.ContentLanguage
	if lang == "" {
		lang = "fr"
	}

	ings := make([]cookidoo.RecipeItem, len(converted.Ingredients))
	for i, s := range converted.Ingredients {
		ings[i] = cookidoo.RecipeItem{Type: "INGREDIENT", Text: s}
	}

	steps := make([]cookidoo.RecipeItem, len(converted.Steps))
	for i, s := range converted.Steps {
		steps[i] = cookidoo.NewStepItem(s.Text, s.Speed, s.Mode, s.TimeSeconds, s.TempCelsius, lang, s.IngredientRefs)
	}

	tm := cookidoo.ThermomixRecipe{
		Name:         recipe.Title,
		Ingredients:  ings,
		Instructions: steps,
		Tools:        converted.RequiredModels,
		TotalTime:    totalSecs,
		PrepTime:     prepSecs,
		Yield:        &cookidoo.RecipeYield{Value: servings, UnitText: "portion"},
	}
	if recipe.ThumbnailURL != nil && *recipe.ThumbnailURL != "" {
		tm.ThumbnailURL = *recipe.ThumbnailURL
	}
	return tm
}
