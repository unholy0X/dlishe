package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/dishflow/backend/internal/model"
	"github.com/google/generative-ai-go/genai"
)

// RecommendationService implements RecipeRecommender using Gemini AI
type RecommendationService struct {
	client *genai.Client
	model  string
}

// NewRecommendationService creates a new recommendation service
func NewRecommendationService(client *genai.Client) *RecommendationService {
	return &RecommendationService{
		client: client,
		model:  "gemini-2.0-flash",
	}
}

// GetRecommendations returns recipe recommendations based on pantry items and filters
// Filters are SOFT - recipes are included even if they don't match or lack data
// Each recipe includes metadata about which filters it matches/unknown/doesn't match
func (s *RecommendationService) GetRecommendations(ctx context.Context, req *RecommendationInput) (*RecommendationOutput, error) {
	if req == nil || len(req.Recipes) == 0 {
		return &RecommendationOutput{
			ReadyToCook:   []model.RecipeRecommendation{},
			AlmostReady:   []model.RecipeRecommendation{},
			NeedsShopping: []model.RecipeRecommendation{},
		}, nil
	}

	// Build pantry index for fast lookup
	pantryIndex := buildPantryIndex(req.PantryItems)

	// Set default filters
	filters := req.Filters
	if filters == nil {
		filters = &model.RecommendationRequest{}
	}
	minMatch := filters.MinMatch
	if minMatch == 0 {
		minMatch = 50
	}
	limit := filters.Limit
	if limit == 0 {
		limit = 10
	}

	// Process each recipe
	var allRecommendations []model.RecipeRecommendation

	for _, recipe := range req.Recipes {
		// Calculate ingredient match (PRIMARY filter - this one is required)
		matchResult := matchIngredients(recipe.Ingredients, pantryIndex)

		// Skip if below minimum match percentage (only hard requirement)
		if matchResult.MatchScore < minMatch {
			continue
		}

		// Check all filters and build metadata
		filtersMatched, filtersUnknown, filtersNotMatched := checkFilters(recipe, filters)

		// Build recommendation
		rec := model.RecipeRecommendation{
			Recipe:              recipe,
			MatchScore:          matchResult.MatchScore,
			MatchedIngredients:  matchResult.Matched,
			MissingIngredients:  matchResult.Missing,
			NutritionPerServing: recipe.Nutrition,
			FiltersMatched:      filtersMatched,
			FiltersUnknown:      filtersUnknown,
			FiltersNotMatched:   filtersNotMatched,
		}

		// Add shopping list items
		for _, missing := range matchResult.Missing {
			if !missing.CanSkip {
				rec.ShoppingListItems = append(rec.ShoppingListItems, missing.Ingredient)
			}
		}

		// Generate reason based on match score and filters
		rec.Reason = generateReason(rec, filters)

		allRecommendations = append(allRecommendations, rec)
	}

	// Sort recommendations:
	// 1. By number of filters matched (more matched = higher priority)
	// 2. Then by match score (pantry match)
	sort.Slice(allRecommendations, func(i, j int) bool {
		// Count "goodness" score: matched filters count, minus not matched
		scoreI := len(allRecommendations[i].FiltersMatched) - len(allRecommendations[i].FiltersNotMatched)
		scoreJ := len(allRecommendations[j].FiltersMatched) - len(allRecommendations[j].FiltersNotMatched)

		if scoreI != scoreJ {
			return scoreI > scoreJ
		}
		// Same filter score, sort by pantry match
		return allRecommendations[i].MatchScore > allRecommendations[j].MatchScore
	})

	// Categorize recommendations by pantry match score
	output := &RecommendationOutput{
		ReadyToCook:   []model.RecipeRecommendation{},
		AlmostReady:   []model.RecipeRecommendation{},
		NeedsShopping: []model.RecipeRecommendation{},
	}

	for _, rec := range allRecommendations {
		switch {
		case rec.MatchScore >= 90:
			if len(output.ReadyToCook) < limit {
				output.ReadyToCook = append(output.ReadyToCook, rec)
			}
		case rec.MatchScore >= 70:
			if len(output.AlmostReady) < limit {
				output.AlmostReady = append(output.AlmostReady, rec)
			}
		default: // 50-69
			if len(output.NeedsShopping) < limit {
				output.NeedsShopping = append(output.NeedsShopping, rec)
			}
		}
	}

	// Build summary
	output.Summary = buildSummary(output)

	// Build applied filters info (shows what user requested)
	output.Filters = model.AppliedFilters{
		AppliedMealType:   filters.MealType,
		AppliedCuisine:    filters.Cuisine,
		AppliedMood:       filters.Mood,
		AppliedMaxTime:    filters.MaxTime,
		AppliedDiet:       filters.Diet,
		AppliedExclusions: filters.Exclude,
	}
	if filters.MaxCalories > 0 || filters.MinProtein > 0 || filters.MaxCarbs > 0 || filters.MaxFat > 0 {
		output.Filters.NutritionFilters = &model.NutritionFilters{
			MaxCalories: filters.MaxCalories,
			MinProtein:  filters.MinProtein,
			MaxCarbs:    filters.MaxCarbs,
			MaxFat:      filters.MaxFat,
		}
	}

	return output, nil
}

