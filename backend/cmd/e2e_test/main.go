package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/dishflow/backend/internal/service/ai"
)

// TestCase represents a single extraction test
type TestCase struct {
	Name        string
	URL         string
	Type        string // "video" or "webpage"
	Description string
}

var testCases = []TestCase{
	// Webpage recipes from eitanbernath.com
	{
		Name:        "Sesame Schnitzel",
		URL:         "https://www.eitanbernath.com/2024/06/06/sesame-schnitzel-topped-with-loaded-salad/",
		Type:        "webpage",
		Description: "Recipe with loaded salad topping",
	},
	{
		Name:        "Caprese Pizza",
		URL:         "https://www.eitanbernath.com/2024/01/31/caprese-pizza/",
		Type:        "webpage",
		Description: "Classic Italian pizza recipe",
	},
	{
		Name:        "Peanut Butter Swirl Brownies",
		URL:         "https://www.eitanbernath.com/2023/03/23/peanut-butter-swirl-brownies-2/",
		Type:        "webpage",
		Description: "Decadent brownie dessert",
	},

	// TikTok videos
	{
		Name:        "Eitan TikTok Recipe 1",
		URL:         "https://www.tiktok.com/@eitan/video/7294394420063898922",
		Type:        "video",
		Description: "TikTok cooking video",
	},
	{
		Name:        "Eitan TikTok Recipe 2",
		URL:         "https://www.tiktok.com/@eitan/video/6831608363189570821",
		Type:        "video",
		Description: "TikTok cooking video",
	},
}

func main() {
	// Check for API key
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" || apiKey == "mock" {
		log.Fatal("❌ GEMINI_API_KEY environment variable is required and cannot be 'mock'")
	}

	fmt.Println("🧪 DishFlow E2E Recipe Extraction Test Suite")
	fmt.Println("=" + strings.Repeat("=", 60))
	fmt.Println()

	// Initialize Gemini extractor
	ctx := context.Background()

	// Create GeminiClient using the correct constructor
	extractor, err := ai.NewGeminiClient(ctx, apiKey)
	if err != nil {
		log.Fatalf("❌ Failed to create Gemini client: %v", err)
	}

	// Check if service is available
	if !extractor.IsAvailable(ctx) {
		log.Fatal("❌ Gemini API service is not available")
	}

	fmt.Println("✅ Gemini API connected")
	fmt.Println()

	// Create output directory for recipe files
	outputDir := "e2e_output"
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Printf("Warning: Could not create output directory: %v", err)
	}

	// Run tests
	passed := 0
	failed := 0
	results := make(map[string]*TestResult)

	for i, tc := range testCases {
		fmt.Printf("Test %d/%d: %s\n", i+1, len(testCases), tc.Name)
		fmt.Printf("URL: %s\n", tc.URL)
		fmt.Printf("Type: %s\n", tc.Type)
		fmt.Println(strings.Repeat("-", 60))

		result := runTest(ctx, extractor, tc)
		results[tc.Name] = result

		if result.Success {
			passed++
			fmt.Printf("✅ PASSED - Extracted '%s'\n", result.RecipeTitle)
			fmt.Printf("   Ingredients: %d | Steps: %d | Time: %.2fs\n",
				result.IngredientCount, result.StepCount, result.Duration.Seconds())

			// Save individual recipe file
			if err := saveRecipeMarkdown(outputDir, tc.Name, tc.URL, result); err != nil {
				log.Printf("Warning: Could not save recipe markdown: %v", err)
			} else {
				fmt.Printf("   📝 Saved to %s/%s.md\n", outputDir, sanitizeFilename(tc.Name))
			}
		} else {
			failed++
			fmt.Printf("❌ FAILED - %s\n", result.Error)
		}
		fmt.Println()
	}

	// Summary
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("📊 Test Summary: %d passed, %d failed out of %d total\n", passed, failed, len(testCases))
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println()

	// Detailed console output
	if passed > 0 {
		fmt.Println("📝 Quick Preview (Full details in markdown files):")
		fmt.Println()
		for _, tc := range testCases {
			result := results[tc.Name]
			if result.Success {
				printDetailedResult(tc, result)
			}
		}
	}

	// Save results to JSON
	saveResults(results)

	// Print summary of output files
	if passed > 0 {
		fmt.Println()
		fmt.Println("📁 Human-Readable Recipe Files Created:")
		for _, tc := range testCases {
			if results[tc.Name].Success {
				filename := sanitizeFilename(tc.Name)
				fmt.Printf("   - %s/%s.md\n", outputDir, filename)
			}
		}
		fmt.Printf("\n💡 Tip: Open the .md files in %s/ for detailed recipe analysis\n", outputDir)
	}

	// Exit with appropriate code
	if failed > 0 {
		os.Exit(1)
	}
}

