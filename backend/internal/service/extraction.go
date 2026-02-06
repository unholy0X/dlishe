package service

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/service/ai"
	"github.com/google/uuid"
)

// ExtractionService orchestrates recipe extraction with caching and enrichment
type ExtractionService struct {
	extractor  ai.RecipeExtractor
	enricher   ai.RecipeEnricher
	cacheRepo  *postgres.ExtractionCacheRepository
	recipeRepo *postgres.RecipeRepository
}

// NewExtractionService creates a new extraction service
func NewExtractionService(
	extractor ai.RecipeExtractor,
	enricher ai.RecipeEnricher,
	cacheRepo *postgres.ExtractionCacheRepository,
	recipeRepo *postgres.RecipeRepository,
) *ExtractionService {
	return &ExtractionService{
		extractor:  extractor,
		enricher:   enricher,
		cacheRepo:  cacheRepo,
		recipeRepo: recipeRepo,
	}
}

// ExtractFromURLOptions contains options for URL extraction
type ExtractFromURLOptions struct {
	BypassCache bool // Force re-extraction even if cached
}

// ExtractFromURLResult contains the extraction result
type ExtractFromURLResult struct {
	Recipe     *model.Recipe
	FromCache  bool
	Enrichment *ai.EnrichmentResult
}

// ExtractFromURL extracts a recipe from a URL with caching and enrichment
func (s *ExtractionService) ExtractFromURL(ctx context.Context, userID uuid.UUID, url string, opts *ExtractFromURLOptions) (*ExtractFromURLResult, error) {
	if opts == nil {
		opts = &ExtractFromURLOptions{}
	}

	// Step 1: Check cache (unless bypassing)
	if !opts.BypassCache && s.cacheRepo != nil {
		cached, err := s.cacheRepo.GetByURL(ctx, url)
		if err == nil && cached != nil && cached.ExtractionResult != nil {
			// Cache hit - clone to user's recipe
			recipe := s.cachedDataToRecipe(userID, url, cached.ExtractionResult)

			// Increment hit count asynchronously
			go s.cacheRepo.IncrementHitCount(context.Background(), cached.URLHash)

			return &ExtractFromURLResult{
				Recipe:    recipe,
				FromCache: true,
			}, nil
		}
		// Cache miss or error - continue with extraction
	}

	// Step 2: Extract recipe from URL
	extracted, err := s.extractor.ExtractFromWebpage(ctx, url, nil)
	if err != nil {
		return nil, fmt.Errorf("extraction failed: %w", err)
	}

	// Step 3: Refine the extraction
	refined, err := s.extractor.RefineRecipe(ctx, extracted)
	if err != nil {
		// Use unrefined if refinement fails
		refined = extracted
	}

	// Step 4: Enrich with nutrition and dietary info
	enrichInput := s.extractionResultToEnrichmentInput(refined)
	enrichResult, err := s.enricher.EnrichRecipe(ctx, enrichInput)
	if err != nil {
		// Log but continue without enrichment
		enrichResult = nil
	}

	// Step 5: Build recipe model
	recipe := s.extractionResultToRecipe(userID, url, refined, enrichResult)

	// Step 6: Cache the result (asynchronously)
	if s.cacheRepo != nil {
		go s.cacheExtractionResult(url, refined, enrichResult)
	}

	return &ExtractFromURLResult{
		Recipe:     recipe,
		FromCache:  false,
		Enrichment: enrichResult,
	}, nil
}

// ExtractFromImage extracts a recipe from an image (no caching for images)
func (s *ExtractionService) ExtractFromImage(ctx context.Context, userID uuid.UUID, imageData []byte, mimeType string) (*ExtractFromURLResult, error) {
	// Step 1: Extract recipe from image
	extracted, err := s.extractor.ExtractFromImage(ctx, imageData, mimeType)
	if err != nil {
		return nil, fmt.Errorf("extraction failed: %w", err)
	}

	// Step 2: Refine the extraction
	refined, err := s.extractor.RefineRecipe(ctx, extracted)
	if err != nil {
		refined = extracted
	}

	// Step 3: Enrich with nutrition and dietary info
	enrichInput := s.extractionResultToEnrichmentInput(refined)
	enrichResult, err := s.enricher.EnrichRecipe(ctx, enrichInput)
	if err != nil {
		enrichResult = nil
	}

	// Step 4: Build recipe model (no source URL for images)
	recipe := s.extractionResultToRecipe(userID, "", refined, enrichResult)
	recipe.SourceType = "photo"

	return &ExtractFromURLResult{
		Recipe:     recipe,
		FromCache:  false,
		Enrichment: enrichResult,
	}, nil
}