// checkFilters checks all filters against a recipe and returns matched/unknown/notMatched lists
func checkFilters(recipe *model.Recipe, filters *model.RecommendationRequest) (matched, unknown, notMatched []string) {
	// Check mealType
	if filters.MealType != "" {
		if recipe.DietaryInfo == nil || len(recipe.DietaryInfo.MealTypes) == 0 {
			unknown = append(unknown, "mealType")
		} else if matchesMealType(recipe, filters.MealType) {
			matched = append(matched, "mealType")
		} else {
			notMatched = append(notMatched, "mealType")
		}
	}

	// Check maxTime
	if filters.MaxTime > 0 {
		totalTime := recipe.TotalTime()
		if totalTime == 0 {
			unknown = append(unknown, "maxTime")
		} else if totalTime <= filters.MaxTime {
			matched = append(matched, "maxTime")
		} else {
			notMatched = append(notMatched, "maxTime")
		}
	}

	// Check cuisine
	if filters.Cuisine != "" {
		if recipe.Cuisine == nil || *recipe.Cuisine == "" {
			unknown = append(unknown, "cuisine")
		} else if matchesCuisine(recipe, filters.Cuisine) {
			matched = append(matched, "cuisine")
		} else {
			notMatched = append(notMatched, "cuisine")
		}
	}

	// Check diet
	if filters.Diet != "" {
		if recipe.DietaryInfo == nil {
			unknown = append(unknown, "diet")
		} else if checkDietMatch(recipe.DietaryInfo, filters.Diet) {
			matched = append(matched, "diet")
		} else {
			notMatched = append(notMatched, "diet")
		}
	}

	// Check exclusions (allergens)
	if len(filters.Exclude) > 0 {
		if recipe.DietaryInfo == nil {
			unknown = append(unknown, "exclude")
		} else if checkExclusionsMatch(recipe.DietaryInfo, filters.Exclude) {
			matched = append(matched, "exclude")
		} else {
			notMatched = append(notMatched, "exclude")
		}
	}

	// Check nutrition filters
	if filters.MaxCalories > 0 {
		if recipe.Nutrition == nil {
			unknown = append(unknown, "maxCalories")
		} else if recipe.Nutrition.Calories <= filters.MaxCalories {
			matched = append(matched, "maxCalories")
		} else {
			notMatched = append(notMatched, "maxCalories")
		}
	}

	if filters.MinProtein > 0 {
		if recipe.Nutrition == nil {
			unknown = append(unknown, "minProtein")
		} else if recipe.Nutrition.Protein >= filters.MinProtein {
			matched = append(matched, "minProtein")
		} else {
			notMatched = append(notMatched, "minProtein")
		}
	}

	if filters.MaxCarbs > 0 {
		if recipe.Nutrition == nil {
			unknown = append(unknown, "maxCarbs")
		} else if recipe.Nutrition.Carbs <= filters.MaxCarbs {
			matched = append(matched, "maxCarbs")
		} else {
			notMatched = append(notMatched, "maxCarbs")
		}
	}

	if filters.MaxFat > 0 {
		if recipe.Nutrition == nil {
			unknown = append(unknown, "maxFat")
		} else if recipe.Nutrition.Fat <= filters.MaxFat {
			matched = append(matched, "maxFat")
		} else {
			notMatched = append(notMatched, "maxFat")
		}
	}

	return matched, unknown, notMatched
}

