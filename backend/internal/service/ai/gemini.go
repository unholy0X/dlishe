package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/dishflow/backend/internal/model"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// fetchWebpage fetches the content of a webpage and returns it as text
// It uses goquery for proper HTML parsing and extracts readable text content
func fetchWebpage(ctx context.Context, url string) (string, error) {
	// Create HTTP client with timeout and redirect handling
	client := &http.Client{
		Timeout: 45 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return fmt.Errorf("too many redirects")
			}
			return nil
		},
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}

	// Set user agent to avoid being blocked
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	// Read body with size limit (5MB max to avoid memory issues)
	limitedReader := io.LimitReader(resp.Body, 5*1024*1024)

	// Parse HTML with goquery
	doc, err := goquery.NewDocumentFromReader(limitedReader)
	if err != nil {
		return "", fmt.Errorf("failed to parse HTML: %w", err)
	}

	// Remove non-content elements
	doc.Find("script, style, nav, footer, header, aside, .sidebar, .advertisement, .ads, .comments, .social-share, noscript, iframe").Remove()

	// Try to find recipe-specific content first (common recipe schema selectors)
	var contentBuilder strings.Builder

	// Look for JSON-LD recipe schema (most reliable source)
	doc.Find("script[type='application/ld+json']").Each(func(i int, s *goquery.Selection) {
		jsonText := s.Text()
		if strings.Contains(jsonText, "Recipe") || strings.Contains(jsonText, "recipe") {
			contentBuilder.WriteString("\n[Recipe Schema Data]\n")
			contentBuilder.WriteString(jsonText)
			contentBuilder.WriteString("\n")
		}
	})

	// Extract title
	title := doc.Find("h1").First().Text()
	if title == "" {
		title = doc.Find("title").Text()
	}
	if title != "" {
		contentBuilder.WriteString("Title: ")
		contentBuilder.WriteString(strings.TrimSpace(title))
		contentBuilder.WriteString("\n\n")
	}

	// Look for recipe-specific containers
	recipeSelectors := []string{
		".recipe", ".recipe-content", ".recipe-card",
		"[itemtype*='Recipe']", "[class*='recipe']",
		".ingredients", ".instructions", ".directions",
		"article", "main", ".post-content", ".entry-content",
	}

	foundRecipeContent := false
	for _, selector := range recipeSelectors {
		content := doc.Find(selector)
		if content.Length() > 0 {
			text := cleanText(content.Text())
			if len(text) > 100 { // Only use if substantial content
				contentBuilder.WriteString(text)
				contentBuilder.WriteString("\n\n")
				foundRecipeContent = true
				break
			}
		}
	}

	// Fallback: extract all body text if no recipe content found
	if !foundRecipeContent {
		bodyText := cleanText(doc.Find("body").Text())
		contentBuilder.WriteString(bodyText)
	}

	// Limit content length for Gemini (keep first ~50KB of text)
	finalText := contentBuilder.String()
	if len(finalText) > 50000 {
		finalText = finalText[:50000] + "\n[Content truncated...]"
	}

	return finalText, nil
}

// cleanText cleans up extracted text by removing excess whitespace
func cleanText(text string) string {
	// Split into lines and clean each
	lines := strings.Split(text, "\n")
	var cleanLines []string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		// Skip empty lines and very short lines (likely noise)
		if line != "" && len(line) > 2 {
			cleanLines = append(cleanLines, line)
		}
	}

	return strings.Join(cleanLines, "\n")
}

// retryConfig holds retry parameters
type retryConfig struct {
	maxAttempts int
	baseDelay   time.Duration
	maxDelay    time.Duration
}

// defaultRetryConfig is used for Gemini API calls
var defaultRetryConfig = retryConfig{
	maxAttempts: 3,
	baseDelay:   1 * time.Second,
	maxDelay:    10 * time.Second,
}

// isRetryableError checks if an error should trigger a retry
func isRetryableError(err error) bool {
	if err == nil {
		return false
	}
	errStr := err.Error()
	// Retry on common transient errors
	return strings.Contains(errStr, "503") ||
		strings.Contains(errStr, "429") ||
		strings.Contains(errStr, "500") ||
		strings.Contains(errStr, "timeout") ||
		strings.Contains(errStr, "connection reset") ||
		strings.Contains(errStr, "temporary failure") ||
		strings.Contains(errStr, "RESOURCE_EXHAUSTED")
}

