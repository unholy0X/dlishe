package ai

import (
	"context"
	"fmt"
	"strings"

	"github.com/dishflow/backend/internal/model"
	"github.com/google/generative-ai-go/genai"
)

// ThermomixStep is a single converted step with optional Thermomix machine parameters.
type ThermomixStep struct {
	// Text is the step instruction WITHOUT the Thermomix notation appended.
	// It must contain each entry in IngredientRefs verbatim.
	Text string `json:"text"`
	// Speed is the Thermomix speed setting (e.g. "1", "5", "10"). Empty if no machine action.
	Speed string `json:"speed"`
	// TimeSeconds is the duration in seconds (e.g. 300 for 5 minutes). 0 if no timer.
	TimeSeconds int `json:"time_seconds"`
	// TempCelsius is the temperature in Celsius as a string (e.g. "100", "120"). Empty if no heat.
	TempCelsius string `json:"temp_celsius"`
	// IngredientRefs are ingredient descriptions (e.g. "500 g tomates") that appear
	// verbatim inside Text. Each will become an INGREDIENT annotation in Cookidoo.
	IngredientRefs []string `json:"ingredient_refs"`
}

// ThermomixConversionResult is the structured output from ConvertToThermomix.
type ThermomixConversionResult struct {
	// Ingredients are formatted strings ready for Cookidoo, e.g. "200 g farine".
	Ingredients []string `json:"ingredients"`
	// Steps are the converted steps with optional Thermomix machine parameters.
	Steps []ThermomixStep `json:"steps"`
	// RequiredModels lists the Thermomix models this recipe is compatible with.
	RequiredModels []string `json:"required_models"`
}

// ThermomixConverter converts a standard recipe to Thermomix-formatted content.
type ThermomixConverter interface {
	ConvertToThermomix(ctx context.Context, recipe *model.Recipe) (*ThermomixConversionResult, error)
}

// ConvertToThermomix uses Gemini to convert a Dlishe recipe into Thermomix-formatted
// ingredients and step instructions with inline speed/temperature/time parameters.
func (g *GeminiClient) ConvertToThermomix(ctx context.Context, recipe *model.Recipe) (*ThermomixConversionResult, error) {
	genModel := g.client.GenerativeModel(g.model)
	genModel.ResponseMIMEType = "application/json"

	// Determine output language from recipe content language.
	lang := ResolveLanguageName(recipe.ContentLanguage)
	if lang == "auto" || lang == "" {
		lang = "French"
	}

	// Format ingredients for the prompt.
	var ingLines []string
	for _, ing := range recipe.Ingredients {
		line := ing.Name
		if ing.Quantity != nil && *ing.Quantity > 0 {
			if ing.Unit != nil && *ing.Unit != "" {
				line = fmt.Sprintf("%g %s %s", *ing.Quantity, *ing.Unit, ing.Name)
			} else {
				line = fmt.Sprintf("%g %s", *ing.Quantity, ing.Name)
			}
		}
		if ing.IsOptional {
			line += " (optional)"
		}
		ingLines = append(ingLines, "- "+line)
	}

	// Format steps for the prompt.
	var stepLines []string
	for _, step := range recipe.Steps {
		line := fmt.Sprintf("%d. %s", step.StepNumber, step.Instruction)
		if step.DurationSeconds != nil && *step.DurationSeconds > 0 {
			mins := *step.DurationSeconds / 60
			secs := *step.DurationSeconds % 60
			if secs == 0 {
				line += fmt.Sprintf(" [duration: %d min]", mins)
			} else {
				line += fmt.Sprintf(" [duration: %dm%ds]", mins, secs)
			}
		}
		if step.Temperature != nil && *step.Temperature != "" {
			line += fmt.Sprintf(" [temperature: %s]", *step.Temperature)
		}
		stepLines = append(stepLines, line)
	}

	servings := 4
	if recipe.Servings != nil {
		servings = *recipe.Servings
	}
	totalMins := recipe.TotalTime()

	prompt := fmt.Sprintf(`You are a Thermomix recipe expert. Convert the following recipe into Thermomix TM6/TM5 format.

OUTPUT LANGUAGE: %s — write ALL output text (ingredients, step text) in %s.

RECIPE TO CONVERT:
Title: %s
Servings: %d
Total time: %d minutes

INGREDIENTS:
%s

STEPS:
%s

YOUR TASK:

1. **ingredients**: Convert each ingredient to a clean string: "quantity unit name".
   Example: "200 g farine", "3 oeufs", "1 oignon moyen". No bullet points.

2. **steps**: For each step, return an object with:
   - "text": step instruction in plain language (NO Thermomix notation appended here).
     When the step explicitly uses a specific ingredient, embed its EXACT formatted
     description (from the ingredients list above, e.g. "500 g tomates") verbatim in the text.
   - "speed": Thermomix speed as a string, e.g. "1", "5", "10". Use "" if no machine action.
   - "time_seconds": duration in seconds as an integer. Use 0 if no timer.
   - "temp_celsius": temperature in Celsius as a string, e.g. "100", "120". Use "" if no heat.
   - "ingredient_refs": array of ingredient descriptions (copied exactly from the ingredients
     list) that appear verbatim in "text". Empty array [] if none are embedded.

   Speed guidelines:
   - Chopping/blending: speed 5-10 (no heat)
   - Sautéing/frying: speed 1-2, temp 120°C
   - Simmering: speed 1, temp 90-100°C
   - Steaming (Varoma): speed 1-3, temp 120 (use 120 for Varoma too)
   - Kneading: speed 0 (special mode, set temp "" and time accordingly)
   - No machine action (rest, serve, plate): speed "", time_seconds 0, temp_celsius ""

3. **required_models**: Return ["TM6", "TM5"] for standard features.
   Return ["TM6"] only for TM6-exclusive features: temp >120°C, Slow Cook, Sous-vide, Fermentation.

Return ONLY this JSON, no markdown:
{
  "ingredients": ["string", ...],
  "steps": [
    {"text": "Mettre les 500 g tomates dans le bol.", "speed": "5", "time_seconds": 5, "temp_celsius": "", "ingredient_refs": ["500 g tomates"]},
    {"text": "Faire revenir.", "speed": "1", "time_seconds": 180, "temp_celsius": "120", "ingredient_refs": []},
    {"text": "Laisser reposer.", "speed": "", "time_seconds": 0, "temp_celsius": "", "ingredient_refs": []}
  ],
  "required_models": ["TM6", "TM5"]
}`,
		lang, lang,
		recipe.Title, servings, totalMins,
		strings.Join(ingLines, "\n"),
		strings.Join(stepLines, "\n"),
	)

	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, genai.Text(prompt))
	})
	if err != nil {
		return nil, fmt.Errorf("thermomix conversion failed: %w", err)
	}

	result, err := parseGeminiJSON[ThermomixConversionResult](resp)
	if err != nil {
		return nil, fmt.Errorf("parse thermomix conversion: %w", err)
	}

	// Sanity check — Gemini should always return at least some content.
	if len(result.Steps) == 0 {
		return nil, fmt.Errorf("thermomix conversion returned empty steps")
	}
	if len(result.RequiredModels) == 0 {
		result.RequiredModels = []string{"TM6", "TM5"}
	}

	return result, nil
}
