package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math/rand/v2"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"

	"github.com/dishflow/backend/internal/model"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// --- Package-level compiled regexes (avoid recompilation per request) ---
var (
	reLangValidation   = regexp.MustCompile(`^[a-zA-Z \-()]+$`)
	reDetailValidation = regexp.MustCompile(`^[a-zA-Z]+$`)
	reThumbURL         = regexp.MustCompile(`"thumbnailUrl"\s*:\s*"([^"]+)"`)
	reImageStr         = regexp.MustCompile(`"image"\s*:\s*"([^"]+)"`)
	reImageObj         = regexp.MustCompile(`"image"\s*:\s*\{\s*"@type"\s*:\s*"ImageObject"[^}]*"url"\s*:\s*"([^"]+)"`)
	reJSONBlock        = regexp.MustCompile("(?s)```(?:json)?\\s*(.*?)```")
)

// isPrivateIP checks if an IP address is private/internal (SSRF protection)
func isPrivateIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() || ip.IsUnspecified()
}

// safeWebClient is an HTTP client that blocks connections to private/internal IPs.
// This prevents SSRF attacks where user-supplied URLs resolve to internal services.
var safeWebClient = &http.Client{
	Timeout: 45 * time.Second,
	Transport: &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, fmt.Errorf("invalid address: %w", err)
			}
			ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
			if err != nil {
				return nil, err
			}
			for _, ip := range ips {
				if isPrivateIP(ip.IP) {
					return nil, fmt.Errorf("blocked: request to private/internal IP %s", ip.IP)
				}
			}
			dialer := &net.Dialer{Timeout: 10 * time.Second}
			return dialer.DialContext(ctx, network, net.JoinHostPort(host, port))
		},
	},
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 10 {
			return fmt.Errorf("too many redirects")
		}
		return nil
	},
}

// validateGeminiResponse checks the response for safety blocks, truncation, and empty content.
// This prevents silent failures where partial/blocked responses are parsed as valid recipes.
func validateGeminiResponse(resp *genai.GenerateContentResponse) error {
	if resp == nil || len(resp.Candidates) == 0 {
		return fmt.Errorf("empty response from Gemini")
	}
	candidate := resp.Candidates[0]
	switch candidate.FinishReason {
	case genai.FinishReasonSafety:
		return fmt.Errorf("content blocked by Gemini safety filters")
	case genai.FinishReasonRecitation:
		return fmt.Errorf("content blocked: recitation policy violation")
	case genai.FinishReasonMaxTokens:
		return fmt.Errorf("response truncated: output exceeded max tokens (recipe may be incomplete)")
	case genai.FinishReasonOther:
		return fmt.Errorf("Gemini returned an unexpected finish reason")
	}
	if candidate.Content == nil {
		return fmt.Errorf("no content in Gemini response (finish reason: %v)", candidate.FinishReason)
	}
	return nil
}

// parseGeminiJSON validates the response, extracts text, and unmarshals into the target type.
// This replaces the repeated pattern of checking candidates + parsing JSON across all methods.
func parseGeminiJSON[T any](resp *genai.GenerateContentResponse) (*T, error) {
	if err := validateGeminiResponse(resp); err != nil {
		return nil, err
	}
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			clean := cleanJSON(string(txt))
			var result T
			if err := json.Unmarshal([]byte(clean), &result); err != nil {
				return nil, fmt.Errorf("failed to parse response JSON: %w (raw: %.500s)", err, clean)
			}
			return &result, nil
		}
	}
	return nil, fmt.Errorf("no text content in Gemini response")
}