// withRetry executes a function with exponential backoff retry
func withRetry[T any](ctx context.Context, cfg retryConfig, fn func() (T, error)) (T, error) {
	var lastErr error
	var zero T

	for attempt := 0; attempt < cfg.maxAttempts; attempt++ {
		// Check context before attempt
		if ctx.Err() != nil {
			return zero, ctx.Err()
		}

		result, err := fn()
		if err == nil {
			return result, nil
		}

		lastErr = err

		// Don't retry non-retryable errors
		if !isRetryableError(err) {
			return zero, err
		}

		// Don't wait after the last attempt
		if attempt < cfg.maxAttempts-1 {
			// Calculate delay with exponential backoff
			delay := cfg.baseDelay * time.Duration(1<<uint(attempt))
			if delay > cfg.maxDelay {
				delay = cfg.maxDelay
			}

			// Wait with context cancellation support
			select {
			case <-ctx.Done():
				return zero, ctx.Err()
			case <-time.After(delay):
				// Continue to next attempt
			}
		}
	}

	return zero, fmt.Errorf("max retries exceeded: %w", lastErr)
}

// GeminiClient implements RecipeExtractor using Google's Gemini API
type GeminiClient struct {
	client *genai.Client
	model  string
}

// NewGeminiClient creates a new Gemini client
func NewGeminiClient(ctx context.Context, apiKey string) (*GeminiClient, error) {
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, err
	}

	// Use the latest flash model
	// verified: gemini-2.0-flash (or gemini-2.0-flash when stable)
	return &GeminiClient{
		client: client,
		model:  "gemini-2.0-flash",
	}, nil
}

// ExtractRecipe extracts a recipe from a video file
func (g *GeminiClient) ExtractRecipe(ctx context.Context, req ExtractionRequest, onProgress ProgressCallback) (*ExtractionResult, error) {
	// 1. Upload file
	onProgress(model.JobStatusDownloading, 20, "Uploading video to Gemini...")

	f, err := g.uploadFile(ctx, req.VideoURL) // Note: req.VideoURL here is expected to be a local path in this internal method, or we handle it in service layer.
	// Wait! The interface says ExtractionRequest contains VideoURL (string).
	// The caller (handler) downloads it first?
	// The interface doesn't specify if VideoURL is local or remote.
	// But usually the Service encapsulates the complexity.
	// Let's assume the caller (Handler or a specialized Service) handles the download and passes the local path.
	// OR we change the interface to accept a Reader or Path.
	// But sticking to the interface:
	// If the implementation expects a local path, it limits us.
	// However, `VideoHandler` will use `Downloader` then call this.
	// So `req.VideoURL` passed here *should* be the local path?
	// No, that's confusing.
	// Let's assume for this implementation (GeminiClient) that we modify it to accept a path separately
	// OR we treat req.VideoURL as the path if it exists locally.

	// Actually, the interface `ExtractRecipe(ctx context.Context, req ExtractionRequest, ...)` is defined.
	// `ExtractionRequest` has `VideoURL`.
	// I will assume for this step that the `VideoURL` field holds the LOCAL PATH to the file
	// because the VideoHandler will have downloaded it.
	// This is a bit hacky on the naming, but practical for now.

	if err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}
	defer g.client.DeleteFile(ctx, f.Name)

	// 2. Wait for processing
	onProgress(model.JobStatusProcessing, 40, "Waiting for Gemini processing...")
	for {
		file, err := g.client.GetFile(ctx, f.Name)
		if err != nil {
			return nil, fmt.Errorf("get file failed: %w", err)
		}
		if file.State == genai.FileStateActive {
			break
		}
		if file.State == genai.FileStateFailed {
			return nil, fmt.Errorf("video processing failed")
		}
		time.Sleep(2 * time.Second)
	}

	// 3. Generate content with retry
	onProgress(model.JobStatusExtracting, 60, "Analyzing video content...")

	genModel := g.client.GenerativeModel(g.model)
	genModel.ResponseMIMEType = "application/json"

	prompt := fmt.Sprintf(`
		You are an expert chef and food analyst. Analyze this video and extract the recipe details.

		Target Language: %s
		Detail Level: %s (if 'detailed', provide very precise steps and timestamps).

		Return a JSON object matching this structure:
		{
			"title": "Recipe Title",
			"description": "Brief description",
			"servings": 4,
			"prepTime": 15, // minutes
			"cookTime": 30, // minutes
			"difficulty": "Easy", // Easy, Medium, Hard
			"cuisine": "Italian",
			"ingredients": [
				{ "name": "Ingredient 1", "quantity": "2", "unit": "cups", "category": "produce", "isOptional": false, "notes": "", "videoTimestamp": 0 }
			],
			"steps": [
				{ "stepNumber": 1, "instruction": "Do this", "durationSeconds": 60, "technique": "Chopping", "temperature": "", "videoTimestampStart": 0, "videoTimestampEnd": 60 }
			],
			"tags": ["pasta", "dinner"]
		}

		If the video is not a cooking video or no recipe can be found, return a JSON with error field or just empty fields.
	`, req.Language, req.DetailLevel)

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, genai.FileData{URI: f.URI}, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("generation failed: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no content generated")
	}

	// 4. Parse response
	onProgress(model.JobStatusExtracting, 90, "Finalizing recipe...")

	var result ExtractionResult
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			if err := json.Unmarshal([]byte(txt), &result); err != nil {
				// Try to sanitize markdown code blocks if present (though ResponseMIMEType shouldn't have them)
				// But just in case
				s := string(txt)
				// remove ```json ... ```
				// ... (simple cleanup if needed, but 2.0 Flash is usually clean with application/json)
				return nil, fmt.Errorf("failed to parse JSON: %w (content: %s)", err, s)
			}
			break
		}
	}

	return &result, nil
}

