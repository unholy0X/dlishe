package ai

import (
	"context"
	"encoding/json"
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
// It runs two passes:
//  1. Conversion — full knowledge-base pass that produces the initial output.
//  2. Review     — focused pass that audits and corrects ingredient_refs mapping
//     and fixes any parameter rule violations in the first-pass output.
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

	// ── Pass 1: full conversion ───────────────────────────────────────────────

	convPrompt := fmt.Sprintf(`You are a certified Thermomix TM6/TM5 recipe developer for Cookidoo.
Convert the recipe below into Thermomix format, applying the knowledge base and reasoning rules.

OUTPUT LANGUAGE: %s — write ALL text (ingredients, step text) in %s.

━━━ THERMOMIX KNOWLEDGE BASE ━━━

WHAT THE THERMOMIX BOWL CAN DO:
- Chop, mince, grate (speed 5–10, no heat, short bursts 3–10 s)
- Sauté, sweat, brown (speed 1–2, 120°C, 3–8 min)
- Cook soups, sauces, creams (speed 1, 80–100°C, time as needed)
- Steam via Varoma dish above the bowl (speed 2–3, 120°C, liquid in bowl)
- Knead bread/pastry dough (speed "0" = Pétrin mode, no heat)
- Blend, purée, emulsify (speed 6–10, no heat)
- Melt chocolate / activate yeast (speed 1–2, 37°C)
- Keep warm (speed 1, 60–70°C)
- Whip egg whites, cream with butterfly whisk (speed 3–4, no heat)

WHAT THE THERMOMIX CANNOT DO (→ manual step, empty speed/temp/time):
- Fry in oil or deep-fry
- Grill, broil, roast, bake
- Cook in a pan or pot on the stovetop outside the machine
- Plate, garnish, serve, rest, refrigerate
- Handle > 1.5 kg solids or > 2 L liquid

SPEED REFERENCE (used only when mode is ""):
- "" (empty) = no machine action — manual step
- "1"–"2"   = slow stir — sautéing, simmering, keeping warm
- "3"–"4"   = medium — emulsifying, butterfly whisk
- "5"–"7"   = chopping — vegetables, onions, herbs, meat
- "8"–"10"  = high speed — blending, puréeing, crushing ice

TEMPERATURE REFERENCE (used only when mode is ""):
- ""    = no heat
- "37"  = body temp (chocolate melting, yeast activation)
- "60"–"80"  = gentle (eggs, cream sauces, delicate)
- "90"–"100" = simmering (soups, pasta sauces, grains)
- "120" = sautéing max / Varoma steaming
- "130"–"160" = TM6 ONLY (caramel, sugar work)

OFFICIAL COOKIDOO AUTOMODES — native Thermomix presets with fixed internal speed:
┌───────────────┬──────────────────────────────────────┬──────────────┬──────────────┐
│ mode          │ When to use                          │ time_seconds │ temp_celsius │
├───────────────┼──────────────────────────────────────┼──────────────┼──────────────┤
│ "dough"       │ Kneading bread/pastry/pizza dough    │ 60–240 s     │ leave ""     │
│ "turbo"       │ Ultra-fast burst chop (1–3 s finish) │ 1–3 s        │ leave ""     │
│ "blend"       │ Smooth blending / puréeing           │ 60–90 s      │ leave ""     │
│ "warm_up"     │ Gently reheating finished sauce/soup │ leave 0      │ "65"         │
│ "rice_cooker" │ Cooking rice or similar grains       │ per recipe   │ leave ""     │
└───────────────┴──────────────────────────────────────┴──────────────┴──────────────┘
When mode is set → speed MUST be "" — the preset handles speed internally.
When mode is ""  → use speed + temp + time (TTS parameters).

━━━ REASONING RULES — APPLY TO EVERY STEP ━━━

For each original step, reason through three questions:

1. CAN this step be done inside the Thermomix bowl?
   - YES    → pick automode OR TTS pattern below
   - NO     → mode "", speed "", time_seconds 0, temp_celsius "" — manual instruction
   - PARTLY → one Thermomix sub-step + one manual sub-step

2. WHICH pattern fits best?
   - Kneading dough          → mode "dough",       time 60–240 s
   - Ultra-fast burst        → mode "turbo",       time 1–3 s  (add AFTER a chop step)
   - Smooth blend/purée      → mode "blend",       time 60–90 s
   - Gentle reheating        → mode "warm_up",     temp "65"
   - Rice / grain cooking    → mode "rice_cooker", time per recipe
   - Chopping (regular)      → speed "5"–"8",  no heat,    time 3–10 s
   - Sautéing / browning     → speed "1"–"2",  temp "120", time 3–8 min
   - Cooking / simmering     → speed "1",      temp "90"–"100", time per recipe
   - Steaming (Varoma)       → speed "2",      temp "120", time per recipe
   - Emulsifying / whipping  → speed "3"–"4",  no heat,    time 30–60 s
   - Warming / keeping warm  → speed "1",      temp "65"–"70"
   - Manual (oven/rest/plate)→ all empty

3. IS the time realistic?
   - Preserve original cooking time — never shorten arbitrarily
   - Convert minutes to seconds exactly (20 min → 1200)
   - Chop / turbo bursts: 3–10 s even if original recipe does not specify

━━━ RECIPE TO CONVERT ━━━

Title: %s
Servings: %d
Total time: %d minutes

INGREDIENTS:
%s

STEPS:
%s

━━━ OUTPUT FORMAT ━━━

Return ONLY valid JSON, no markdown, no explanation:
{
  "ingredients": ["quantity unit name", ...],
  "steps": [
    {
      "text": "step instruction in plain language — never append speed/temp/time notation",
      "mode": "",
      "speed": "5",
      "time_seconds": 5,
      "temp_celsius": "",
      "ingredient_refs": ["exact ingredient string as it appears in text"]
    }
  ],
  "required_models": ["TM6", "TM5"]
}

STRICT RULES:
- "text" = human-readable instruction only — never append "/ Vitesse X / Y°C / Pétrin / etc."
- When mode is set: speed MUST be "" in the JSON
- When mode is "": speed/temp/time carry the TTS parameters
- Embed exact ingredient strings verbatim in "text" and copy them to "ingredient_refs"
- required_models = ["TM6"] only when using temp > 120°C, Slow Cook, Sous-vide, Fermentation
- required_models = ["TM6", "TM5"] for everything else

EXAMPLES (French for structure only — your output must be in %s):
{"text":"Hacher les 2 oignons et 2 gousses d'ail.", "mode":"", "speed":"5", "time_seconds":5, "temp_celsius":"", "ingredient_refs":["2 oignons","2 gousses d'ail"]}
{"text":"Faire revenir les légumes.", "mode":"", "speed":"1", "time_seconds":300, "temp_celsius":"120", "ingredient_refs":[]}
{"text":"Cuire la soupe.", "mode":"", "speed":"1", "time_seconds":1200, "temp_celsius":"100", "ingredient_refs":[]}
{"text":"Mixer jusqu'à consistance lisse.", "mode":"blend", "speed":"", "time_seconds":60, "temp_celsius":"", "ingredient_refs":[]}
{"text":"Pétrir la pâte pendant 2 minutes.", "mode":"dough", "speed":"", "time_seconds":120, "temp_celsius":"", "ingredient_refs":[]}
{"text":"Hacher finement en mode turbo.", "mode":"turbo", "speed":"", "time_seconds":2, "temp_celsius":"", "ingredient_refs":[]}
{"text":"Réchauffer la sauce doucement.", "mode":"warm_up", "speed":"", "time_seconds":0, "temp_celsius":"65", "ingredient_refs":[]}
{"text":"Cuire le riz.", "mode":"rice_cooker", "speed":"", "time_seconds":1800, "temp_celsius":"", "ingredient_refs":[]}
{"text":"Cuire à la vapeur avec le Varoma.", "mode":"", "speed":"2", "time_seconds":1800, "temp_celsius":"120", "ingredient_refs":[]}
{"text":"Préchauffer le four à 180°C.", "mode":"", "speed":"", "time_seconds":0, "temp_celsius":"", "ingredient_refs":[]}
{"text":"Dresser et servir chaud.", "mode":"", "speed":"", "time_seconds":0, "temp_celsius":"", "ingredient_refs":[]}`,
		lang, lang,
		recipe.Title, servings, totalMins,
		strings.Join(ingLines, "\n"),
		strings.Join(stepLines, "\n"),
		lang,
	)

	genModel := g.newThermomixModel()
	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, genai.Text(convPrompt))
	})
	if err != nil {
		return nil, fmt.Errorf("thermomix conversion failed: %w", err)
	}

	first, err := parseGeminiJSON[ThermomixConversionResult](resp)
	if err != nil {
		return nil, fmt.Errorf("parse thermomix conversion: %w", err)
	}
	if len(first.Steps) == 0 {
		return nil, fmt.Errorf("thermomix conversion returned empty steps")
	}
	if len(first.RequiredModels) == 0 {
		first.RequiredModels = []string{"TM6", "TM5"}
	}

	// ── Pass 2: review — fix ingredient_refs and parameter violations ─────────

	reviewed, err := g.reviewThermomixResult(ctx, lang, ingLines, first)
	if err != nil || len(reviewed.Steps) == 0 {
		// Reviewer failed or returned empty — return the first pass rather than
		// blocking the export entirely.
		return first, nil
	}
	if len(reviewed.RequiredModels) == 0 {
		reviewed.RequiredModels = first.RequiredModels
	}
	return reviewed, nil
}

