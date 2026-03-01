package ai

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/dishflow/backend/internal/model"
	"github.com/google/generative-ai-go/genai"
)

// thermomixRetryConfig is intentionally more aggressive than defaultRetryConfig.
// Two Gemini passes share a 360 s budget; 2 attempts × 100 s per call leaves
// headroom for both passes without burning the entire timeout on retries.
var thermomixRetryConfig = retryConfig{
	maxAttempts: 2,
	baseDelay:   2 * time.Second,
	maxDelay:    5 * time.Second,
}

// thermomixCallTimeout is the per-individual-Gemini-call deadline.
// A single hung connection cannot consume more than this fraction of the
// 360 s job budget before the retry logic kicks in.
const thermomixCallTimeout = 150 * time.Second

// ThermomixStep is a single converted step with optional Thermomix machine parameters.
type ThermomixStep struct {
	// Text is the step instruction WITHOUT the Thermomix notation appended.
	// It must contain each entry in IngredientRefs verbatim.
	Text string `json:"text"`
	// Mode is the Cookidoo automode identifier when this step maps to a fixed Thermomix
	// preset: "dough", "turbo", "blend", "warm_up", "rice_cooker".
	// When Mode is set, Speed is ignored — the mode defines its own speed internally.
	Mode string `json:"mode"`
	// Speed is the Thermomix speed (e.g. "1", "5", "10"). Only used when Mode is "".
	Speed string `json:"speed"`
	// TimeSeconds is the duration in seconds (e.g. 300 for 5 minutes). 0 if no timer.
	TimeSeconds int `json:"time_seconds"`
	// TempCelsius is the temperature in Celsius (e.g. "100"). Empty if no heat.
	// Only used when Mode is "" or Mode is "warm_up" (which defaults to "65").
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

// newThermomixModel returns a Gemini model configured for deterministic Thermomix
// JSON output. Temperature 0.1 minimises randomness while preserving flexibility
// for edge cases — essential for consistent ingredient_refs mapping.
func (g *GeminiClient) newThermomixModel() *genai.GenerativeModel {
	m := g.client.GenerativeModel(g.model)
	m.ResponseMIMEType = "application/json"
	temp := float32(0.1)
	m.Temperature = &temp
	return m
}

// ConvertToThermomix uses Gemini to convert a Dlishe recipe into Thermomix-formatted
// ingredients and step instructions with inline speed/temperature/time parameters.
// This is a highly optimized single-pass generation. It tasks the model with both
// conversion and expert enhancement simultaneously to avoid doubling the latency.
// Strict Cookidoo validation (ingredient substring matches, parameter matrix rules)
// is enforced deterministically in Go immediately after generation.
func (g *GeminiClient) ConvertToThermomix(ctx context.Context, recipe *model.Recipe) (*ThermomixConversionResult, error) {
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

	// ── Single Pass: Conversion + Professional Review ─────────────────────────

	prompt := fmt.Sprintf(`You are a certified professional Thermomix TM6 recipe developer for Cookidoo.
Convert the recipe below into Thermomix format. Output purely in valid JSON.

OUTPUT LANGUAGE: %s — write ALL text (ingredients, step text) in %s.

━━━ CORE RULES ━━━
1. "text" = plain human instruction. NEVER append machine notation to "text" (e.g., no "/ Vitesse 5 / 100°C").
2. "ingredient_refs" MUST be exact substrings of "text". If you list it in refs, you must type those exact words in "text".
3. When using an automode (e.g. "dough"), "speed" MUST be "".

━━━ EXPERT THERMOMIX TM6 PARAMETERS ━━━
Apply these professional settings based on the action:

* CHOPPING (mode: "", heat: "")
  - Onions/garlic/soft veg: speed "5", time 5s.
  - Hard veg (carrots, parmesan): speed "7", time 5-10s.
  - Ultra-fast finishing burst: mode "turbo", time 2s.

* SAUTÉING / BROWNING 
  - Onions/aromatics: speed "1" or "2", temp "120", time 180-300s.
  - Softening without browning: temp "100" (not 120).

* COOKING / SIMMERING / WARMING
  - Soups/stews: speed "1", temp "100", time per recipe.
  - Delicate (eggs, custard): temp "80" max.
  - Béchamel: temp "90".
  - Chocolate melting: temp "50".
  - Gentle warming: mode "warm_up", temp "65".

* BLENDING / MIXING / KNEADING
  - Smooth blend/purée: mode "blend", time 60s.
  - Kneading dough: mode "dough", time 120-240s.
  - Whipping/emulsifying: speed "3" or "4", heat "".

* MANUAL STEPS (Oven, Pan out of bowl, Rest, Plate, Serve)
  - Set mode="", speed="", time_seconds=0, temp_celsius=""

━━━ RECIPE TO CONVERT ━━━
Title: %s
Servings: %d
Total time: %d minutes

INGREDIENTS:
%s

STEPS:
%s

━━━ OUTPUT FORMAT ━━━
Return ONLY valid JSON (no markdown):
{
  "ingredients": ["quantity unit name", ...],
  "steps": [
    {
      "text": "instruction in plain language without notation",
      "mode": "",
      "speed": "5",
      "time_seconds": 5,
      "temp_celsius": "",
      "ingredient_refs": ["exact substring match from text"]
    }
  ],
  "required_models": ["TM6", "TM5"]
}`,
		lang, lang,
		recipe.Title, servings, totalMins,
		strings.Join(ingLines, "\n"),
		strings.Join(stepLines, "\n"),
	)

	genModel := g.newThermomixModel()
	resp, err := withRetry(ctx, thermomixRetryConfig, func() (*genai.GenerateContentResponse, error) {
		callCtx, callCancel := context.WithTimeout(ctx, thermomixCallTimeout)
		defer callCancel()
		return genModel.GenerateContent(callCtx, genai.Text(prompt))
	})
	if err != nil {
		slog.Default().Error("thermomix: conversion failed", "recipe_title", recipe.Title, "err", err)
		return nil, fmt.Errorf("thermomix conversion failed: %w", err)
	}

	result, err := parseGeminiJSON[ThermomixConversionResult](resp)
	if err != nil {
		return nil, fmt.Errorf("parse thermomix conversion: %w", err)
	}
	if len(result.Steps) == 0 {
		return nil, fmt.Errorf("thermomix conversion returned empty steps")
	}
	if len(result.RequiredModels) == 0 {
		result.RequiredModels = []string{"TM6", "TM5"}
	}

	// ── Post-Generation Go Validation ────────────────────────────────────────

	for i := range result.Steps {
		step := &result.Steps[i]

		// 1. Parameter Rule Violations
		// If mode is set, speed and temp must be empty (except warm_up temp).
		if step.Mode != "" {
			step.Speed = ""
			if step.Mode != "warm_up" {
				step.TempCelsius = ""
			}
		}
		// If it's a manual step (everything empty), ensure time_seconds is 0.
		if step.Mode == "" && step.Speed == "" && step.TempCelsius == "" {
			step.TimeSeconds = 0
		}

		// 2. Ingredient Substring Validation
		// Cookidoo explodes if an ingredient_ref is not an exact substring of "text".
		// We filter the AI's list to only include verified substrings.
		var verifiedRefs []string
		for _, ref := range step.IngredientRefs {
			if strings.Contains(step.Text, ref) {
				verifiedRefs = append(verifiedRefs, ref)
			}
		}
		step.IngredientRefs = verifiedRefs
	}

	return result, nil
}