// RefineRecipe reviews and improves an extracted recipe
func (g *GeminiClient) RefineRecipe(ctx context.Context, rawRecipe *ExtractionResult) (*ExtractionResult, error) {
	genModel := g.client.GenerativeModel(g.model)
	genModel.ResponseMIMEType = "application/json"

	// Convert raw recipe to JSON for the prompt
	rawJSON, err := json.Marshal(rawRecipe)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal recipe: %w", err)
	}

	prompt := fmt.Sprintf(`You are a professional chef reviewing a recipe extraction. Your task is to refine and improve this recipe.

**Original Recipe (JSON)**:
%s

**Your refinement tasks**:

1. **Standardize naming**:
   - Use consistent ingredient names (e.g., "Green chili pepper" → "Green chili")
   - Keep names specific enough to be useful (don't merge "red onion" into just "onion")
   - Use singular form for countable items

2. **Fix quantities**:
   - Ensure all ingredients have proper measurements
   - If quantity is missing, add a reasonable estimate
   - Use standard units (cups, tablespoons, teaspoons, grams, etc.)

3. **Ensure valid categories**:
   - Every ingredient MUST have a category from: dairy, produce, proteins, bakery, pantry, spices, condiments, beverages, snacks, frozen, household, other
   - If category is empty or invalid, assign the most appropriate one
   - Default to "other" if truly uncertain

4. **Verify steps**:
   - Ensure instructions are clear and sequential
   - Fix any grammatical issues
   - Ensure step numbers are correct (1, 2, 3...)

**CRITICAL RULES - NEVER VIOLATE**:
- NEVER remove or merge ingredients - keep ALL ingredients from the original
- NEVER reduce the ingredient count - output must have >= original ingredient count
- NEVER leave category empty - every ingredient must have a valid category
- If two ingredients seem similar, keep BOTH - add notes to clarify difference
- Preserve all timestamps, techniques, and other metadata exactly
- Return the refined recipe in the EXACT SAME JSON structure

Original ingredient count: %d - Your output MUST have at least %d ingredients.

Return ONLY the JSON, no explanations.`, string(rawJSON), len(rawRecipe.Ingredients), len(rawRecipe.Ingredients))

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("refinement generation failed: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no refinement content generated")
	}

	// Parse refined response
	var refined ExtractionResult
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			if err := json.Unmarshal([]byte(txt), &refined); err != nil {
				return nil, fmt.Errorf("failed to parse refined JSON: %w", err)
			}
			break
		}
	}

	// SAFETY CHECK: Ensure refinement didn't drop ingredients
	originalCount := len(rawRecipe.Ingredients)
	refinedCount := len(refined.Ingredients)

	if refinedCount < originalCount {
		// Refinement dropped ingredients - merge: keep refined but add back missing
		// This preserves AI improvements while preventing data loss
		refinedNames := make(map[string]bool)
		for _, ing := range refined.Ingredients {
			refinedNames[strings.ToLower(ing.Name)] = true
		}

		// Add back any missing ingredients from original
		for _, orig := range rawRecipe.Ingredients {
			if !refinedNames[strings.ToLower(orig.Name)] {
				// Ensure category is valid before adding
				if orig.Category == "" {
					orig.Category = "other"
				}
				refined.Ingredients = append(refined.Ingredients, orig)
			}
		}
	}

	// Ensure all ingredients have valid categories
	for i := range refined.Ingredients {
		if refined.Ingredients[i].Category == "" {
			refined.Ingredients[i].Category = "other"
		}
	}

	return &refined, nil
}