type TestResult struct {
	Success         bool
	RecipeTitle     string
	IngredientCount int
	StepCount       int
	Duration        time.Duration
	Error           string
	FullRecipe      *ai.ExtractionResult
}

func runTest(ctx context.Context, extractor ai.RecipeExtractor, tc TestCase) *TestResult {
	start := time.Now()
	result := &TestResult{}

	var recipe *ai.ExtractionResult
	var err error

	switch tc.Type {
	case "webpage":
		recipe, err = extractor.ExtractFromWebpage(ctx, tc.URL, nil)
	case "video":
		// Note: Video extraction requires the video to be downloaded first
		// For now, we'll skip video tests in this simple e2e
		result.Error = "Video extraction requires download step - skipping"
		return result
	default:
		result.Error = fmt.Sprintf("Unknown test type: %s", tc.Type)
		return result
	}

	result.Duration = time.Since(start)

	if err != nil {
		result.Error = err.Error()
		return result
	}

	if recipe == nil || recipe.Title == "" {
		result.Error = "No recipe extracted"
		return result
	}

	result.Success = true
	result.RecipeTitle = recipe.Title
	result.IngredientCount = len(recipe.Ingredients)
	result.StepCount = len(recipe.Steps)
	result.FullRecipe = recipe

	return result
}

