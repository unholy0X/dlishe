package handler

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	apperrors "github.com/dishflow/backend/internal/pkg/errors"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/repository/postgres"
	"github.com/dishflow/backend/internal/service/ai"
)

// ExtractionHandler handles recipe extraction from URLs and images
type ExtractionHandler struct {
	extractor  ai.RecipeExtractor
	recipeRepo *postgres.RecipeRepository
}

// NewExtractionHandler creates a new extraction handler
func NewExtractionHandler(extractor ai.RecipeExtractor, recipeRepo *postgres.RecipeRepository) *ExtractionHandler {
	return &ExtractionHandler{
		extractor:  extractor,
		recipeRepo: recipeRepo,
	}
}

// ExtractFromURLRequest represents a request to extract recipe from a webpage URL
type ExtractFromURLRequest struct {
	URL      string `json:"url"`
	SaveAuto bool   `json:"saveAuto,omitempty"` // Auto-save to user's recipes
}

// ExtractFromURLResponse represents the response for URL extraction
type ExtractFromURLResponse struct {
	Recipe        *ai.ExtractionResult `json:"recipe"`
	SavedID       *string              `json:"savedId,omitempty"` // ID if auto-saved
	AlreadyExists bool                 `json:"alreadyExists"`     // True if recipe already existed
	Source        string               `json:"source"`            // "webpage"
}

// ExtractFromURL (DEPRECATED - use UnifiedExtractionHandler.Extract with type="url" instead)
// This handler is kept for backwards compatibility but is no longer routed.
func (h *ExtractionHandler) ExtractFromURL(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req ExtractFromURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate URL
	if req.URL == "" {
		response.ValidationFailed(w, "url", "URL is required")
		return
	}

	parsedURL, err := url.Parse(req.URL)
	if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		response.ValidationFailed(w, "url", "Invalid URL format")
		return
	}

	// Check if extractor is available
	if h.extractor == nil || !h.extractor.IsAvailable(r.Context()) {
		response.ErrorJSON(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE",
			"Recipe extraction service is not available", nil)
		return
	}

	// Extract recipe from webpage
	result, err := h.extractor.ExtractFromWebpage(r.Context(), req.URL)
	if err != nil {
		response.ErrorJSON(w, http.StatusUnprocessableEntity, "EXTRACTION_FAILED",
			"Failed to extract recipe from URL: "+err.Error(), nil)
		return
	}

	// Validate we got something meaningful
	if result.Title == "" || len(result.Ingredients) == 0 {
		response.ErrorJSON(w, http.StatusUnprocessableEntity, "NO_RECIPE_FOUND",
			"No recipe could be found on this page", nil)
		return
	}

	// Refine the recipe
	refined, err := h.extractor.RefineRecipe(r.Context(), result)
	if err == nil && refined != nil {
		result = refined
	}

	resp := ExtractFromURLResponse{
		Recipe: result,
		Source: "webpage",
	}

	// Auto-save if requested
	if req.SaveAuto {
		// Check if user already has a recipe from this source URL (idempotency)
		existingRecipe, err := h.recipeRepo.GetBySourceURL(r.Context(), claims.UserID, req.URL)
		if err == nil && existingRecipe != nil {
			// Recipe already exists - return existing ID
			savedID := existingRecipe.ID.String()
			resp.SavedID = &savedID
			resp.AlreadyExists = true
		} else if err == postgres.ErrRecipeNotFound {
			// Recipe doesn't exist - save it
			savedID, err := h.saveExtractedRecipe(r, claims.UserID, result, req.URL, "webpage")
			if err != nil {
				response.ErrorJSON(w, http.StatusInternalServerError, apperrors.ErrCodeExtractionFailed,
					"Failed to save recipe", nil)
				return
			}
			resp.SavedID = &savedID
			resp.AlreadyExists = false
		} else {
			// Database error
			response.InternalError(w)
			return
		}
	}

	response.OK(w, resp)
}

// ExtractFromImageRequest represents a request to extract recipe from an image
type ExtractFromImageRequest struct {
	// Image can be provided as base64 or via multipart form
	ImageBase64 string `json:"imageBase64,omitempty"` // Base64 encoded image
	MimeType    string `json:"mimeType,omitempty"`    // e.g., "image/jpeg"
	SaveAuto    bool   `json:"saveAuto,omitempty"`
}