// checkDietMatch checks if recipe matches the diet filter
func checkDietMatch(dietary *model.DietaryInfo, diet string) bool {
	switch strings.ToLower(diet) {
	case "vegetarian":
		return dietary.IsVegetarian
	case "vegan":
		return dietary.IsVegan
	case "keto":
		return dietary.IsKeto
	case "halal":
		return dietary.IsHalal
	case "kosher":
		return dietary.IsKosher
	case "gluten-free", "glutenfree":
		return dietary.IsGlutenFree
	case "dairy-free", "dairyfree":
		return dietary.IsDairyFree
	default:
		return false
	}
}

// checkExclusionsMatch checks if recipe is free of all excluded allergens
func checkExclusionsMatch(dietary *model.DietaryInfo, exclusions []string) bool {
	for _, exclude := range exclusions {
		exclude = strings.ToLower(exclude)

		// Check specific flags
		switch exclude {
		case "gluten":
			if !dietary.IsGlutenFree {
				return false
			}
		case "dairy", "lactose":
			if !dietary.IsDairyFree {
				return false
			}
		case "nuts":
			if !dietary.IsNutFree {
				return false
			}
		}

		// Check allergens list
		for _, allergen := range dietary.Allergens {
			if strings.ToLower(allergen) == exclude {
				return false
			}
		}
	}
	return true
}

// EstimateNutrition estimates nutrition info for a recipe based on ingredients
func (s *RecommendationService) EstimateNutrition(ctx context.Context, ingredients []model.RecipeIngredient) (*model.RecipeNutrition, error) {
	if len(ingredients) == 0 {
		return nil, nil
	}

	genModel := s.client.GenerativeModel(s.model)
	genModel.ResponseMIMEType = "application/json"

	// Build ingredient list for prompt
	var ingList []string
	for _, ing := range ingredients {
		var entry string
		if ing.Quantity != nil && ing.Unit != nil {
			entry = fmt.Sprintf("%.2f %s %s", *ing.Quantity, *ing.Unit, ing.Name)
		} else if ing.Quantity != nil {
			entry = fmt.Sprintf("%.2f %s", *ing.Quantity, ing.Name)
		} else {
			entry = ing.Name
		}
		ingList = append(ingList, entry)
	}

	prompt := fmt.Sprintf(`You are a nutrition expert. Estimate the nutritional information per serving for a recipe with these ingredients:

**Ingredients**:
%s

**Instructions**:
1. Estimate calories, protein, carbs, fat, fiber, sugar, and sodium per serving
2. Assume the recipe makes approximately 4 servings unless ingredients suggest otherwise
3. Be conservative in estimates
4. Add relevant nutrition tags based on the values

**Return JSON**:
{
    "calories": 450,
    "protein": 25,
    "carbs": 30,
    "fat": 20,
    "fiber": 5,
    "sugar": 8,
    "sodium": 600,
    "tags": ["high-protein"],
    "confidence": 0.75
}

**Tag guidelines**:
- "low-calorie": < 300 cal/serving
- "high-protein": > 25g protein/serving
- "low-carb": < 20g carbs/serving
- "keto-friendly": < 10g net carbs
- "low-fat": < 10g fat/serving
- "high-fiber": > 8g fiber/serving
- "low-sodium": < 400mg sodium

Return ONLY the JSON.`, strings.Join(ingList, "\n"))

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("nutrition estimation failed: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no nutrition content generated")
	}

	var result model.RecipeNutrition
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			if err := json.Unmarshal([]byte(txt), &result); err != nil {
				return nil, fmt.Errorf("failed to parse nutrition JSON: %w", err)
			}
			break
		}
	}

	return &result, nil
}