func printDetailedResult(tc TestCase, result *TestResult) {
	recipe := result.FullRecipe
	fmt.Printf("🍳 %s\n", tc.Name)
	fmt.Printf("   Title: %s\n", recipe.Title)
	if recipe.Description != "" {
		fmt.Printf("   Description: %s\n", truncate(recipe.Description, 100))
	}
	if recipe.Servings > 0 {
		fmt.Printf("   Servings: %d\n", recipe.Servings)
	}
	if recipe.PrepTime > 0 || recipe.CookTime > 0 {
		fmt.Printf("   Time: %dmin prep + %dmin cook\n", recipe.PrepTime, recipe.CookTime)
	}
	if recipe.Cuisine != "" {
		fmt.Printf("   Cuisine: %s\n", recipe.Cuisine)
	}
	if recipe.Difficulty != "" {
		fmt.Printf("   Difficulty: %s\n", recipe.Difficulty)
	}

	fmt.Printf("\n   🥗 Ingredients (%d):\n", len(recipe.Ingredients))
	for i, ing := range recipe.Ingredients {
		if i >= 5 {
			fmt.Printf("      ... and %d more\n", len(recipe.Ingredients)-5)
			break
		}
		fmt.Printf("      - %s %s %s\n", ing.Quantity, ing.Unit, ing.Name)
	}

	fmt.Printf("\n   📋 Steps (%d):\n", len(recipe.Steps))
	for i, step := range recipe.Steps {
		if i >= 3 {
			fmt.Printf("      ... and %d more steps\n", len(recipe.Steps)-3)
			break
		}
		fmt.Printf("      %d. %s\n", step.StepNumber, truncate(step.Instruction, 80))
	}

	if len(recipe.Tags) > 0 {
		fmt.Printf("\n   🏷️  Tags: %s\n", strings.Join(recipe.Tags, ", "))
	}

	fmt.Println()
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

func saveResults(results map[string]*TestResult) {
	output := make(map[string]interface{})
	for name, result := range results {
		if result.Success {
			output[name] = map[string]interface{}{
				"success":     true,
				"title":       result.RecipeTitle,
				"ingredients": result.IngredientCount,
				"steps":       result.StepCount,
				"duration_ms": result.Duration.Milliseconds(),
			}
		} else {
			output[name] = map[string]interface{}{
				"success": false,
				"error":   result.Error,
			}
		}
	}

	data, _ := json.MarshalIndent(output, "", "  ")
	if err := os.WriteFile("e2e_results.json", data, 0644); err != nil {
		log.Printf("Warning: Could not save results: %v", err)
	} else {
		fmt.Println("💾 Results saved to e2e_results.json")
	}
}

// saveRecipeMarkdown creates a detailed markdown file for a recipe
func saveRecipeMarkdown(outputDir, testName, url string, result *TestResult) error {
	if !result.Success || result.FullRecipe == nil {
		return nil
	}

	recipe := result.FullRecipe
	filename := filepath.Join(outputDir, sanitizeFilename(testName)+".md")

	var md strings.Builder

	// Header
	md.WriteString("# " + recipe.Title + "\n\n")

	// Metadata section
	md.WriteString("## Test Information\n\n")
	md.WriteString("- **Test Name:** " + testName + "\n")
	md.WriteString("- **Source URL:** " + url + "\n")
	md.WriteString(fmt.Sprintf("- **Extraction Time:** %.2fs\n", result.Duration.Seconds()))
	md.WriteString(fmt.Sprintf("- **Test Run:** %s\n\n", time.Now().Format("2006-01-02 15:04:05")))

	// Recipe details
	md.WriteString("## Recipe Details\n\n")
	if recipe.Description != "" {
		md.WriteString("**Description:** " + recipe.Description + "\n\n")
	}

	// Quick facts table
	md.WriteString("| Attribute | Value |\n")
	md.WriteString("|-----------|-------|\n")
	if recipe.Servings > 0 {
		md.WriteString(fmt.Sprintf("| Servings | %d |\n", recipe.Servings))
	}
	if recipe.PrepTime > 0 {
		md.WriteString(fmt.Sprintf("| Prep Time | %d min |\n", recipe.PrepTime))
	}
	if recipe.CookTime > 0 {
		md.WriteString(fmt.Sprintf("| Cook Time | %d min |\n", recipe.CookTime))
	}
	if recipe.PrepTime > 0 || recipe.CookTime > 0 {
		md.WriteString(fmt.Sprintf("| Total Time | %d min |\n", recipe.PrepTime+recipe.CookTime))
	}
	if recipe.Difficulty != "" {
		md.WriteString(fmt.Sprintf("| Difficulty | %s |\n", recipe.Difficulty))
	}
	if recipe.Cuisine != "" {
		md.WriteString(fmt.Sprintf("| Cuisine | %s |\n", recipe.Cuisine))
	}
	md.WriteString("\n")

	// Tags
	if len(recipe.Tags) > 0 {
		md.WriteString("**Tags:** " + strings.Join(recipe.Tags, ", ") + "\n\n")
	}

	// Ingredients
	md.WriteString(fmt.Sprintf("## Ingredients (%d total)\n\n", len(recipe.Ingredients)))

	// Group by category
	categoryMap := make(map[string][]ai.ExtractedIngredient)
	for _, ing := range recipe.Ingredients {
		cat := ing.Category
		if cat == "" {
			cat = "other"
		}
		categoryMap[cat] = append(categoryMap[cat], ing)
	}

	// Sort categories
	categories := make([]string, 0, len(categoryMap))
	for cat := range categoryMap {
		categories = append(categories, cat)
	}

	for _, cat := range categories {
		md.WriteString(fmt.Sprintf("### %s\n\n", strings.Title(cat)))
		for _, ing := range categoryMap[cat] {
			qty := ing.Quantity
			unit := ing.Unit
			name := ing.Name

			if qty != "" && unit != "" {
				md.WriteString(fmt.Sprintf("- **%s %s** %s", qty, unit, name))
			} else if qty != "" {
				md.WriteString(fmt.Sprintf("- **%s** %s", qty, name))
			} else {
				md.WriteString(fmt.Sprintf("- %s", name))
			}

			if ing.IsOptional {
				md.WriteString(" _(optional)_")
			}
			if ing.Notes != "" {
				md.WriteString(" — " + ing.Notes)
			}
			md.WriteString("\n")
		}
		md.WriteString("\n")
	}

	// Steps
	md.WriteString(fmt.Sprintf("## Instructions (%d steps)\n\n", len(recipe.Steps)))
	for _, step := range recipe.Steps {
		md.WriteString(fmt.Sprintf("### Step %d\n\n", step.StepNumber))
		md.WriteString(step.Instruction + "\n\n")

		// Add metadata if available
		details := []string{}
		if step.DurationSeconds > 0 {
			mins := step.DurationSeconds / 60
			secs := step.DurationSeconds % 60
			if mins > 0 {
				details = append(details, fmt.Sprintf("⏱️ %d min %d sec", mins, secs))
			} else {
				details = append(details, fmt.Sprintf("⏱️ %d sec", secs))
			}
		}
		if step.Temperature != "" {
			details = append(details, "🌡️ "+step.Temperature)
		}
		if step.Technique != "" {
			details = append(details, "✋ "+step.Technique)
		}

		if len(details) > 0 {
			md.WriteString("_" + strings.Join(details, " • ") + "_\n\n")
		}
	}

	// Footer
	md.WriteString("---\n\n")
	md.WriteString("_Recipe extracted by DishFlow E2E Test Suite_\n")

	return os.WriteFile(filename, []byte(md.String()), 0644)
}

// sanitizeFilename creates a safe filename from a string
func sanitizeFilename(s string) string {
	// Replace spaces and special chars
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "_")
	s = strings.ReplaceAll(s, "/", "_")
	s = strings.ReplaceAll(s, "\\", "_")
	s = strings.ReplaceAll(s, ":", "_")
	s = strings.ReplaceAll(s, "*", "_")
	s = strings.ReplaceAll(s, "?", "_")
	s = strings.ReplaceAll(s, "\"", "_")
	s = strings.ReplaceAll(s, "<", "_")
	s = strings.ReplaceAll(s, ">", "_")
	s = strings.ReplaceAll(s, "|", "_")
	return s
}