// ExtractFromImageResponse represents the response for image extraction
type ExtractFromImageResponse struct {
	Recipe  *ai.ExtractionResult `json:"recipe"`
	SavedID *string              `json:"savedId,omitempty"`
	Source  string               `json:"source"` // "image"
}

// ExtractFromImage (DEPRECATED - use UnifiedExtractionHandler.Extract with type="image" instead)
// This handler is kept for backwards compatibility but is no longer routed.
func (h *ExtractionHandler) ExtractFromImage(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var imageData []byte
	var mimeType string
	var saveAuto bool

	// Check content type to determine how image is sent
	contentType := r.Header.Get("Content-Type")

	if strings.HasPrefix(contentType, "multipart/form-data") {
		// Handle multipart form upload
		if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
			response.BadRequest(w, "Failed to parse multipart form: "+err.Error())
			return
		}

		file, header, err := r.FormFile("image")
		if err != nil {
			response.ValidationFailed(w, "image", "Image file is required")
			return
		}
		defer file.Close()

		// Read file data
		imageData, err = io.ReadAll(file)
		if err != nil {
			response.BadRequest(w, "Failed to read image file")
			return
		}

		// Determine mime type from header or content
		mimeType = header.Header.Get("Content-Type")
		if mimeType == "" {
			mimeType = detectMimeType(imageData)
		}

		saveAuto = r.FormValue("saveAuto") == "true"

	} else if strings.HasPrefix(contentType, "application/json") {
		// Handle JSON with base64 image
		var req ExtractFromImageRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		if req.ImageBase64 == "" {
			response.ValidationFailed(w, "imageBase64", "Image data is required")
			return
		}

		// Decode base64
		var err error
		imageData, err = base64.StdEncoding.DecodeString(req.ImageBase64)
		if err != nil {
			response.ValidationFailed(w, "imageBase64", "Invalid base64 encoding")
			return
		}

		mimeType = req.MimeType
		if mimeType == "" {
			mimeType = detectMimeType(imageData)
		}
		saveAuto = req.SaveAuto
	} else {
		response.BadRequest(w, "Content-Type must be multipart/form-data or application/json")
		return
	}

	// Validate we have image data
	if len(imageData) == 0 {
		response.ValidationFailed(w, "image", "Image data is empty")
		return
	}

	// Validate size (max 10MB)
	if len(imageData) > 10*1024*1024 {
		response.ValidationFailed(w, "image", "Image size exceeds 10MB limit")
		return
	}

	// Validate mime type
	validTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
		"image/gif":  true,
	}
	if !validTypes[mimeType] {
		response.ValidationFailed(w, "mimeType", "Unsupported image type. Use JPEG, PNG, WebP, or GIF")
		return
	}

	// Check if extractor is available
	if h.extractor == nil || !h.extractor.IsAvailable(r.Context()) {
		response.ErrorJSON(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE",
			"Recipe extraction service is not available", nil)
		return
	}

	// Extract recipe from image
	result, err := h.extractor.ExtractFromImage(r.Context(), imageData, mimeType)
	if err != nil {
		response.ErrorJSON(w, http.StatusUnprocessableEntity, "EXTRACTION_FAILED",
			"Failed to extract recipe from image: "+err.Error(), nil)
		return
	}

	// Validate we got something meaningful
	if result.Title == "" || len(result.Ingredients) == 0 {
		response.ErrorJSON(w, http.StatusUnprocessableEntity, "NO_RECIPE_FOUND",
			"No recipe could be found in this image", nil)
		return
	}

	// Refine the recipe
	refined, err := h.extractor.RefineRecipe(r.Context(), result)
	if err == nil && refined != nil {
		result = refined
	}

	resp := ExtractFromImageResponse{
		Recipe: result,
		Source: "image",
	}

	// Auto-save if requested
	if saveAuto {
		savedID, err := h.saveExtractedRecipe(r, claims.UserID, result, "", "image")
		if err == nil {
			resp.SavedID = &savedID
			log.Printf("[INFO] Auto-saved recipe from image: recipeID=%s, userID=%s", savedID, claims.UserID)
		} else {
			// Log error but don't fail the request - user still gets the extracted recipe
			log.Printf("[ERROR] Failed to auto-save recipe from image: %v", err)
		}
	}

	response.OK(w, resp)
}

