package model

// RecommendationRequest contains filter parameters for recipe recommendations
type RecommendationRequest struct {
	// Meal & Time filters
	MealType string `json:"mealType,omitempty"` // breakfast, lunch, dinner, snack
	MaxTime  int    `json:"maxTime,omitempty"`  // max total time in minutes

	// Taste & Style filters
	Cuisine string `json:"cuisine,omitempty"` // italian, asian, mexican, etc.
	Mood    string `json:"mood,omitempty"`    // quick, comfort, healthy, indulgent

	// Dietary restrictions
	Exclude []string `json:"exclude,omitempty"` // allergens to exclude: gluten, dairy, nuts, etc.
	Diet    string   `json:"diet,omitempty"`    // vegetarian, vegan, keto, halal, kosher

	// Nutrition filters
	MaxCalories int `json:"maxCalories,omitempty"` // max calories per serving
	MinProtein  int `json:"minProtein,omitempty"`  // min protein grams per serving
	MaxCarbs    int `json:"maxCarbs,omitempty"`    // max carbs grams per serving
	MaxFat      int `json:"maxFat,omitempty"`      // max fat grams per serving

	// Matching options
	MinMatch int `json:"minMatch,omitempty"` // minimum ingredient match percentage (default: 50)
	Limit    int `json:"limit,omitempty"`    // max results per category (default: 10)
}

// IngredientMatch represents a matched ingredient between pantry and recipe
type IngredientMatch struct {
	RecipeIngredient string `json:"recipeIngredient"`          // ingredient name in recipe
	PantryItem       string `json:"pantryItem"`                // matched item from pantry
	IsSubstitute     bool   `json:"isSubstitute,omitempty"`    // true if pantry item is a substitute
	SubstituteRatio  string `json:"substituteRatio,omitempty"` // e.g., "1 tsp dried = 1 tbsp fresh"
}

// MissingIngredient represents an ingredient not found in pantry
type MissingIngredient struct {
	Ingredient  string              `json:"ingredient"`            // ingredient name
	Substitutes []SubstituteSuggestion `json:"substitutes,omitempty"` // possible substitutes
	CanSkip     bool                `json:"canSkip"`               // true if optional
	Category    string              `json:"category,omitempty"`    // ingredient category for shopping
}

// SubstituteSuggestion represents a possible substitute for an ingredient
type SubstituteSuggestion struct {
	Source string `json:"source"`          // "pantry" or "common"
	Item   string `json:"item"`            // substitute item name
	Ratio  string `json:"ratio,omitempty"` // substitution ratio
	Notes  string `json:"notes,omitempty"` // any notes about the substitution
}

// RecipeRecommendation represents a single recipe recommendation with matching info
type RecipeRecommendation struct {
	Recipe              *Recipe             `json:"recipe"`
	MatchScore          int                 `json:"matchScore"`                    // 0-100 percentage
	MatchedIngredients  []IngredientMatch   `json:"matchedIngredients"`
	MissingIngredients  []MissingIngredient `json:"missingIngredients"`
	ShoppingListItems   []string            `json:"shoppingListItems,omitempty"`   // items to buy
	Reason              string              `json:"reason,omitempty"`              // why this was recommended
	NutritionPerServing *RecipeNutrition    `json:"nutritionPerServing,omitempty"` // estimated nutrition

	// Filter match metadata - helps frontend display/sort recommendations
	FiltersMatched    []string `json:"filtersMatched,omitempty"`    // filters this recipe matches
	FiltersUnknown    []string `json:"filtersUnknown,omitempty"`    // filters where recipe has no data
	FiltersNotMatched []string `json:"filtersNotMatched,omitempty"` // filters this recipe doesn't match
}

// RecommendationResponse contains categorized recipe recommendations
type RecommendationResponse struct {
	// Categorized recommendations
	ReadyToCook   []RecipeRecommendation `json:"readyToCook"`   // 90-100% match
	AlmostReady   []RecipeRecommendation `json:"almostReady"`   // 70-89% match
	NeedsShopping []RecipeRecommendation `json:"needsShopping"` // 50-69% match

	// Summary statistics
	Summary RecommendationSummary `json:"summary"`

	// Applied filters info
	Filters AppliedFilters `json:"filters"`
}

// RecommendationSummary contains summary statistics
type RecommendationSummary struct {
	TotalRecipes         int                   `json:"totalRecipes"`
	AvgCaloriesPerServing int                   `json:"avgCaloriesPerServing,omitempty"`
	QuickestRecipe       *RecipeQuickInfo      `json:"quickestRecipe,omitempty"`
	HighestProtein       *RecipeQuickInfo      `json:"highestProtein,omitempty"`
	BestMatch            *RecipeQuickInfo      `json:"bestMatch,omitempty"`
}

// RecipeQuickInfo is a minimal recipe reference for summary
type RecipeQuickInfo struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Value     int    `json:"value"` // the relevant metric (time, protein, match score)
	ValueUnit string `json:"valueUnit,omitempty"` // e.g., "min", "g", "%"
}

// AppliedFilters shows what filters were applied to the results
type AppliedFilters struct {
	AppliedMealType   string            `json:"appliedMealType,omitempty"`
	AppliedCuisine    string            `json:"appliedCuisine,omitempty"`
	AppliedMood       string            `json:"appliedMood,omitempty"`
	AppliedMaxTime    int               `json:"appliedMaxTime,omitempty"`
	AppliedDiet       string            `json:"appliedDiet,omitempty"`
	AppliedExclusions []string          `json:"appliedExclusions,omitempty"`
	NutritionFilters  *NutritionFilters `json:"nutritionFilters,omitempty"`
}

// NutritionFilters shows applied nutrition constraints
type NutritionFilters struct {
	MaxCalories int `json:"maxCalories,omitempty"`
	MinProtein  int `json:"minProtein,omitempty"`
	MaxCarbs    int `json:"maxCarbs,omitempty"`
	MaxFat      int `json:"maxFat,omitempty"`
}
