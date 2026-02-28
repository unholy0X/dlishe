package ai

import (
	"context"
	"encoding/json"
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
const thermomixCallTimeout = 100 * time.Second

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
	resp, err := withRetry(ctx, thermomixRetryConfig, func() (*genai.GenerateContentResponse, error) {
		callCtx, callCancel := context.WithTimeout(ctx, thermomixCallTimeout)
		defer callCancel()
		return genModel.GenerateContent(callCtx, genai.Text(convPrompt))
	})
	if err != nil {
		slog.Default().Error("thermomix: pass 1 (conversion) failed", "recipe_title", recipe.Title, "err", err)
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

	// ── Pass 2: expert review — fix refs, enhance parameters ─────────────────

	reviewed, err := g.reviewThermomixResult(ctx, lang, recipe, ingLines, stepLines, servings, totalMins, first)
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

// reviewThermomixResult is a second Gemini pass acting as a professional Thermomix TM6
// expert with full recipe context. It does two things:
//
//  1. FIX (non-negotiable): ingredient_refs verbatim matching and parameter rule violations.
//  2. ENHANCE (expert judgment): speed, temperature, time, and mode adjustments based on
//     real Thermomix TM6 best practices for this specific recipe — e.g. correct risotto
//     cooking time, proper chopping speed for the ingredient texture, right temperature
//     for delicate sauces. The expert uses the original recipe's full context to justify
//     each change.
//
// On any parse failure the caller falls back to the first-pass result.
func (g *GeminiClient) reviewThermomixResult(
	ctx context.Context,
	lang string,
	recipe *model.Recipe,
	ingLines []string,
	stepLines []string,
	servings int,
	totalMins int,
	first *ThermomixConversionResult,
) (*ThermomixConversionResult, error) {
	firstJSON, err := json.Marshal(first)
	if err != nil {
		return nil, fmt.Errorf("marshal first pass: %w", err)
	}

	reviewPrompt := fmt.Sprintf(`You are a certified professional Thermomix TM6 recipe developer with 10+ years of
Cookidoo publishing experience. You have just received a first-pass machine conversion
of the recipe below. Your job: review, correct, and enhance it to professional quality.

OUTPUT LANGUAGE: %s — all text must be in %s.

━━━ ORIGINAL RECIPE (your source of truth) ━━━

Title: %s
Servings: %d
Total time: %d minutes

INGREDIENTS:
%s

ORIGINAL STEPS:
%s

━━━ YOUR REVIEW TASKS ━━━

────────────────────────────────────────────
A. FIX — ingredient_refs (Cookidoo will break silently if wrong)
────────────────────────────────────────────
Cookidoo renders each ingredient_ref as an inline annotation inside the step text.
The annotation only activates when the ref string is an EXACT substring of "text".

For every step:
a) If an ingredient_ref does NOT appear verbatim in "text":
   - Ingredient IS mentioned in text with different phrasing → update the ref to match
     the exact wording in "text".
   - Ingredient is NOT mentioned in "text" at all → remove it from refs.
b) If an ingredient from the master list is clearly used in the step but missing from
   ingredient_refs → rewrite "text" to include the exact ingredient string verbatim,
   then add that string to ingredient_refs.
c) ingredient_refs: [] is correct when a step uses no new ingredients
   (e.g. "Cook for 20 minutes", "Remove and set aside").

────────────────────────────────────────────
B. FIX — parameter rule violations
────────────────────────────────────────────
- mode non-empty AND speed non-empty → clear speed to "".
- Purely manual step (oven, grill, rest, refrigerate, plate, garnish, serve) AND
  any of mode/speed/temp_celsius are non-empty → clear all three; set time_seconds 0.

────────────────────────────────────────────
C. ENHANCE — apply your TM6 expertise (use judgment, not rules)
────────────────────────────────────────────
Using the full recipe context above, enhance any step where the first pass is
technically correct but not optimal for real Thermomix cooking. Examples:

SPEED corrections:
- Chopping onions/garlic → speed 5 (not 7–8, which makes mush)
- Chopping harder veg (carrots, celery) → speed 6–7
- Rough chop for texture → speed 5, fine mince → speed 7–8 with shorter time
- Emulsifying a vinaigrette → speed 4 (butterfly), not speed 8

TEMPERATURE corrections:
- Softening onions without browning → 100°C not 120°C
- Custard / crème anglaise → 80°C (eggs curdle above 85°C)
- Béchamel → 90°C
- Caramel (TM6 only) → 130–160°C
- Chocolate melting → 50°C not 37°C (37°C is yeast activation temp)
- Gentle warming of cream/butter → 60°C

TIME corrections:
- Preserve the original recipe time unless you know from TM6 experience that the
  machine cooks it differently (e.g. Thermomix risotto: 20 min vs pan 30 min).
- Chopping bursts: 5 s for soft herbs, 10 s for onions, 3–5 s for turbo.
- Sautéing aromatics: 3–5 min typically sufficient in TM6 at 120°C.

MODE corrections:
- Use "blend" mode for soups/smoothies instead of speed 10 where appropriate
  (blend mode runs at the right speed profile for smooth results).
- Use "turbo" for a final finishing burst after a chop step, not as the only chop.
- Use "dough" for any bread/pasta/pastry kneading regardless of what pass 1 chose.
- Use "rice_cooker" for rice and grains — it manages the absorption automatically.

STEP TEXT quality:
- Instructions should be clear, professional Cookidoo style.
- Never append machine notation to text ("Vitesse 5", "100°C", etc.).
- Keep instructions concise but complete.

WHAT NOT TO CHANGE:
- Do not reorder or merge/split steps unless absolutely necessary.
- Do not change the top-level "ingredients" list.
- Do not change "required_models" unless a temp > 120°C step was added/removed.
- Do not invent steps that are not in the original recipe.

━━━ MASTER INGREDIENT LIST ━━━
%s

━━━ FIRST-PASS JSON TO REVIEW AND ENHANCE ━━━
%s

Return ONLY the final corrected+enhanced JSON. Same structure. No explanation, no markdown.`,
		lang, lang,
		recipe.Title, servings, totalMins,
		strings.Join(ingLines, "\n"),
		strings.Join(stepLines, "\n"),
		strings.Join(ingLines, "\n"),
		string(firstJSON),
	)

	genModel := g.newThermomixModel()
	resp, err := withRetry(ctx, thermomixRetryConfig, func() (*genai.GenerateContentResponse, error) {
		callCtx, callCancel := context.WithTimeout(ctx, thermomixCallTimeout)
		defer callCancel()
		return genModel.GenerateContent(callCtx, genai.Text(reviewPrompt))
	})
	if err != nil {
		slog.Default().Error("thermomix: pass 2 (review) failed", "recipe_title", recipe.Title, "err", err)
		return nil, fmt.Errorf("thermomix review failed: %w", err)
	}

	reviewed, err := parseGeminiJSON[ThermomixConversionResult](resp)
	if err != nil {
		return nil, fmt.Errorf("parse thermomix review: %w", err)
	}
	return reviewed, nil
}