// validateExtractionResult validates the AI extraction result before saving
// Returns an error if the result is invalid or incomplete
func validateExtractionResult(result *ai.ExtractionResult) error {
	if result == nil {
		return fmt.Errorf("extraction result is nil")
	}

	// Title is required
	if strings.TrimSpace(result.Title) == "" {
		return fmt.Errorf("recipe title is required")
	}

	// At least one ingredient is required
	validIngredients := 0
	for _, ing := range result.Ingredients {
		if strings.TrimSpace(ing.Name) != "" {
			validIngredients++
		}
	}
	if validIngredients == 0 {
		return fmt.Errorf("at least one valid ingredient is required")
	}

	// Validate servings if provided
	if result.Servings < 0 {
		result.Servings = 0 // Reset invalid value
	}

	// Validate times if provided
	if result.PrepTime < 0 {
		result.PrepTime = 0
	}
	if result.CookTime < 0 {
		result.CookTime = 0
	}

	return nil
}

// saveExtractedRecipe saves an extracted recipe to the database
func (h *ExtractionHandler) saveExtractedRecipe(r *http.Request, userID uuid.UUID, result *ai.ExtractionResult, sourceURL, sourceType string) (string, error) {
	// Validate extraction result before saving
	if err := validateExtractionResult(result); err != nil {
		return "", fmt.Errorf("invalid extraction result: %w", err)
	}

	// Convert ExtractionResult to Recipe model
	recipe := &model.Recipe{
		ID:          uuid.New(),
		UserID:      userID,
		Title:       result.Title,
		Description: stringPtr(result.Description),
		Servings:    intPtr(result.Servings),
		PrepTime:    intPtr(result.PrepTime),
		CookTime:    intPtr(result.CookTime),
		Difficulty:  stringPtr(result.Difficulty),
		Cuisine:     stringPtr(result.Cuisine),
		SourceType:  sourceType,
		SourceURL:   stringPtr(sourceURL),
		Tags:        result.Tags,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}

	// Convert ingredients with category validation
	for i, ing := range result.Ingredients {
		// Skip empty names
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

	if err := h.recipeRepo.Create(r.Context(), recipe); err != nil {
		return "", err
	}

	return recipe.ID.String(), nil
}

// parseQuantity converts a string quantity to float64
// Handles: "1.5", "1/2", "1 1/2" (mixed fractions), "2-3" (takes first value)
func parseQuantity(s string) *float64 {
	if s == "" {
		return nil
	}

	s = strings.TrimSpace(s)

	// Try to parse as simple float first
	var f float64
	if _, err := fmt.Sscanf(s, "%f", &f); err == nil {
		// Check if there's a fraction part after (e.g., "1 1/2")
		parts := strings.Fields(s)
		if len(parts) == 2 {
			var num, denom float64
			if _, err := fmt.Sscanf(parts[1], "%f/%f", &num, &denom); err == nil && denom != 0 {
				f += num / denom
			}
		}
		return &f
	}

	// Try handling simple fractions like "1/2"
	var num, denom float64
	if _, err := fmt.Sscanf(s, "%f/%f", &num, &denom); err == nil && denom != 0 {
		f = num / denom
		return &f
	}

	// Try handling ranges like "2-3" (take the first value)
	if strings.Contains(s, "-") {
		parts := strings.Split(s, "-")
		if len(parts) >= 1 {
			if _, err := fmt.Sscanf(strings.TrimSpace(parts[0]), "%f", &f); err == nil {
				return &f
			}
		}
	}

	return nil
}

// detectMimeType detects image mime type from file magic bytes
func detectMimeType(data []byte) string {
	if len(data) < 4 {
		return "application/octet-stream"
	}

	// Check magic bytes
	if data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image/jpeg"
	}
	if data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 {
		return "image/png"
	}
	if len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP" {
		return "image/webp"
	}
	if data[0] == 0x47 && data[1] == 0x49 && data[2] == 0x46 {
		return "image/gif"
	}

	return "application/octet-stream"
}

// Helper functions
func intPtr(i int) *int {
	if i == 0 {
		return nil
	}
	return &i
}