// sanitizePromptString removes newlines and control characters from user input
// before interpolating into LLM prompts to prevent prompt injection.
func sanitizePromptString(s string) string {
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", " ")
	var b strings.Builder
	for _, r := range s {
		if r >= 32 || r == '\t' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// fetchWebpage fetches the content of a webpage and returns it as text along with a main image URL.
// Uses safeWebClient to prevent SSRF attacks against internal IPs.
func fetchWebpage(ctx context.Context, url string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", "", err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := safeWebClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("fetch failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	// Verify Content-Type is HTML before parsing (prevents wasting memory on PDFs/binaries)
	ct := resp.Header.Get("Content-Type")
	if ct != "" && !strings.Contains(ct, "text/html") && !strings.Contains(ct, "application/xhtml") {
		return "", "", fmt.Errorf("unsupported content type: %s (expected HTML)", ct)
	}

	// Read body with size limit (5MB max to avoid memory issues)
	limitedReader := io.LimitReader(resp.Body, 5*1024*1024)

	doc, err := goquery.NewDocumentFromReader(limitedReader)
	if err != nil {
		return "", "", fmt.Errorf("failed to parse HTML: %w", err)
	}

	content, imageURL := parseWebpageContent(doc)
	return content, imageURL, nil
}

// parseWebpageContent extracts the main content and image URL from a parsed document
func parseWebpageContent(doc *goquery.Document) (string, string) {
	// --- Extract Metadata (Images) BEFORE removing elements ---
	var imageURL string

	// 1. Open Graph Image (Standard)
	if val, exists := doc.Find("meta[property='og:image']").Attr("content"); exists {
		imageURL = val
	}

	// 2. Twitter Image (Fallback)
	if imageURL == "" {
		if val, exists := doc.Find("meta[name='twitter:image']").Attr("content"); exists {
			imageURL = val
		}
	}

	// 3. JSON-LD Image (Structured Data)
	// We scan JSON-LD blocks for "image" or "thumbnailUrl"
	if imageURL == "" {
		doc.Find("script[type='application/ld+json']").EachWithBreak(func(i int, s *goquery.Selection) bool {
			jsonText := s.Text()
			// Simple heuristic check first
			if strings.Contains(jsonText, "Recipe") || strings.Contains(jsonText, "recipe") {
				// We don't want to fully unmarshal everything if not needed, but for image extraction it's safer
				// Let's try to extract image field via regex for robustness vs unmarshalling large unknown structs
				// Regex to find "image": "url" or "image": ["url"] or "thumbnailUrl": "url"

				if match := reThumbURL.FindStringSubmatch(jsonText); len(match) > 1 {
					imageURL = match[1]
					return false
				}

				if match := reImageStr.FindStringSubmatch(jsonText); len(match) > 1 {
					imageURL = match[1]
					return false
				}

				if match := reImageObj.FindStringSubmatch(jsonText); len(match) > 1 {
					imageURL = match[1]
					return false
				}
			}
			return true // Continue
		})
	}

	// Remove non-content elements
	doc.Find("script, style, nav, footer, header, aside, .sidebar, .advertisement, .ads, .comments, .social-share, noscript, iframe").Remove()

	// Try to find recipe-specific content first (common recipe schema selectors)
	var contentBuilder strings.Builder

	// Look for JSON-LD recipe schema (most reliable source for TEXT as well)
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

	return finalText, imageURL
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

// cleanJSON removes markdown code blocks and whitespace from JSON strings.
// Handles nested backticks and double-wrapped code blocks.
func cleanJSON(text string) string {
	text = strings.TrimSpace(text)

	// First try regex extraction for ```json ... ``` blocks (handles nesting)
	if matches := reJSONBlock.FindStringSubmatch(text); len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}

	// Fallback: strip leading/trailing backtick fences
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	return strings.TrimSpace(text)
}

// retryConfig holds retry parameters
type retryConfig struct {
	maxAttempts int
	baseDelay   time.Duration
	maxDelay    time.Duration
}

// defaultRetryConfig is used for Gemini API calls
var defaultRetryConfig = retryConfig{
	maxAttempts: 5,
	baseDelay:   1 * time.Second,
	maxDelay:    30 * time.Second,
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

// withRetry executes a function with exponential backoff retry using full jitter.
// Full jitter (AWS best practice): delay = rand(0, min(maxDelay, baseDelay * 2^attempt))
// This decorrelates retries across concurrent goroutines, preventing thundering herd.
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
			isRateLimit := strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "RESOURCE_EXHAUSTED")

			// Calculate ceiling: baseDelay * 2^attempt (or 2*baseDelay for rate limits)
			base := cfg.baseDelay
			if isRateLimit {
				base = 2 * time.Second
			}
			ceiling := base * time.Duration(1<<uint(attempt))
			if ceiling > cfg.maxDelay {
				ceiling = cfg.maxDelay
			}

			// Full jitter: uniform random in [0, ceiling)
			delay := time.Duration(rand.Int64N(int64(ceiling)))

			// Rate-limit floor: never retry faster than 1s on 429/RESOURCE_EXHAUSTED
			if isRateLimit && delay < 1*time.Second {
				delay = 1 * time.Second
			}

			slog.Warn("Gemini API retry",
				"attempt", attempt+1,
				"max_attempts", cfg.maxAttempts,
				"delay", delay,
				"is_rate_limit", isRateLimit,
				"error", err.Error(),
			)

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

	// Use the pro model for advanced analysis
	// verified: gemini-2.5-pro (best for reasoning/cost)
	return &GeminiClient{
		client: client,
		model:  "gemini-2.5-pro",
	}, nil
}

// ExtractRecipe extracts a recipe from a video file or a remote video URL.
// If req.VideoURL starts with https://, it is passed directly to Gemini as a
// native URL reference (used for YouTube). Otherwise, the local file is uploaded
// to the Gemini Files API as before (used for yt-dlp downloaded videos).
func (g *GeminiClient) ExtractRecipe(ctx context.Context, req ExtractionRequest, onProgress ProgressCallback) (*ExtractionResult, error) {
	// Validate inputs to prevent prompt injection
	if req.Language != "" {
		if !reLangValidation.MatchString(req.Language) || len(req.Language) > 50 {
			return nil, fmt.Errorf("invalid language format")
		}
	} else {
		req.Language = "English"
	}

	if req.DetailLevel != "" {
		if !reDetailValidation.MatchString(req.DetailLevel) || len(req.DetailLevel) > 20 {
			return nil, fmt.Errorf("invalid detail level format")
		}
	}

	// Determine video source: remote URL (YouTube) vs local file (yt-dlp download)
	isRemoteURL := strings.HasPrefix(req.VideoURL, "https://") || strings.HasPrefix(req.VideoURL, "http://")

	var videoPart genai.Part
	if isRemoteURL {
		// Native URL — Gemini fetches the video directly (e.g. YouTube)
		onProgress(model.JobStatusExtracting, 30, "Sending video URL to Gemini...")
		videoPart = genai.FileData{
			MIMEType: "video/*",
			URI:      req.VideoURL,
		}
	} else {
		// Local file — upload to Gemini Files API
		onProgress(model.JobStatusDownloading, 20, "Uploading video to Gemini...")

		f, err := g.uploadFile(ctx, req.VideoURL)
		if err != nil {
			return nil, fmt.Errorf("upload failed: %w", err)
		}
		defer g.client.DeleteFile(ctx, f.Name)

		// Wait for processing with timeout (max 10 minutes to prevent infinite loop)
		onProgress(model.JobStatusProcessing, 40, "Waiting for Gemini processing...")
		pollDeadline := time.Now().Add(10 * time.Minute)
		for {
			if time.Now().After(pollDeadline) {
				return nil, fmt.Errorf("video processing timed out after 10 minutes")
			}

			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			default:
			}

			file, err := g.client.GetFile(ctx, f.Name)
			if err != nil {
				return nil, fmt.Errorf("get file status failed: %w", err)
			}
			if file.State == genai.FileStateActive {
				break
			}
			if file.State == genai.FileStateFailed {
				return nil, fmt.Errorf("Gemini video processing failed")
			}

			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(2 * time.Second):
			}
		}

		videoPart = genai.FileData{URI: f.URI}
	}

	// Generate content with retry
	onProgress(model.JobStatusExtracting, 60, "Analyzing video content...")

	genModel := g.client.GenerativeModel(g.model)
	genModel.ResponseMIMEType = "application/json"

	prompt := fmt.Sprintf(`
		You are an expert chef and food analyst. Analyze this video and extract the recipe details.

		Target Language: %s
		Detail Level: %s (if 'detailed', provide very precise steps and timestamps).

		<video_context>
		%s
		</video_context>

		Use the context above to accurately identify ingredients and steps that might be spoken quickly or listed in the caption.

		**GROUPING INSTRUCTION**:
		If the recipe has distinct parts (e.g. "For the Dough", "For the Sauce", "Toppings", "Assembly"), use the "section" field in the ingredients list to group them.
		If there are no distinct sections, use "Main" as the section name.

		**CRITICAL INSTRUCTION**:
		Analyze the content provided in <video_context>. If this is clearly **NOT a cooking recipe or food preparation video** (e.g. a dance video, news article, vlog without food, gaming, etc.),
		return a JSON with: {"non_recipe": true, "reason": "Content appears to be [description of content]"}.
		DO NOT try to invent a recipe if one does not exist.

		If it IS a recipe, return a JSON object matching this structure:
		{
			"title": "Recipe Title",
			"description": "Brief description",
			"servings": 4,
			"prepTime": 15, // minutes
			"cookTime": 30, // minutes
			"difficulty": "Easy", // Easy, Medium, Hard
			"cuisine": "Italian",
			"ingredients": [
				{ "name": "Ingredient 1", "quantity": "2", "unit": "cups", "category": "produce", "section": "Dough", "isOptional": false, "notes": "", "videoTimestamp": 0 }
			],
			"steps": [
				{ "stepNumber": 1, "instruction": "Do this", "durationSeconds": 60, "technique": "Chopping", "temperature": "", "videoTimestampStart": 0, "videoTimestampEnd": 60 }
			],
			"tags": ["pasta", "dinner"]
		}
	`,
		req.Language, req.DetailLevel, req.Metadata)

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, videoPart, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("generation failed: %w", err)
	}

	// Parse response (validates FinishReason for safety/truncation)
	onProgress(model.JobStatusExtracting, 90, "Finalizing recipe...")

	result, err := parseGeminiJSON[ExtractionResult](resp)
	if err != nil {
		return nil, fmt.Errorf("extract recipe: %w", err)
	}

	if result.NonRecipe {
		return nil, fmt.Errorf("%w: %s", model.ErrIrrelevantContent, result.Reason)
	}

	return result, nil
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