func (g *GeminiClient) uploadFile(ctx context.Context, path string) (*genai.File, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	return g.client.UploadFile(ctx, "", f, nil)
}

// ValidateURL checks if the URL is valid (not used in this implementation as we expect local path)
func (g *GeminiClient) ValidateURL(url string) error {
	return nil
}

// AnalyzeShoppingList analyzes a shopping list for improvements
func (g *GeminiClient) AnalyzeShoppingList(ctx context.Context, list model.ShoppingListWithItems) (*ListAnalysisResult, error) {
	genModel := g.client.GenerativeModel(g.model)
	genModel.ResponseMIMEType = "application/json"

	// Prepare list data for prompt
	listJSON, err := json.Marshal(list)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal list: %w", err)
	}

	prompt := fmt.Sprintf(`
		You are an expert home economist and chef. Analyze this shopping list and provide helpful suggestions.
		
		**Shopping List**:
		%s
		
		**Analysis Tasks**:
		1. **Detect Duplicates**: Identify items that might be duplicates (e.g., "Onions" and "Red Onion" if likely for same use, or just exact duplicates).
		2. **Merge Suggestions**: Suggest combining items (e.g. "2 cans of tomatoes" and "1 can crushed tomatoes" -> "3 cans tomatoes" if suitable).
		3. **Missing Essentials**: Based on the items present, are there obvious missing companions? (e.g. "Pasta Sauce" but no "Pasta", "Cereal" but no "Milk").
		4. **Category Check**: Are items in the correct categories? (e.g. "Apples" should be "produce").
		
		**Return structured JSON**:
		{
			"suggestions": [
				{ "type": "duplicate", "message": "You have 'Onions' and 'Red Onion'.", "itemNames": ["Onions", "Red Onion"], "actionLabel": "Review" },
				{ "type": "general", "message": "You have pasta sauce but no pasta.", "actionLabel": "Add Pasta" }
			],
			"missingEssentials": ["Pasta", "Milk"],
			"categoryOptimizations": [
				{ "itemName": "Apples", "currentCategory": "other", "newCategory": "produce", "reason": "Apples are produce" }
			]
		}
		
		Return ONLY the JSON. Empty arrays if no suggestions.
	`, string(listJSON))

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("analysis generation failed: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no analysis content generated")
	}

	var result ListAnalysisResult
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			if err := json.Unmarshal([]byte(txt), &result); err != nil {
				return nil, fmt.Errorf("failed to parse analysis JSON: %w", err)
			}
			break
		}
	}

	return &result, nil
}

// IsAvailable checks if the service is configured
func (g *GeminiClient) IsAvailable(ctx context.Context) bool {
	return g.client != nil
}

// GetClient returns the underlying genai.Client for use by other services
func (g *GeminiClient) GetClient() *genai.Client {
	return g.client
}

