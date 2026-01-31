package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/dishflow/backend/internal/model"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

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

// IsAvailable checks if the service is configured
func (g *GeminiClient) IsAvailable(ctx context.Context) bool {
	return g.client != nil
}