4. **Verify and Enhance steps**:
   - Ensure instructions are clear and sequential
   - **CRITICAL**: If steps are extremely brief (common in TikTok recipes), EXPAND them with necessary details:
     - Add visual cues (e.g., "until golden brown", "until stiff peaks form")
     - specific techniques (e.g., "fold gently", "whisk vigorously")
     - implicit intermediate steps (e.g., "preheat oven", "grease pan" if missing)
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

	refinedPtr, err := parseGeminiJSON[ExtractionResult](resp)
	if err != nil {
		return nil, fmt.Errorf("refine recipe: %w", err)
	}
	refined := *refinedPtr

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

// SmartMergeItems takes a list of raw items and returns a consolidated, categorized list
func (g *GeminiClient) SmartMergeItems(ctx context.Context, currentItems []model.ShoppingItem, preferredUnitSystem string) ([]model.ShoppingItemInput, error) {
	genModel := g.client.GenerativeModel(g.model)
	genModel.ResponseMIMEType = "application/json"

	// Prepare list data for prompt - simplify to just names/quantities/units
	type simpleItem struct {
		Name     string   `json:"name"`
		Quantity *float64 `json:"quantity,omitempty"`
		Unit     *string  `json:"unit,omitempty"`
		Category *string  `json:"category,omitempty"`
	}

	var itemsToMerge []simpleItem
	for _, item := range currentItems {
		var qty *float64
		if item.Quantity != nil {
			q := *item.Quantity
			qty = &q
		}
		var unit *string
		if item.Unit != nil {
			u := *item.Unit
			unit = &u
		}
		var cat *string
		if item.Category != nil {
			c := *item.Category
			cat = &c
		}
		itemsToMerge = append(itemsToMerge, simpleItem{
			Name:     item.Name,
			Quantity: qty,
			Unit:     unit,
			Category: cat,
		})
	}

	listJSON, err := json.Marshal(itemsToMerge)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal list: %w", err)
	}

	// Get all valid categories for the prompt
	categories := model.GetAllCategories()
	categoriesJSON, _ := json.Marshal(categories)

	// Determine unit instructions based on preference
	unitInstruction := `2. **Normalize Units**: Combine quantities of same items (e.g., "100g Cheese" + "4oz Cheese" -> "220g Cheese"). Use the most common standard unit.`
	switch preferredUnitSystem {
	case "metric":
		unitInstruction = `2. **Normalize Units**: Combine quantities and **STRICTLY CONVERT TO METRIC** (grams, kg, ml, liters, celsius). Convert ounces/lbs to grams/kg. Example: "4oz" -> "113g".`
	case "imperial":
		unitInstruction = `2. **Normalize Units**: Combine quantities and **STRICTLY CONVERT TO IMPERIAL** (ounces, lbs, cups, tsp, tbsp, fahrenheit). Convert grams/kg to oz/lbs. Example: "100g" -> "3.5oz".`
	}

	prompt := fmt.Sprintf(`
		You are an expert home economist and chef. Your task is to take a raw shopping list and "Smart Merge" it into a clean, organized perfection.

		<input_list>
		%s
		</input_list>

		<valid_categories>
		%s
		</valid_categories>

		**Instructions**:
		1. **Merge Duplicates**: Combine items that are effectively the same (e.g., "Onions" + "1 Red Onion" -> "2 Onions" unless specific distinction matters for a recipe).
		%s
		3. **Categorize**: Assign the correct category from the <valid_categories> list provided.
		4. **Standardize Names**: Use clean, capitalized names (e.g., "milk" -> "Milk").

		**Return ONLY structured JSON**:
		[
			{ "name": "Milk", "quantity": 1, "unit": "gallon", "category": "dairy" },
			{ "name": "Onions", "quantity": 3, "unit": "pieces", "category": "produce" }
		]
	`, string(listJSON), string(categoriesJSON), unitInstruction)

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("smart merge generation failed: %w", err)
	}

	result, err := parseGeminiJSON[[]model.ShoppingItemInput](resp)
	if err != nil {
		return nil, fmt.Errorf("smart merge: %w", err)
	}

	return *result, nil
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
func (g *GeminiClient) ExtractFromWebpage(ctx context.Context, url string, onProgress ProgressCallback) (*ExtractionResult, error) {
	// Report initial status
	if onProgress != nil {
		onProgress(model.JobStatusProcessing, 10, "Fetching webpage...")
	}

	// Fetch the webpage content and generic image URL
	htmlContent, imageURL, err := fetchWebpage(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch webpage: %w", err)
	}

	// Extract title from content for better feedback
	var title string
	if strings.HasPrefix(htmlContent, "Title: ") {
		if idx := strings.Index(htmlContent, "\n"); idx != -1 {
			title = strings.TrimPrefix(htmlContent[:idx], "Title: ")
		}
	}

	if onProgress != nil {
		if title != "" {
			onProgress(model.JobStatusExtracting, 30, fmt.Sprintf("Analyzing webpage: %s...", title))
		} else {
			onProgress(model.JobStatusExtracting, 30, "Analyzing webpage content...")
		}
	}

	genModel := g.client.GenerativeModel(g.model)
	genModel.ResponseMIMEType = "application/json"

	prompt := fmt.Sprintf(`You are an expert chef and recipe extraction specialist.
Extract the recipe from this webpage content.

**Webpage URL**: %s

<webpage_content>
%s
</webpage_content>

**Instructions**:
1. Analyze the content in <webpage_content>. If this is clearly **NOT a cooking recipe** (e.g. a news article, blog post without recipe, product page, etc.),
   return a JSON with: {"non_recipe": true, "reason": "Content appears to be [description]"}.
   DO NOT invent a recipe.

2. If it IS a recipe:
   - Extract ALL ingredients with quantities and units
   - Extract ALL steps in order
   - Determine prep time, cook time, servings, difficulty, and cuisine
   - If there are multiple recipes, extract the MAIN recipe (usually the first or most prominent)

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

Return ONLY the JSON, no markdown or explanations.`, sanitizePromptString(url), htmlContent)

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("generation failed: %w", err)
	}

	result, err := parseGeminiJSON[ExtractionResult](resp)
	if err != nil {
		return nil, fmt.Errorf("extract from webpage: %w", err)
	}

	if result.NonRecipe {
		return nil, fmt.Errorf("%w: %s", model.ErrIrrelevantContent, result.Reason)
	}

	// Use extracted image URL if AI didn't find one or if we prefer metadata
	if imageURL != "" {
		result.Thumbnail = imageURL
	}

	return result, nil
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
1. **CRITICAL**: If this image is clearly **NOT a pantry, fridge, food storage, or grocery receipt/haul** (e.g. a selfie, landscape, car, pet, random object),
   return a JSON with: {"non_pantry": true, "reason": "Image appears to be [description]"}.
   DO NOT invent food items from random text/shapes.