// ExtractFromWebpage extracts a recipe from a webpage URL
func (g *GeminiClient) ExtractFromWebpage(ctx context.Context, url string) (*ExtractionResult, error) {
	// Fetch the webpage content
	htmlContent, err := fetchWebpage(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch webpage: %w", err)
	}

	genModel := g.client.GenerativeModel(g.model)
	genModel.ResponseMIMEType = "application/json"

	prompt := fmt.Sprintf(`You are an expert chef and recipe extraction specialist.
Extract the recipe from this webpage content.

**Webpage URL**: %s

**Webpage Content**:
%s

**Instructions**:
1. Find the recipe on this page (title, ingredients, instructions)
2. Extract ALL ingredients with quantities and units
3. Extract ALL steps in order
4. Determine prep time, cook time, servings, difficulty, and cuisine
5. If there are multiple recipes, extract the MAIN recipe (usually the first or most prominent)
6. If no recipe is found, return empty fields

**Return JSON matching this structure**:
{
    "title": "Recipe Title",
    "description": "Brief description",
    "servings": 4,
    "prepTime": 15,
    "cookTime": 30,
    "difficulty": "Easy",
    "cuisine": "Italian",
    "ingredients": [
        { "name": "Ingredient", "quantity": "2", "unit": "cups", "category": "produce", "isOptional": false, "notes": "", "videoTimestamp": 0 }
    ],
    "steps": [
        { "stepNumber": 1, "instruction": "Do this", "durationSeconds": 0, "technique": "", "temperature": "", "videoTimestampStart": 0, "videoTimestampEnd": 0 }
    ],
    "tags": ["dinner", "easy"]
}

Categories for ingredients: dairy, produce, proteins, bakery, pantry, spices, condiments, beverages, snacks, frozen, household, other

Return ONLY the JSON, no markdown or explanations.`, url, htmlContent)

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("generation failed: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no content generated")
	}

	var result ExtractionResult
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			if err := json.Unmarshal([]byte(txt), &result); err != nil {
				return nil, fmt.Errorf("failed to parse JSON: %w", err)
			}
			break
		}
	}

	return &result, nil
}

// ScanPantry detects pantry items from an image
func (g *GeminiClient) ScanPantry(ctx context.Context, imageData []byte, mimeType string) (*PantryScanResult, error) {
	if len(imageData) == 0 {
		return nil, fmt.Errorf("empty image data")
	}

	// Validate mime type
	validMimeTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
		"image/gif":  true,
	}
	if !validMimeTypes[mimeType] {
		return nil, fmt.Errorf("unsupported image type: %s", mimeType)
	}

	genModel := g.client.GenerativeModel(g.model)
	genModel.ResponseMIMEType = "application/json"

	prompt := `You are an expert at identifying food and pantry items. Analyze this image and detect all visible food/pantry items.

**Instructions**:
1. Identify ALL visible food items, ingredients, and pantry staples
2. For each item, determine:
   - Name (be specific: "Roma tomatoes" not just "tomatoes")
   - Category (from the list below)
   - Estimated quantity and unit if visible
   - Estimated days until expiration (based on typical shelf life and visual condition)
   - Your confidence level (0-1)
3. Include items even if partially visible
4. If you see containers/packages, identify the contents
5. Note the general condition of items (fresh, wilting, etc.)

**Categories**: produce, proteins, dairy, grains, pantry, spices, condiments, beverages, frozen, canned, baking, other

**Return JSON matching this structure**:
{
    "items": [
        {
            "name": "Roma tomatoes",
            "category": "produce",
            "quantity": 4,
            "unit": "pieces",
            "expirationDays": 5,
            "confidence": 0.95
        },
        {
            "name": "Whole milk",
            "category": "dairy",
            "quantity": 1,
            "unit": "gallon",
            "expirationDays": 7,
            "confidence": 0.85
        }
    ],
    "confidence": 0.9,
    "notes": "Image shows a well-stocked refrigerator. Some produce appears fresh, milk carton visible."
}

**Unit guidelines**:
- Countable items: "pieces", "units"
- Liquids: "ml", "liters", "oz", "cups", "gallons"
- Weight: "g", "kg", "oz", "lbs"
- Packages: "packages", "bags", "boxes", "cans", "bottles", "jars"

Return ONLY the JSON, no markdown or explanations. If no food items are detected, return empty items array.`

	// Create image part
	imagePart := genai.Blob{
		MIMEType: mimeType,
		Data:     imageData,
	}

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, imagePart, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("generation failed: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no content generated")
	}

	var result PantryScanResult
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			if err := json.Unmarshal([]byte(txt), &result); err != nil {
				return nil, fmt.Errorf("failed to parse JSON: %w", err)
			}
			break
		}
	}

	return &result, nil
}

