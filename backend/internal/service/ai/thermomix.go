package ai

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"github.com/dishflow/backend/internal/model"
	"github.com/google/generative-ai-go/genai"
)

// ttsSingleTokenRe matches a single Thermomix machine-parameter token:
//   - time:  "5 sec", "3 min", "1 min 30 sec"
//   - temp:  "120°C", "100°F"
//   - speed: "vitesse 1", "Stufe 5", "vel. 3", "speed 5", "سرعة 1", "速度 3", "stand 4"
//
// Using digit-prefix matching for time units prevents false positives on ingredient
// names that contain "min" or "sec" as substrings (e.g. "cumin", "sel sec", "émincé").
var ttsSingleTokenRe = regexp.MustCompile(
	`(?i)^(` +
		`\d+\s*(sec|min)(\s+\d+\s*(sec|min))?` + // time: "5 sec", "1 min 30 sec"
		`|\d+\s*°[cf]` + // temp:  "120°C", "100°F"
		`|speed\s+\d+` + // speed: English
		`|vitesse\s+\d+` + // speed: French
		`|stufe\s+\d+` + // speed: German
		`|vel\.\s*\d+` + // speed: ES/IT/PT
		`|stand\s+\d+` + // speed: Dutch
		`|سرعة(\s+\d+)?` + // speed: Arabic (number optional)
		`|速度(\s+\d+)?` + // speed: ZH/JA (number optional)
		`)$`,
)

// isTTSRef returns true when ref is purely a composed Thermomix parameter string
// (time / temperature / speed tokens joined by " / "), meaning it was hallucinated
// into ingredient_refs by the AI. Legitimate ingredient names are never all-TTS.
func isTTSRef(ref string) bool {
	// Split on the delimiter used by both LTR and Arabic RTL (RLM-prefixed) notation.
	parts := strings.FieldsFunc(ref, func(r rune) bool { return r == '/' })
	if len(parts) == 0 {
		return false
	}
	for _, part := range parts {
		// Strip surrounding whitespace and the RTL-mark (\u200F) used in Arabic notation.
		part = strings.Trim(part, " \u200F")
		if part == "" {
			continue
		}
		if !ttsSingleTokenRe.MatchString(part) {
			return false
		}
	}
	return true
}

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
func (g *GeminiClient) newThermomixModel(modelName string) *genai.GenerativeModel {
	m := g.client.GenerativeModel(modelName)
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
  "required_models": ["TM7", "TM6", "TM5"]
}`,
		lang, lang,
		recipe.Title, servings, totalMins,
		strings.Join(ingLines, "\n"),
		strings.Join(stepLines, "\n"),
	)

	var lastErr error
	var result *ThermomixConversionResult

	for _, modelName := range g.models {
		slog.Info("thermomix: attempting conversion", "model", modelName, "recipe_title", recipe.Title)
		genModel := g.newThermomixModel(modelName)

		resp, err := withRetry(ctx, thermomixRetryConfig, func() (*genai.GenerateContentResponse, error) {
			callCtx, callCancel := context.WithTimeout(ctx, thermomixCallTimeout)
			defer callCancel()
			return genModel.GenerateContent(callCtx, genai.Text(prompt))
		})

		if err == nil {
			var parseErr error
			result, parseErr = parseGeminiJSON[ThermomixConversionResult](resp)
			if parseErr == nil {
				// We have a successful, valid JSON result. Break out of fallback loop.
				break
			}
			lastErr = fmt.Errorf("model %s produced invalid JSON: %w", modelName, parseErr)
			slog.Warn("thermomix: invalid json from conversion, falling back", "model", modelName, "err", parseErr)
			continue
		}

		lastErr = fmt.Errorf("model %s failed: %w", modelName, err)
		slog.Warn("thermomix: conversion model failed, falling back", "model", modelName, "err", err)
	}

	if result == nil {
		slog.Default().Error("thermomix: conversion failed across all models", "recipe_title", recipe.Title, "err", lastErr)
		return nil, fmt.Errorf("thermomix conversion failed after model fallback loop: %w", lastErr)
	}
	if len(result.Steps) == 0 {
		return nil, fmt.Errorf("thermomix conversion returned empty steps")
	}
	// All recipes are compatible with TM5, TM6, and TM7.
	// Overriding unconditionally — the AI cannot reliably determine model
	// compatibility and simply echoes the prompt example.
	result.RequiredModels = []string{"TM7", "TM6", "TM5"}

	// ── Post-Generation Go Validation ────────────────────────────────────────

	sanitizeSteps(result.Steps)

	return result, nil
}

// sanitizeSteps applies deterministic post-generation corrections to AI-generated
// Thermomix steps. It is extracted as a package-level function so it can be unit
// tested independently of the Gemini call.
func sanitizeSteps(steps []ThermomixStep) {
	for i := range steps {
		step := &steps[i]

		// 1. Zero-value hallucinations: AI sometimes emits "0" instead of ""
		//    for unused numeric fields on manual steps (e.g. "speed": "0").
		//    Cookidoo renders a visible "Speed 0" tag on the device screen.
		if step.Speed == "0" || step.Speed == "0.0" {
			step.Speed = ""
		}
		if step.TempCelsius == "0" || step.TempCelsius == "0.0" {
			step.TempCelsius = ""
		}

		// 2. Mode/Speed/Temp conflicts.
		if step.Mode != "" {
			step.Speed = ""
			if step.Mode != "warm_up" {
				step.TempCelsius = ""
			}
		}

		// 3. Manual steps must have no timer.
		if step.Mode == "" && step.Speed == "" && step.TempCelsius == "" {
			step.TimeSeconds = 0
		}

		// 4. Ingredient ref validation and TTS-parameter hallucination filter.
		//
		// Cookidoo requires every ingredient_ref to be an exact substring of
		// the step text. We also filter refs that are purely machine parameters
		// (e.g. "5 sec", "vitesse 1") — the AI sometimes places TTS notation
		// strings here, causing them to render as clickable ingredient checkboxes.
		//
		// ttsMatcher uses structural digit-prefix matching for time units so that
		// legitimate ingredients whose names contain "min" or "sec" as substrings
		// (e.g. "cumin", "sel sec", "émincé") are NOT incorrectly dropped.
		var verifiedRefs []string
		for _, ref := range step.IngredientRefs {
			if ref == "" {
				continue
			}
			// Drop refs that are entirely composed of machine-parameter tokens.
			if isTTSRef(ref) {
				slog.Default().Warn("thermomix: dropped hallucinated TTS ref", "ref", ref)
				continue
			}
			if strings.Contains(step.Text, ref) {
				verifiedRefs = append(verifiedRefs, ref)
			} else {
				slog.Default().Warn("thermomix: dropped unmatched ingredient_ref", "ref", ref)
			}
		}
		step.IngredientRefs = verifiedRefs
	}
}
