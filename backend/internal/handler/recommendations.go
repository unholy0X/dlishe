package handler

import (
	"net/http"
	"strconv"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/service/ai"
)

// RecommendationsHandler handles recipe recommendation requests
type RecommendationsHandler struct {
	recipeRepo    RecipeRepository
	pantryRepo    PantryRepository
	recommender   ai.RecipeRecommender
}

// NewRecommendationsHandler creates a new recommendations handler
func NewRecommendationsHandler(
	recipeRepo RecipeRepository,
	pantryRepo PantryRepository,
	recommender ai.RecipeRecommender,
) *RecommendationsHandler {
	return &RecommendationsHandler{
		recipeRepo:  recipeRepo,
		pantryRepo:  pantryRepo,
		recommender: recommender,
	}
}

// GetRecommendations handles GET /api/v1/recipes/recommendations
// @Summary Get recipe recommendations
// @Description Get personalized recipe recommendations based on pantry items with dietary and nutrition filters
// @Tags Recipes
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param mealType query string false "Filter by meal type" Enums(breakfast, lunch, dinner, snack, dessert)
// @Param maxTime query int false "Maximum total time in minutes"
// @Param cuisine query string false "Filter by cuisine (e.g., italian, asian, mexican)"
// @Param mood query string false "Mood filter" Enums(quick, comfort, healthy, indulgent)
// @Param diet query string false "Dietary restriction" Enums(vegetarian, vegan, keto, halal, kosher, pescatarian, paleo)
// @Param exclude query []string false "Allergens/ingredients to exclude (e.g., gluten, dairy, nuts)"
// @Param maxCalories query int false "Maximum calories per serving"
// @Param minProtein query int false "Minimum protein grams per serving"
// @Param maxCarbs query int false "Maximum carbs grams per serving"
// @Param maxFat query int false "Maximum fat grams per serving"
// @Param minMatch query int false "Minimum ingredient match percentage (default: 50)"
// @Param limit query int false "Max results per category (default: 10)"
// @Success 200 {object} model.RecommendationResponse "Recipe recommendations"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /recipes/recommendations [get]
func (h *RecommendationsHandler) GetRecommendations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse filter parameters
	filters := &model.RecommendationRequest{}

	// Meal & Time filters
	if v := r.URL.Query().Get("mealType"); v != "" {
		filters.MealType = v
	}
	if v := r.URL.Query().Get("maxTime"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			filters.MaxTime = n
		}
	}

	// Taste & Style filters
	if v := r.URL.Query().Get("cuisine"); v != "" {
		filters.Cuisine = v
	}
	if v := r.URL.Query().Get("mood"); v != "" {
		filters.Mood = v
	}

	// Dietary restrictions
	if v := r.URL.Query()["exclude"]; len(v) > 0 {
		filters.Exclude = v
	}
	if v := r.URL.Query().Get("diet"); v != "" {
		filters.Diet = v
	}

	// Nutrition filters
	if v := r.URL.Query().Get("maxCalories"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			filters.MaxCalories = n
		}
	}
	if v := r.URL.Query().Get("minProtein"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			filters.MinProtein = n
		}
	}
	if v := r.URL.Query().Get("maxCarbs"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			filters.MaxCarbs = n
		}
	}
	if v := r.URL.Query().Get("maxFat"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			filters.MaxFat = n
		}
	}

	// Matching options
	if v := r.URL.Query().Get("minMatch"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			filters.MinMatch = n
		}
	}
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 50 {
			filters.Limit = n
		}
	}

	// Fetch user's recipes with ingredients
	recipes, err := h.recipeRepo.ListForRecommendations(ctx, claims.UserID)
	if err != nil {
		response.InternalError(w)
		return
	}

	// Fetch user's pantry items
	pantryItems, err := h.pantryRepo.ListAll(ctx, claims.UserID)
	if err != nil {
		response.InternalError(w)
		return
	}

	// Get recommendations
	input := &ai.RecommendationInput{
		Recipes:     recipes,
		PantryItems: pantryItems,
		Filters:     filters,
	}

	output, err := h.recommender.GetRecommendations(ctx, input)
	if err != nil {
		response.InternalError(w)
		return
	}

	// Build response
	resp := model.RecommendationResponse{
		ReadyToCook:   output.ReadyToCook,
		AlmostReady:   output.AlmostReady,
		NeedsShopping: output.NeedsShopping,
		Summary:       output.Summary,
		Filters:       output.Filters,
	}

	response.JSON(w, http.StatusOK, resp)
}