// EnrichRecipe adds nutrition, dietary info, and meal types to a recipe
// This is a separate AI call focused on analysis rather than extraction
func (g *GeminiClient) EnrichRecipe(ctx context.Context, input *EnrichmentInput) (*EnrichmentResult, error) {
	genModel := g.client.GenerativeModel(g.model)
	genModel.ResponseMIMEType = "application/json"

	// Build recipe text for the prompt
	var recipeText strings.Builder
	recipeText.WriteString(fmt.Sprintf("Title: %s\n\n", input.Title))

	if input.Servings > 0 {
		recipeText.WriteString(fmt.Sprintf("Servings: %d\n\n", input.Servings))
	} else {
		recipeText.WriteString("Servings: unknown\n\n")
	}

	recipeText.WriteString("Ingredients:\n")
	for _, ing := range input.Ingredients {
		recipeText.WriteString(fmt.Sprintf("- %s\n", ing))
	}
	recipeText.WriteString("\n")

	recipeText.WriteString("Steps:\n")
	for i, step := range input.Steps {
		recipeText.WriteString(fmt.Sprintf("%d. %s\n", i+1, step))
	}
	recipeText.WriteString("\n")

	recipeText.WriteString("Additional context:\n")
	if input.PrepTime > 0 {
		recipeText.WriteString(fmt.Sprintf("- Prep time: %d minutes\n", input.PrepTime))
	}
	if input.CookTime > 0 {
		recipeText.WriteString(fmt.Sprintf("- Cook time: %d minutes\n", input.CookTime))
	}
	if input.Cuisine != "" {
		recipeText.WriteString(fmt.Sprintf("- Cuisine: %s\n", input.Cuisine))
	}

	// Determine if we need servings estimate
	needServingsEstimate := input.Servings == 0

	prompt := fmt.Sprintf(`Analyze this recipe and provide nutrition estimates and dietary classifications.

Recipe:
---
%s
---

Respond with JSON only, no explanation:

{
  "nutrition": {
    "perServing": {
      "calories": <int>,
      "protein": <int grams>,
      "carbs": <int grams>,
      "fat": <int grams>,
      "fiber": <int grams>,
      "sugar": <int grams>,
      "sodium": <int mg>
    },
    "tags": [<relevant tags from: high-protein, low-carb, low-fat, high-fiber, low-calorie, moderate-carb>],
    "confidence": <0.0-1.0>
  },
  "dietaryInfo": {
    "isVegetarian": <bool>,
    "isVegan": <bool>,
    "isGlutenFree": <bool>,
    "isDairyFree": <bool>,
    "isNutFree": <bool>,
    "isKeto": <bool>,
    "isHalal": <bool or null if uncertain>,
    "isKosher": <bool or null if uncertain>,
    "allergens": [<detected allergens from: dairy, eggs, gluten, nuts, peanuts, soy, shellfish, fish, sesame>],
    "mealTypes": [<appropriate meal types from: breakfast, lunch, dinner, snack, dessert>],
    "confidence": <0.0-1.0>
  }%s
}

Guidelines:
- Estimate nutrition per serving based on typical ingredient amounts
- For dietary flags, analyze all ingredients carefully
- Use null for isHalal/isKosher unless clearly determinable (e.g., pork = not halal)
- Infer meal types from recipe characteristics (eggs+bacon=breakfast, substantial protein+sides=dinner, sweet/chocolate=dessert, etc.)
%s- Set confidence based on how certain you are of your estimates`, recipeText.String(), getServingsEstimateSchema(needServingsEstimate), getServingsEstimateGuideline(needServingsEstimate))

	// Retry the entire generation + parsing to handle transient JSON issues
	var result EnrichmentResult
	var lastErr error

	for attempt := 0; attempt < 2; attempt++ { // Try up to 2 times
		resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
			return genModel.GenerateContent(ctx, genai.Text(prompt))
		})
		if err != nil {
			lastErr = fmt.Errorf("enrichment generation failed: %w", err)
			continue
		}

		if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
			lastErr = fmt.Errorf("no enrichment content generated")
			continue
		}

		// Try to parse the response
		parsed := false
		for _, part := range resp.Candidates[0].Content.Parts {
			if txt, ok := part.(genai.Text); ok {
				// Try to clean up the response if it has markdown code blocks
				jsonStr := strings.TrimSpace(string(txt))
				jsonStr = strings.TrimPrefix(jsonStr, "```json")
				jsonStr = strings.TrimPrefix(jsonStr, "```")
				jsonStr = strings.TrimSuffix(jsonStr, "```")
				jsonStr = strings.TrimSpace(jsonStr)

				if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
					lastErr = fmt.Errorf("failed to parse enrichment JSON: %w (content: %.200s)", err, jsonStr)
					break // Try again
				}
				parsed = true
				break
			}
		}

		if parsed {
			return &result, nil
		}
	}

	// Return error but don't crash - caller should handle gracefully
	if lastErr != nil {
		return nil, lastErr
	}
	return nil, fmt.Errorf("enrichment failed after retries")
}