2. Identify ALL visible food items, ingredients, and pantry staples
3. For each item, determine:
   - Name (be specific: "Roma tomatoes" not just "tomatoes")
   - Category (MUST be one of the exact values below)
   - Estimated quantity and unit if visible
   - Your confidence level (0-1)
4. Include items even if partially visible
5. If you see containers/packages, identify the contents
6. Note the general condition of items (fresh, wilting, etc.)

**Categories** (use ONLY these exact values): dairy, produce, proteins, bakery, pantry, spices, condiments, beverages, snacks, frozen, household, other

**Return JSON matching this structure**:
{
    "items": [
        {
            "name": "Roma tomatoes",
            "category": "produce",
            "quantity": 4,
            "unit": "pieces",
            "confidence": 0.95
        }
    ],
    "confidence": 0.9,
    "notes": "Image shows a well-stocked refrigerator."
}

**Unit guidelines** (use purchase-scale units, NOT cooking units):
- Countable items: "pieces"
- Packages: "bags", "boxes", "cans", "bottles", "jars", "packs", "cartons"
- Produce: "bunches", "heads"
- Weight: "g", "kg", "oz", "lbs"
- Volume: "ml", "liters"

Return ONLY the JSON, no markdown or explanations. If no food items are detected, return empty items array.`

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

	result, err := parseGeminiJSON[PantryScanResult](resp)
	if err != nil {
		return nil, fmt.Errorf("scan pantry: %w", err)
	}

	if result.NonPantry {
		return nil, fmt.Errorf("%w: %s", model.ErrIrrelevantContent, result.Reason)
	}

	return result, nil
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
	var lastErr error

	for attempt := 0; attempt < 2; attempt++ {
		resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
			return genModel.GenerateContent(ctx, genai.Text(prompt))
		})
		if err != nil {
			lastErr = fmt.Errorf("enrichment generation failed: %w", err)
			continue
		}

		result, err := parseGeminiJSON[EnrichmentResult](resp)
		if err != nil {
			lastErr = fmt.Errorf("enrich recipe: %w", err)
			continue
		}

		return result, nil
	}

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
2. **CRITICAL**: If this image is clearly **NOT a cooking recipe or food preparation** (e.g. a selfie, landscape, random object, non-food text),
   return a JSON with: {"non_recipe": true, "reason": "Image appears to be [description]"}.
   DO NOT invent a recipe from random text.
3. Identify the recipe title
4. Extract ALL ingredients with quantities and units
5. Extract ALL cooking steps/instructions in order
6. Determine prep time, cook time, servings, difficulty, and cuisine if visible
7. If text is partially obscured or unclear, make reasonable inferences

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

	result, err := parseGeminiJSON[ExtractionResult](resp)
	if err != nil {
		return nil, fmt.Errorf("extract from image: %w", err)
	}

	if result.NonRecipe {
		return nil, fmt.Errorf("%w: %s", model.ErrIrrelevantContent, result.Reason)
	}

	return result, nil
}