// SuggestSubstitutes suggests ingredient substitutes from pantry or common alternatives
func (s *RecommendationService) SuggestSubstitutes(ctx context.Context, ingredient string, pantryItems []string) ([]model.SubstituteSuggestion, error) {
	genModel := s.client.GenerativeModel(s.model)
	genModel.ResponseMIMEType = "application/json"

	pantryList := "None"
	if len(pantryItems) > 0 {
		pantryList = strings.Join(pantryItems, ", ")
	}

	prompt := fmt.Sprintf(`You are a chef expert in ingredient substitutions.

**Missing ingredient**: %s

**Available pantry items**: %s

**Instructions**:
1. First, check if any pantry item can substitute for the missing ingredient
2. Then suggest common substitutes that most kitchens have
3. Provide the substitution ratio
4. Include any notes about how the substitute affects the dish

**Return JSON array**:
[
    {
        "source": "pantry",
        "item": "Greek yogurt",
        "ratio": "1:1",
        "notes": "Will add tanginess, works well in baking"
    },
    {
        "source": "common",
        "item": "Applesauce",
        "ratio": "1/2 cup per egg",
        "notes": "Good for baking, adds sweetness"
    }
]

Return ONLY the JSON array. Empty array if no good substitutes exist.`, ingredient, pantryList)

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("substitute suggestion failed: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return []model.SubstituteSuggestion{}, nil
	}

	var result []model.SubstituteSuggestion
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			if err := json.Unmarshal([]byte(txt), &result); err != nil {
				return nil, fmt.Errorf("failed to parse substitutes JSON: %w", err)
			}
			break
		}
	}

	return result, nil
}

// Helper types and functions

type pantryIndex map[string]model.PantryItem

func buildPantryIndex(items []model.PantryItem) pantryIndex {
	index := make(pantryIndex)
	for _, item := range items {
		// Index by normalized name
		name := normalizeIngredientName(item.Name)
		index[name] = item
	}
	return index
}

func normalizeIngredientName(name string) string {
	// Lowercase and remove common words
	name = strings.ToLower(strings.TrimSpace(name))
	// Remove plurals (simple version)
	name = strings.TrimSuffix(name, "es")
	name = strings.TrimSuffix(name, "s")
	return name
}

type matchResult struct {
	MatchScore int
	Matched    []model.IngredientMatch
	Missing    []model.MissingIngredient
}

func matchIngredients(recipeIngredients []model.RecipeIngredient, pantry pantryIndex) matchResult {
	if len(recipeIngredients) == 0 {
		return matchResult{MatchScore: 100}
	}

	var matched []model.IngredientMatch
	var missing []model.MissingIngredient

	for _, ing := range recipeIngredients {
		ingName := normalizeIngredientName(ing.Name)

		// Try exact match
		if pantryItem, found := pantry[ingName]; found {
			matched = append(matched, model.IngredientMatch{
				RecipeIngredient: ing.Name,
				PantryItem:       pantryItem.Name,
				IsSubstitute:     false,
			})
			continue
		}

		// Try partial match (ingredient name contains pantry item or vice versa)
		foundPartial := false
		for pantryName, pantryItem := range pantry {
			if strings.Contains(ingName, pantryName) || strings.Contains(pantryName, ingName) {
				matched = append(matched, model.IngredientMatch{
					RecipeIngredient: ing.Name,
					PantryItem:       pantryItem.Name,
					IsSubstitute:     false,
				})
				foundPartial = true
				break
			}
		}
		if foundPartial {
			continue
		}

		// Try common substitutes (hardcoded for speed, AI can enhance later)
		if sub := findCommonSubstitute(ingName, pantry); sub != nil {
			matched = append(matched, *sub)
			continue
		}

		// Not found - add to missing
		missingIng := model.MissingIngredient{
			Ingredient: ing.Name,
			CanSkip:    ing.IsOptional,
			Category:   ing.Category,
		}
		missing = append(missing, missingIng)
	}

	// Calculate match score
	totalRequired := 0
	for _, ing := range recipeIngredients {
		if !ing.IsOptional {
			totalRequired++
		}
	}
	if totalRequired == 0 {
		totalRequired = len(recipeIngredients)
	}

	matchedRequired := 0
	for _, m := range matched {
		// Count matched required ingredients
		for _, ing := range recipeIngredients {
			if normalizeIngredientName(ing.Name) == normalizeIngredientName(m.RecipeIngredient) && !ing.IsOptional {
				matchedRequired++
				break
			}
		}
	}

	matchScore := 100
	if totalRequired > 0 {
		matchScore = (matchedRequired * 100) / totalRequired
	}

	return matchResult{
		MatchScore: matchScore,
		Matched:    matched,
		Missing:    missing,
	}
}

