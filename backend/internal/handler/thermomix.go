package handler

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/service/ai"
	"github.com/dishflow/backend/internal/service/cookidoo"
)

// CookidooPool is the interface the thermomix handler needs from the Cookidoo service.
type CookidooPool interface {
	CreateRecipe(ctx context.Context, recipe cookidoo.ThermomixRecipe) (string, error)
}

// RecipeRepository is extended here with the Cookidoo URL persistence method.
// (The base interface is declared in handler.go alongside the other handlers.)

// ThermomixHandler handles Thermomix/Cookidoo export requests.
type ThermomixHandler struct {
	recipes   RecipeRepository
	converter ai.ThermomixConverter
	pool      CookidooPool
}

func NewThermomixHandler(recipes RecipeRepository, converter ai.ThermomixConverter, pool CookidooPool) *ThermomixHandler {
	return &ThermomixHandler{recipes: recipes, converter: converter, pool: pool}
}

// Export handles POST /api/v1/recipes/{id}/export/thermomix
//
// Converts a Dlishe recipe into Thermomix format via Gemini, then creates a
// shareable public recipe on Cookidoo and returns the link. The user must own
// the recipe.
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

	// Ownership check — public recipes are viewable by all but only the owner can export.
	if recipe.UserID != user.ID {
		response.Forbidden(w, "You do not own this recipe")
		return
	}

	if len(recipe.Ingredients) == 0 && len(recipe.Steps) == 0 {
		response.BadRequest(w, "Recipe has no ingredients or steps to export")
		return
	}

	// Return cached URL if already exported.
	if recipe.CookidooURL != nil && *recipe.CookidooURL != "" {
		response.OK(w, map[string]string{"url": *recipe.CookidooURL})
		return
	}

	// Convert to Thermomix format via Gemini.
	converted, err := h.converter.ConvertToThermomix(r.Context(), recipe)
	if err != nil {
		response.LogAndInternalError(w, err)
		return
	}

	// Build the Cookidoo recipe payload.
	tmRecipe := buildThermomixRecipe(recipe, converted)

	// Post to Cookidoo and get public URL.
	publicURL, err := h.pool.CreateRecipe(r.Context(), tmRecipe)
	if err != nil {
		response.LogAndInternalError(w, err)
		return
	}

	// Persist the URL so future calls return instantly.
	// Non-fatal: the export succeeded even if caching fails.
	_ = h.recipes.SetCookidooURL(r.Context(), recipe.ID, publicURL)

	response.OK(w, map[string]string{
		"url": publicURL,
	})
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
		steps[i] = cookidoo.NewStepItem(s.Text, s.Speed, s.TimeSeconds, s.TempCelsius, lang, s.IngredientRefs)
	}

	return cookidoo.ThermomixRecipe{
		Name:         recipe.Title,
		Ingredients:  ings,
		Instructions: steps,
		Tools:        converted.RequiredModels,
		TotalTime:    totalSecs,
		PrepTime:     prepSecs,
		Yield:        &cookidoo.RecipeYield{Value: servings, UnitText: "portion"},
	}
}