// reviewThermomixResult runs a focused second Gemini pass that audits the first-pass
// output for two classes of errors:
//  1. Ingredient refs not appearing verbatim in their step text (Cookidoo renders
//     refs as inline annotations, so the match must be exact).
//  2. Thermomix parameter rule violations (mode set + speed non-empty, or machine
//     action on an oven/rest/serve step).
//
// On any parse failure the caller falls back to the first-pass result.
func (g *GeminiClient) reviewThermomixResult(
	ctx context.Context,
	lang string,
	ingLines []string,
	first *ThermomixConversionResult,
) (*ThermomixConversionResult, error) {
	firstJSON, err := json.Marshal(first)
	if err != nil {
		return nil, fmt.Errorf("marshal first pass: %w", err)
	}

	reviewPrompt := fmt.Sprintf(`You are a senior Thermomix Cookidoo recipe quality reviewer.

A junior developer produced the Thermomix recipe JSON below. Your task is to audit and
correct it. Do NOT rewrite the recipe from scratch — only fix the specific issues listed.

OUTPUT LANGUAGE: %s — keep all text in %s.

━━━ WHAT TO FIX ━━━

1. INGREDIENT REFS (highest priority — Cookidoo breaks if these are wrong)
   Cookidoo highlights ingredient_refs as inline annotations inside the step text.
   The highlight only works when the ref string appears VERBATIM in "text".

   Rule: every string in "ingredient_refs" MUST be a substring of "text" (exact match,
   including quantity and unit if present).

   For each step:
   a) If an ingredient_ref does NOT appear verbatim in "text":
      - If the ingredient IS mentioned in text with different phrasing → rewrite the
        ref to match the exact phrasing used in "text".
      - If the ingredient is NOT mentioned in "text" at all → remove it from refs.
   b) If an ingredient from the master list is clearly used in the step but absent
      from ingredient_refs → rewrite "text" to include the exact ingredient string
      and add it to ingredient_refs.
   c) Empty ingredient_refs ([]) is correct for steps that use no new ingredients
      (e.g. "Cook for 10 minutes", "Transfer to a bowl").

2. PARAMETER RULE VIOLATIONS (fix only clear breaches)
   - mode is non-empty AND speed is non-empty → set speed to "".
   - Step is purely manual (oven, grill, serve, rest, refrigerate, plate, garnish)
     AND mode/speed/temp_celsius are non-empty → clear them all; set time_seconds to 0.

3. DO NOT CHANGE
   - Step order, step count, cooking logic, temperatures, times (unless rule 2 forces it).
   - The "ingredients" list at the top level.
   - "required_models".

━━━ MASTER INGREDIENT LIST ━━━
%s

━━━ FIRST-PASS JSON TO REVIEW ━━━
%s

Return ONLY the corrected JSON in exactly the same structure. No explanation, no markdown.`,
		lang, lang,
		strings.Join(ingLines, "\n"),
		string(firstJSON),
	)

	genModel := g.newThermomixModel()
	resp, err := withRetry(ctx, defaultRetryConfig, func() (*genai.GenerateContentResponse, error) {
		return genModel.GenerateContent(ctx, genai.Text(reviewPrompt))
	})
	if err != nil {
		return nil, fmt.Errorf("thermomix review failed: %w", err)
	}

	reviewed, err := parseGeminiJSON[ThermomixConversionResult](resp)
	if err != nil {
		return nil, fmt.Errorf("parse thermomix review: %w", err)
	}
	return reviewed, nil
}