// Common ingredient substitutes for fast matching
var commonSubstitutes = map[string][]string{
	"butter":       {"margarine", "oil", "coconut oil"},
	"milk":         {"almond milk", "oat milk", "soy milk", "coconut milk"},
	"egg":          {"flax egg", "chia egg", "applesauce"},
	"flour":        {"almond flour", "coconut flour", "whole wheat flour"},
	"sugar":        {"honey", "maple syrup", "stevia"},
	"sour cream":   {"greek yogurt", "yogurt"},
	"heavy cream":  {"coconut cream", "evaporated milk"},
	"lemon juice":  {"lime juice", "vinegar"},
	"onion":        {"shallot", "leek", "green onion"},
	"garlic":       {"garlic powder", "garlic paste"},
	"chicken broth": {"vegetable broth", "beef broth", "water"},
	"parsley":      {"cilantro", "basil"},
	"basil":        {"oregano", "parsley"},
}

func findCommonSubstitute(ingredient string, pantry pantryIndex) *model.IngredientMatch {
	subs, hasSubs := commonSubstitutes[ingredient]
	if !hasSubs {
		return nil
	}

	for _, sub := range subs {
		subNorm := normalizeIngredientName(sub)
		if pantryItem, found := pantry[subNorm]; found {
			return &model.IngredientMatch{
				RecipeIngredient: ingredient,
				PantryItem:       pantryItem.Name,
				IsSubstitute:     true,
				SubstituteRatio:  "1:1", // Default ratio
			}
		}
	}
	return nil
}

func matchesMealType(recipe *model.Recipe, mealType string) bool {
	if recipe.DietaryInfo == nil || len(recipe.DietaryInfo.MealTypes) == 0 {
		// If no meal type info, include it (can't filter accurately)
		return true
	}

	mealType = strings.ToLower(mealType)
	for _, mt := range recipe.DietaryInfo.MealTypes {
		if strings.ToLower(mt) == mealType {
			return true
		}
	}
	return false
}

func matchesCuisine(recipe *model.Recipe, cuisine string) bool {
	if recipe.Cuisine == nil {
		return true
	}
	return strings.EqualFold(*recipe.Cuisine, cuisine)
}