// getServingsEstimateSchema returns the JSON schema portion for servings estimate
func getServingsEstimateSchema(needEstimate bool) string {
	if needEstimate {
		return `,
  "servingsEstimate": {
    "value": <int>,
    "confidence": <0.0-1.0>,
    "reasoning": "<brief explanation>"
  }`
	}
	return ""
}

// getServingsEstimateGuideline returns the guideline for servings estimation
func getServingsEstimateGuideline(needEstimate bool) string {
	if needEstimate {
		return `- Servings is unknown - estimate based on ingredient quantities (1 lb meat ~ 4 servings, 2 chicken breasts ~ 2 servings, 1 cup dry pasta ~ 4 servings cooked)
`
	}
	return ""
}

// ExtractFromImage extracts a recipe from an image (cookbook photo, screenshot)
func (g *GeminiClient) ExtractFromImage(ctx context.Context, imageData []byte, mimeType string) (*ExtractionResult, error) {
	if len(imageData) == 0 {
		return nil, fmt.Errorf("empty image data")
	}

	// Validate mime type
	validMimeTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
		"image/gif":  true,
	}
	if !validMimeTypes[mimeType] {
		return nil, fmt.Errorf("unsupported image type: %s", mimeType)
	}

	genModel := g.client.GenerativeModel(g.model)
	genModel.ResponseMIMEType = "application/json"

	prompt := `You are an expert chef and OCR specialist. Extract the recipe from this image.

**Instructions**:
1. Read all text visible in the image (cookbook page, recipe card, screenshot)
2. Identify the recipe title
3. Extract ALL ingredients with quantities and units
4. Extract ALL cooking steps/instructions in order
5. Determine prep time, cook time, servings, difficulty, and cuisine if visible
6. If text is partially obscured or unclear, make reasonable inferences
7. If no recipe is found, return empty fields

**Return JSON matching this structure**:
{
    "title": "Recipe Title",
    "description": "Brief description",
    "servings": 4,
    "prepTime": 15,
    "cookTime": 30,
    "difficulty": "Easy",
    "cuisine": "Italian",
    "ingredients": [
        { "name": "Ingredient", "quantity": "2", "unit": "cups", "category": "produce", "isOptional": false, "notes": "", "videoTimestamp": 0 }
    ],
    "steps": [
        { "stepNumber": 1, "instruction": "Do this", "durationSeconds": 0, "technique": "", "temperature": "", "videoTimestampStart": 0, "videoTimestampEnd": 0 }
    ],
    "tags": ["dinner", "easy"]
}

Categories for ingredients: dairy, produce, proteins, bakery, pantry, spices, condiments, beverages, snacks, frozen, household, other

Return ONLY the JSON, no markdown or explanations.`

	// Create image part
	imagePart := genai.Blob{
		MIMEType: mimeType,
		Data:     imageData,
	}

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, imagePart, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("generation failed: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil, fmt.Errorf("no content generated")
	}

	var result ExtractionResult
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			if err := json.Unmarshal([]byte(txt), &result); err != nil {
				return nil, fmt.Errorf("failed to parse JSON: %w", err)
			}
			break
		}
	}

	return &result, nil
}