// extractionResultToEnrichmentInput converts extraction result to enrichment input
func (s *ExtractionService) extractionResultToEnrichmentInput(result *ai.ExtractionResult) *ai.EnrichmentInput {
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

// extractionResultToRecipe converts extraction result to recipe model
func (s *ExtractionService) extractionResultToRecipe(userID uuid.UUID, sourceURL string, result *ai.ExtractionResult, enrichment *ai.EnrichmentResult) *model.Recipe {
	now := time.Now().UTC()

	recipe := &model.Recipe{
		ID:          uuid.New(),
		UserID:      userID,
		Title:       result.Title,
		SourceType:  "ai",
		Tags:        result.Tags,
		SyncVersion: 1,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if result.Description != "" {
		recipe.Description = &result.Description
	}
	if sourceURL != "" {
		recipe.SourceURL = &sourceURL
	}
	if result.Thumbnail != "" {
		recipe.ThumbnailURL = &result.Thumbnail
	}
	if result.Difficulty != "" {
		recipe.Difficulty = &result.Difficulty
	}
	if result.Cuisine != "" {
		recipe.Cuisine = &result.Cuisine
	}
	if result.PrepTime > 0 {
		recipe.PrepTime = &result.PrepTime
	}
	if result.CookTime > 0 {
		recipe.CookTime = &result.CookTime
	}

	// Servings - use enrichment estimate if extraction didn't provide
	if result.Servings > 0 {
		recipe.Servings = &result.Servings
	} else if enrichment != nil && enrichment.ServingsEstimate != nil && enrichment.ServingsEstimate.Confidence >= ai.MinConfidenceThreshold {
		recipe.Servings = &enrichment.ServingsEstimate.Value
	}

	// Convert ingredients
	recipe.Ingredients = make([]model.RecipeIngredient, len(result.Ingredients))
	for i, ing := range result.Ingredients {
		recipe.Ingredients[i] = model.RecipeIngredient{
			ID:         uuid.New(),
			RecipeID:   recipe.ID,
			Name:       ing.Name,
			Category:   ing.Category,
			IsOptional: ing.IsOptional,
			SortOrder:  i,
			CreatedAt:  now,
		}

		// Parse quantity
		if ing.Quantity != "" {
			if q, err := strconv.ParseFloat(ing.Quantity, 64); err == nil {
				recipe.Ingredients[i].Quantity = &q
			}
		}
		if ing.Unit != "" {
			recipe.Ingredients[i].Unit = &ing.Unit
		}
		if ing.Notes != "" {
			recipe.Ingredients[i].Notes = &ing.Notes
		}
		if ing.VideoTimestamp > 0 {
			ts := int(ing.VideoTimestamp)
			recipe.Ingredients[i].VideoTimestamp = &ts
		}

		// Default category if empty
		if recipe.Ingredients[i].Category == "" {
			recipe.Ingredients[i].Category = "other"
		}
	}

	// Convert steps
	recipe.Steps = make([]model.RecipeStep, len(result.Steps))
	for i, step := range result.Steps {
		recipe.Steps[i] = model.RecipeStep{
			ID:          uuid.New(),
			RecipeID:    recipe.ID,
			StepNumber:  i + 1,
			Instruction: step.Instruction,
			CreatedAt:   now,
		}

		if step.DurationSeconds > 0 {
			recipe.Steps[i].DurationSeconds = &step.DurationSeconds
		}
		if step.Technique != "" {
			recipe.Steps[i].Technique = &step.Technique
		}
		if step.Temperature != "" {
			recipe.Steps[i].Temperature = &step.Temperature
		}
		if step.VideoTimestampStart > 0 {
			ts := int(step.VideoTimestampStart)
			recipe.Steps[i].VideoTimestampStart = &ts
		}
		if step.VideoTimestampEnd > 0 {
			ts := int(step.VideoTimestampEnd)
			recipe.Steps[i].VideoTimestampEnd = &ts
		}
	}

	// Apply enrichment data
	if enrichment != nil {
		recipe.Nutrition = s.enrichmentToNutrition(enrichment.Nutrition)
		recipe.DietaryInfo = s.enrichmentToDietaryInfo(enrichment.DietaryInfo)
	}

	return recipe
}

// enrichmentToNutrition converts enrichment nutrition to model
func (s *ExtractionService) enrichmentToNutrition(nutrition *ai.NutritionEstimate) *model.RecipeNutrition {
	if nutrition == nil || nutrition.Confidence < ai.MinConfidenceThreshold {
		return nil
	}

	return &model.RecipeNutrition{
		Calories:   nutrition.PerServing.Calories,
		Protein:    nutrition.PerServing.Protein,
		Carbs:      nutrition.PerServing.Carbs,
		Fat:        nutrition.PerServing.Fat,
		Fiber:      nutrition.PerServing.Fiber,
		Sugar:      nutrition.PerServing.Sugar,
		Sodium:     nutrition.PerServing.Sodium,
		Tags:       nutrition.Tags,
		Confidence: nutrition.Confidence,
	}
}

// enrichmentToDietaryInfo converts enrichment dietary info to model
func (s *ExtractionService) enrichmentToDietaryInfo(dietary *ai.DietaryInfoEstimate) *model.DietaryInfo {
	if dietary == nil || dietary.Confidence < ai.MinConfidenceThreshold {
		return nil
	}

	info := &model.DietaryInfo{
		Allergens: dietary.Allergens,
		MealTypes: dietary.MealTypes,
	}

	// Only set boolean fields if they're not nil
	if dietary.IsVegetarian != nil {
		info.IsVegetarian = *dietary.IsVegetarian
	}
	if dietary.IsVegan != nil {
		info.IsVegan = *dietary.IsVegan
	}
	if dietary.IsGlutenFree != nil {
		info.IsGlutenFree = *dietary.IsGlutenFree
	}
	if dietary.IsDairyFree != nil {
		info.IsDairyFree = *dietary.IsDairyFree
	}
	if dietary.IsNutFree != nil {
		info.IsNutFree = *dietary.IsNutFree
	}
	if dietary.IsKeto != nil {
		info.IsKeto = *dietary.IsKeto
	}
	if dietary.IsHalal != nil {
		info.IsHalal = *dietary.IsHalal
	}
	if dietary.IsKosher != nil {
		info.IsKosher = *dietary.IsKosher
	}

	return info
}

// cacheExtractionResult saves the extraction result to cache
func (s *ExtractionService) cacheExtractionResult(url string, result *ai.ExtractionResult, enrichment *ai.EnrichmentResult) {
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
	s.cacheRepo.Set(ctx, cache)
}

// cachedDataToRecipe converts cached data to a recipe for a user
func (s *ExtractionService) cachedDataToRecipe(userID uuid.UUID, sourceURL string, cached *model.CachedExtractionData) *model.Recipe {
	now := time.Now().UTC()

	recipe := &model.Recipe{
		ID:          uuid.New(),
		UserID:      userID,
		Title:       cached.Title,
		SourceType:  "ai",
		Tags:        cached.Tags,
		Nutrition:   cached.Nutrition,
		DietaryInfo: cached.DietaryInfo,
		SyncVersion: 1,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if cached.Description != "" {
		recipe.Description = &cached.Description
	}
	if sourceURL != "" {
		recipe.SourceURL = &sourceURL
	}
	if cached.ImageURL != "" {
		recipe.ThumbnailURL = &cached.ImageURL
	}
	if cached.Difficulty != "" {
		recipe.Difficulty = &cached.Difficulty
	}
	if cached.Cuisine != "" {
		recipe.Cuisine = &cached.Cuisine
	}
	if cached.PrepTime > 0 {
		recipe.PrepTime = &cached.PrepTime
	}
	if cached.CookTime > 0 {
		recipe.CookTime = &cached.CookTime
	}
	if cached.Servings > 0 {
		recipe.Servings = &cached.Servings
	}

	// Convert ingredients
	recipe.Ingredients = make([]model.RecipeIngredient, len(cached.Ingredients))
	for i, ing := range cached.Ingredients {
		recipe.Ingredients[i] = model.RecipeIngredient{
			ID:         uuid.New(),
			RecipeID:   recipe.ID,
			Name:       ing.Name,
			Category:   ing.Category,
			IsOptional: ing.IsOptional,
			SortOrder:  i,
			CreatedAt:  now,
		}

		if ing.Quantity != "" {
			if q, err := strconv.ParseFloat(ing.Quantity, 64); err == nil {
				recipe.Ingredients[i].Quantity = &q
			}
		}
		if ing.Unit != "" {
			recipe.Ingredients[i].Unit = &ing.Unit
		}
		if ing.Notes != "" {
			recipe.Ingredients[i].Notes = &ing.Notes
		}
		if ing.VideoTimestamp > 0 {
			ts := int(ing.VideoTimestamp)
			recipe.Ingredients[i].VideoTimestamp = &ts
		}

		if recipe.Ingredients[i].Category == "" {
			recipe.Ingredients[i].Category = "other"
		}
	}

	// Convert steps
	recipe.Steps = make([]model.RecipeStep, len(cached.Steps))
	for i, step := range cached.Steps {
		recipe.Steps[i] = model.RecipeStep{
			ID:          uuid.New(),
			RecipeID:    recipe.ID,
			StepNumber:  i + 1,
			Instruction: step.Instruction,
			CreatedAt:   now,
		}

		if step.DurationSeconds > 0 {
			recipe.Steps[i].DurationSeconds = &step.DurationSeconds
		}
		if step.Technique != "" {
			recipe.Steps[i].Technique = &step.Technique
		}
		if step.Temperature != "" {
			recipe.Steps[i].Temperature = &step.Temperature
		}
		if step.VideoTimestampStart > 0 {
			ts := int(step.VideoTimestampStart)
			recipe.Steps[i].VideoTimestampStart = &ts
		}
		if step.VideoTimestampEnd > 0 {
			ts := int(step.VideoTimestampEnd)
			recipe.Steps[i].VideoTimestampEnd = &ts
		}
	}

	return recipe
}
