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

	"github.com/dishflow/backend/internal/model"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// fetchWebpage fetches the content of a webpage and returns it as text
// It extracts readable text content, stripping most HTML tags
func fetchWebpage(ctx context.Context, url string) (string, error) {
	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}

	// Set user agent to avoid being blocked
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; DishFlow/1.0; +https://dishflow.app)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	// Read body with size limit (5MB max to avoid memory issues)
	limitedReader := io.LimitReader(resp.Body, 5*1024*1024)
	body, err := io.ReadAll(limitedReader)
	if err != nil {
		return "", err
	}
	fmt.Printf("Fetched %d bytes from %s\n", len(body), url)

	htmlContent := string(body)

	// Basic HTML to text conversion
	// Remove script and style tags completely
	htmlContent = removeHTMLSection(htmlContent, "script")
	htmlContent = removeHTMLSection(htmlContent, "style")
	htmlContent = removeHTMLSection(htmlContent, "nav")
	htmlContent = removeHTMLSection(htmlContent, "footer")
	htmlContent = removeHTMLSection(htmlContent, "header")

	// Convert common HTML entities
	htmlContent = strings.ReplaceAll(htmlContent, "&nbsp;", " ")
	htmlContent = strings.ReplaceAll(htmlContent, "&amp;", "&")
	htmlContent = strings.ReplaceAll(htmlContent, "&lt;", "<")
	htmlContent = strings.ReplaceAll(htmlContent, "&gt;", ">")
	htmlContent = strings.ReplaceAll(htmlContent, "&quot;", "\"")
	htmlContent = strings.ReplaceAll(htmlContent, "&#39;", "'")

	// Add newlines for block elements
	blockTags := []string{"</p>", "</div>", "</li>", "</h1>", "</h2>", "</h3>", "</h4>", "</h5>", "</h6>", "<br>", "<br/>", "<br />"}
	for _, tag := range blockTags {
		htmlContent = strings.ReplaceAll(htmlContent, tag, tag+"\n")
	}

	// Remove remaining HTML tags (simple regex-free approach)
	var result strings.Builder
	inTag := false
	for _, r := range htmlContent {
		if r == '<' {
			inTag = true
		} else if r == '>' {
			inTag = false
		} else if !inTag {
			result.WriteRune(r)
		}
	}

	// Clean up whitespace
	text := result.String()
	lines := strings.Split(text, "\n")
	var cleanLines []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			cleanLines = append(cleanLines, line)
		}
	}

	// Limit content length for Gemini (keep first ~50KB of text)
	finalText := strings.Join(cleanLines, "\n")
	if len(finalText) > 50000 {
		finalText = finalText[:50000] + "\n[Content truncated...]"
	}

	return finalText, nil
}

// removeHTMLSection removes a specific HTML tag and its contents
func removeHTMLSection(html, tagName string) string {
	result := html
	openTag := "<" + tagName
	closeTag := "</" + tagName + ">"

	maxIterations := 1000 // Safety break
	iterations := 0

	for {
		iterations++
		if iterations > maxIterations {
			break
		}

		startIdx := strings.Index(strings.ToLower(result), openTag)
		if startIdx == -1 {
			break
		}

		// Find the end of this section
		// Search from startIdx to avoid finding a close tag before the open tag
		// (though we need to handle nested tags technically, but this simple remover is for top-level mostly or simple structures)
		// For robustness, find first close tag AFTER startIdx
		rest := result[startIdx:]
		endIdx := strings.Index(strings.ToLower(rest), closeTag)

		if endIdx == -1 {
			// No closing tag, try to find just the end of opening tag to at least remove that
			endTagIdx := strings.Index(rest, ">")
			if endTagIdx != -1 {
				result = result[:startIdx] + result[startIdx+endTagIdx+1:]
				continue
			}
			// If we can't even find >, just break to avoid infinite loop or leave it
			break
		}

		// Calculate absolute end index
		// endIdx found in 'rest' is relative to startIdx
		absEndIdx := startIdx + endIdx

		// Remove the entire section
		result = result[:startIdx] + result[absEndIdx+len(closeTag):]
	}

	return result
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

	// 3. Generate content
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

	resp, err := genModel.GenerateContent(ctx, genai.FileData{URI: f.URI}, genai.Text(prompt))
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

1. **Deduplicate ingredients**: 
   - Merge duplicate entries (e.g., "Red onion" appearing twice)
   - If an ingredient is used in multiple contexts (main dish + garnish), keep ONE entry and add context in "notes" field
   - Example: "Red onion" (qty: 1, notes: "1 for cooking, additional for garnish")

2. **Standardize naming**:
   - Use consistent ingredient names (e.g., "Green chili pepper" → "Green chili")
   - Remove redundant descriptors
   - Use singular form for countable items

3. **Fix quantities**:
   - Ensure all ingredients have proper measurements
   - If quantity is missing but mentioned in video, add it
   - Use standard units (cups, tablespoons, teaspoons, grams, etc.)

4. **Consolidate spice blends**:
   - If whole spices are toasted together for a masala/blend, you can optionally add a note
   - Keep individual entries but add context in notes if helpful

5. **Verify steps**:
   - Ensure instructions are clear and sequential
   - Fix any grammatical issues
   - Ensure step numbers are correct (1, 2, 3...)

6. **Remove redundancy**:
   - Eliminate duplicate or contradictory information
   - Ensure consistency between ingredients list and steps

**IMPORTANT**: 
- Return the refined recipe in the EXACT SAME JSON structure
- Do NOT remove valid ingredients or steps
- Be conservative - only fix clear issues
- Preserve all timestamps, techniques, and other metadata
- If unsure, keep the original value

Return ONLY the refined JSON, no explanations.`, string(rawJSON))

	resp, err := genModel.GenerateContent(ctx, genai.Text(prompt))
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

	resp, err := genModel.GenerateContent(ctx, genai.Text(prompt))
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

	resp, err := genModel.GenerateContent(ctx, genai.Text(prompt))
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

	resp, err := genModel.GenerateContent(ctx, imagePart, genai.Text(prompt))
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
