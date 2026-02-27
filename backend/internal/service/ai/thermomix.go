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

	prompt := fmt.Sprintf(`You are a certified Thermomix TM6/TM5 recipe developer for Cookidoo.
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

SPEED REFERENCE:
- "" (empty) = no machine action — manual step
- "0"        = Pétrin/Knead — dough only, never with heat
- "1"–"2"   = slow stir — cooking sauces, soups, sautéing
- "3"–"4"   = medium — emulsifying, butterfly whisk
- "5"–"7"   = chopping — vegetables, onions, herbs, meat
- "8"–"10"  = high speed — blending, puréeing, crushing ice
- Turbo burst: speed "10", time 1–3 s — final chop finish

TEMPERATURE REFERENCE:
- ""    = no heat
- "37"  = body temp (chocolate, yeast)
- "60"–"80"  = gentle (eggs, cream sauces, delicate)
- "90"–"100" = simmering (soups, rice, pasta sauces)
- "120" = sautéing max / Varoma steaming
- "130"–"160" = TM6 ONLY (caramel, sugar work)

OFFICIAL AUTOMODE PATTERNS (from Cookidoo):
- Pétrin (dough/knead): speed "0", no temp, time 60–240 s
- Turbo burst:          speed "10", no temp, time 1–3 s
- Blend (Mixage):       speed "6", no temp, time 60–90 s
- Warm up (Réchauffer): speed "1", temp "65", no fixed time
- Rice cooker:          speed "1", temp "100", time per recipe

━━━ REASONING RULES — APPLY TO EVERY STEP ━━━

For each original step, reason through three questions:

1. CAN this step be done inside the Thermomix bowl?
   - YES  → assign speed + time + temp from patterns above
   - NO   → set speed "", time_seconds 0, temp_celsius "" and write a clear manual instruction
   - PARTLY → output a Thermomix sub-step for the bowl part; manual step for the rest

2. WHICH pattern fits best?
   - Dry chopping       → speed 5–8, time 3–10 s, no heat
   - Sautéing           → speed 1–2, temp "120", time 3–8 min
   - Cooking/simmering  → speed 1, temp "90"–"100", time per recipe
   - Steaming (Varoma)  → speed 2, temp "120", time per recipe
   - Kneading           → speed "0", no temp, time 2–4 min
   - Blending/puréeing  → speed 8–10, no heat, time 30–60 s
   - Warming            → speed 1, temp "65"–"70"
   - Manual             → all empty

3. IS the time realistic?
   - Preserve the original cooking time — do not shorten arbitrarily
   - Convert minutes to seconds accurately (e.g. 20 min → 1200)
   - Short actions (chop, turbo) can be 3–10 s even if recipe doesn't specify

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
      "text": "step instruction in plain language — no speed/temp notation in the text",
      "speed": "5",
      "time_seconds": 5,
      "temp_celsius": "",
      "ingredient_refs": ["exact ingredient string as it appears in text"]
    }
  ],
  "required_models": ["TM6", "TM5"]
}

RULES:
- "text" = human-readable instruction only, never append "/ Speed X / Y°C"
- When a specific ingredient is used in a step, embed its exact formatted string
  (e.g. "200 g farine") verbatim in "text", and copy it into "ingredient_refs"
- required_models = ["TM6"] only when using temp > 120°C, Slow Cook, Sous-vide, Fermentation
- required_models = ["TM6", "TM5"] for everything else

EXAMPLES (in French for structure only — your output must be in %s):
{"text":"Hacher les 2 oignons et les 2 gousses d'ail.", "speed":"5", "time_seconds":5, "temp_celsius":"", "ingredient_refs":["2 oignons","2 gousses d'ail"]}
{"text":"Faire revenir les légumes sans le couvercle.", "speed":"1", "time_seconds":300, "temp_celsius":"120", "ingredient_refs":[]}
{"text":"Ajouter le bouillon et cuire.", "speed":"1", "time_seconds":1200, "temp_celsius":"100", "ingredient_refs":[]}
{"text":"Mixer jusqu'à consistance lisse.", "speed":"10", "time_seconds":30, "temp_celsius":"", "ingredient_refs":[]}
{"text":"Pétrir la pâte.", "speed":"0", "time_seconds":120, "temp_celsius":"", "ingredient_refs":[]}
{"text":"Cuire les légumes à la vapeur avec le Varoma.", "speed":"2", "time_seconds":1800, "temp_celsius":"120", "ingredient_refs":[]}
{"text":"Préchauffer le four à 180°C et enfourner 25 minutes.", "speed":"", "time_seconds":0, "temp_celsius":"", "ingredient_refs":[]}
{"text":"Dresser dans les assiettes et servir chaud.", "speed":"", "time_seconds":0, "temp_celsius":"", "ingredient_refs":[]}`,
		lang, lang,
		recipe.Title, servings, totalMins,
		strings.Join(ingLines, "\n"),
		strings.Join(stepLines, "\n"),
		lang,
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