func generateReason(rec model.RecipeRecommendation, filters *model.RecommendationRequest) string {
	var reasons []string

	// Pantry match reason
	if rec.MatchScore >= 90 {
		reasons = append(reasons, "You have all the ingredients")
	} else if rec.MatchScore >= 70 {
		missing := len(rec.MissingIngredients)
		reasons = append(reasons, fmt.Sprintf("Just %d ingredient(s) missing", missing))
	}

	// Add reasons based on matched filters
	for _, filter := range rec.FiltersMatched {
		switch filter {
		case "mealType":
			reasons = append(reasons, fmt.Sprintf("Perfect for %s", filters.MealType))
		case "maxTime":
			reasons = append(reasons, fmt.Sprintf("Ready in %d min", rec.Recipe.TotalTime()))
		case "maxCalories":
			if rec.Recipe.Nutrition != nil {
				reasons = append(reasons, fmt.Sprintf("%d cal/serving", rec.Recipe.Nutrition.Calories))
			}
		case "minProtein":
			if rec.Recipe.Nutrition != nil {
				reasons = append(reasons, fmt.Sprintf("%dg protein", rec.Recipe.Nutrition.Protein))
			}
		case "diet":
			reasons = append(reasons, strings.Title(filters.Diet))
		case "cuisine":
			if rec.Recipe.Cuisine != nil {
				reasons = append(reasons, *rec.Recipe.Cuisine)
			}
		}
	}

	// Mood-based reasons
	if filters.Mood != "" {
		switch strings.ToLower(filters.Mood) {
		case "quick":
			if rec.Recipe.TotalTime() > 0 && rec.Recipe.TotalTime() <= 30 {
				reasons = append(reasons, "Quick to make")
			}
		case "healthy":
			if rec.Recipe.Nutrition != nil && rec.Recipe.Nutrition.Calories < 400 {
				reasons = append(reasons, "Low calorie option")
			}
		case "comfort":
			reasons = append(reasons, "Comfort food")
		case "indulgent":
			reasons = append(reasons, "Treat yourself")
		}
	}

	if len(reasons) == 0 {
		return "Matches your pantry"
	}
	return strings.Join(reasons, " • ")
}

func buildSummary(output *RecommendationOutput) model.RecommendationSummary {
	total := len(output.ReadyToCook) + len(output.AlmostReady) + len(output.NeedsShopping)

	summary := model.RecommendationSummary{
		TotalRecipes: total,
	}

	// Find quickest recipe
	var quickest *model.RecipeRecommendation
	var highestProtein *model.RecipeRecommendation
	var bestMatch *model.RecipeRecommendation

	allRecs := append(append(output.ReadyToCook, output.AlmostReady...), output.NeedsShopping...)

	var totalCals int
	calsCount := 0

	for i := range allRecs {
		rec := &allRecs[i]

		// Track quickest
		if quickest == nil || rec.Recipe.TotalTime() < quickest.Recipe.TotalTime() {
			if rec.Recipe.TotalTime() > 0 {
				quickest = rec
			}
		}

		// Track highest protein
		if rec.Recipe.Nutrition != nil {
			totalCals += rec.Recipe.Nutrition.Calories
			calsCount++

			if highestProtein == nil || rec.Recipe.Nutrition.Protein > highestProtein.Recipe.Nutrition.Protein {
				highestProtein = rec
			}
		}

		// Track best match
		if bestMatch == nil || rec.MatchScore > bestMatch.MatchScore {
			bestMatch = rec
		}
	}

	if quickest != nil {
		summary.QuickestRecipe = &model.RecipeQuickInfo{
			ID:        quickest.Recipe.ID.String(),
			Title:     quickest.Recipe.Title,
			Value:     quickest.Recipe.TotalTime(),
			ValueUnit: "min",
		}
	}

	if highestProtein != nil && highestProtein.Recipe.Nutrition != nil {
		summary.HighestProtein = &model.RecipeQuickInfo{
			ID:        highestProtein.Recipe.ID.String(),
			Title:     highestProtein.Recipe.Title,
			Value:     highestProtein.Recipe.Nutrition.Protein,
			ValueUnit: "g",
		}
	}

	if bestMatch != nil {
		summary.BestMatch = &model.RecipeQuickInfo{
			ID:        bestMatch.Recipe.ID.String(),
			Title:     bestMatch.Recipe.Title,
			Value:     bestMatch.MatchScore,
			ValueUnit: "%",
		}
	}

	if calsCount > 0 {
		summary.AvgCaloriesPerServing = totalCals / calsCount
	}

	return summary
}
