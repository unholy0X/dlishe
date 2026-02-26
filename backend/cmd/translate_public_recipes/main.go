// cmd/translate_public_recipes/main.go
//
// Standalone script that translates all public English recipes (including
// inspirator recipes) into every supported target language (Arabic, French)
// using the Gemini API.  The script is fully idempotent: it skips any
// (recipe, language) pair that already exists in the database.
//
// Usage:
//
//	GEMINI_API_KEY=... DATABASE_URL=postgres://... \
//	  go run ./cmd/translate_public_recipes
//
// Optional env vars:
//
//	GEMINI_MODEL   - model name (default: gemini-3-flash-preview)
//	TARGET_LANGS   - comma-separated ISO codes (default: ar,fr)
//	DRY_RUN=true   - run translation but do not write to DB
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"math/rand/v2"
	"os"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/api/option"
)

// ── Constants ─────────────────────────────────────────────────────────────────

const (
	defaultModel    = "gemini-3-flash-preview"
	maxRetries      = 2
	maxOutputTokens = 81920
	baseDelay       = 2 * time.Second
	maxDelay        = 60 * time.Second
)

// languageNames maps ISO 639-1 codes to the full names used in prompts.
var languageNames = map[string]string{
	"ar": "Arabic",
	"fr": "French",
}

// defaultTargetLangs is the default set of languages to translate into.
var defaultTargetLangs = []string{"ar", "fr"}

// ── Translation payload (sent to Gemini and expected back) ────────────────────

type ingredientPayload struct {
	Name           string   `json:"name"`
	Quantity       *float64 `json:"quantity,omitempty"`
	Unit           *string  `json:"unit,omitempty"`
	Category       string   `json:"category"`
	Section        string   `json:"section,omitempty"`
	IsOptional     bool     `json:"isOptional"`
	Notes          *string  `json:"notes,omitempty"`
	VideoTimestamp *int     `json:"videoTimestamp,omitempty"`
	SortOrder      int      `json:"sortOrder"`
}

type stepPayload struct {
	StepNumber          int     `json:"stepNumber"`
	Instruction         string  `json:"instruction"`
	DurationSeconds     *int    `json:"durationSeconds,omitempty"`
	Technique           *string `json:"technique,omitempty"`
	Temperature         *string `json:"temperature,omitempty"`
	VideoTimestampStart *int    `json:"videoTimestampStart,omitempty"`
	VideoTimestampEnd   *int    `json:"videoTimestampEnd,omitempty"`
}

type recipePayload struct {
	Title       string              `json:"title"`
	Description string              `json:"description,omitempty"`
	Servings    *int                `json:"servings,omitempty"`
	PrepTime    *int                `json:"prepTime,omitempty"`
	CookTime    *int                `json:"cookTime,omitempty"`
	Difficulty  string              `json:"difficulty,omitempty"`
	Cuisine     string              `json:"cuisine,omitempty"`
	Ingredients []ingredientPayload `json:"ingredients"`
	Steps       []stepPayload       `json:"steps"`
	Tags        []string            `json:"tags,omitempty"`
}

// ── DB row types (local structs — no dependency on internal/model) ────────────

type dbRecipe struct {
	ID                 uuid.UUID
	UserID             uuid.UUID
	Title              string
	Description        *string
	Servings           *int
	PrepTime           *int
	CookTime           *int
	Difficulty         *string
	Cuisine            *string
	ThumbnailURL       *string
	SourceURL          *string
	Tags               []string
	IsPublic           bool
	IsFeatured         bool
	ContentLanguage    string
	TranslationGroupID *uuid.UUID
	// Nutrition and DietaryInfo are factual — copied verbatim as JSON strings.
	NutritionStr   *string
	DietaryInfoStr *string
}

type dbIngredient struct {
	Name           string
	Quantity       *float64
	Unit           *string
	Category       string
	Section        *string
	IsOptional     bool
	Notes          *string
	VideoTimestamp *int
	SortOrder      int
}

type dbStep struct {
	StepNumber          int
	Instruction         string
	DurationSeconds     *int
	Technique           *string
	Temperature         *string
	VideoTimestampStart *int
	VideoTimestampEnd   *int
}

// ── Entry point ───────────────────────────────────────────────────────────────

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	if err := run(); err != nil {
		slog.Error("fatal error", "err", err)
		os.Exit(1)
	}
}

func run() error {
	ctx := context.Background()

	// ── Config ────────────────────────────────────────────────────────────────

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return errors.New("DATABASE_URL is not set")
	}
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return errors.New("GEMINI_API_KEY is not set")
	}
	modelName := os.Getenv("GEMINI_MODEL")
	if modelName == "" {
		modelName = defaultModel
	}
	dryRun := os.Getenv("DRY_RUN") == "true"
	if dryRun {
		slog.Info("DRY_RUN mode — translations will be generated but NOT written to the DB")
	}

	targetLangs := defaultTargetLangs
	if v := os.Getenv("TARGET_LANGS"); v != "" {
		targetLangs = strings.Split(v, ",")
		for i := range targetLangs {
			targetLangs[i] = strings.TrimSpace(targetLangs[i])
		}
	}

	// ── Database ──────────────────────────────────────────────────────────────

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		return fmt.Errorf("open DB pool: %w", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("ping DB: %w", err)
	}
	slog.Info("connected to database")

	// ── Gemini client ─────────────────────────────────────────────────────────

	geminiClient, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return fmt.Errorf("create Gemini client: %w", err)
	}
	defer geminiClient.Close()
	slog.Info("Gemini client ready", "model", modelName)

	// ── Load source recipes ───────────────────────────────────────────────────

	recipes, err := loadEnglishPublicRecipes(ctx, pool)
	if err != nil {
		return fmt.Errorf("load recipes: %w", err)
	}
	slog.Info("loaded English public recipes", "count", len(recipes))

	// ── Process each recipe ───────────────────────────────────────────────────

	var (
		totalSkipped  int
		totalInserted int
		totalFailed   int
	)

	for i, recipe := range recipes {
		log := slog.With(
			"progress", fmt.Sprintf("%d/%d", i+1, len(recipes)),
			"id", recipe.ID,
			"title", recipe.Title,
		)
		log.Info("processing recipe")

		// Ensure a translation_group_id exists on the English source recipe.
		groupID, err := ensureTranslationGroup(ctx, pool, &recipes[i], dryRun)
		if err != nil {
			log.Error("failed to ensure translation_group_id", "err", err)
			totalFailed++
			continue
		}

		// Hydrate full ingredients and steps once per source recipe.
		ingredients, err := loadIngredients(ctx, pool, recipe.ID)
		if err != nil {
			log.Error("failed to load ingredients", "err", err)
			totalFailed++
			continue
		}
		steps, err := loadSteps(ctx, pool, recipe.ID)
		if err != nil {
			log.Error("failed to load steps", "err", err)
			totalFailed++
			continue
		}

		// Build the Gemini payload from the hydrated recipe.
		payload := buildPayload(recipe, ingredients, steps)

		for _, lang := range targetLangs {
			langLog := log.With("lang", lang)

			langName, ok := languageNames[lang]
			if !ok {
				langLog.Warn("unknown target language — skipping")
				totalSkipped++
				continue
			}

			// Idempotency: skip if a translation already exists.
			exists, err := translationExists(ctx, pool, groupID, lang)
			if err != nil {
				langLog.Error("idempotency check failed", "err", err)
				totalFailed++
				continue
			}
			if exists {
				langLog.Info("translation already exists — skipping")
				totalSkipped++
				continue
			}

			// Call Gemini with retry / exponential backoff.
			translated, err := translateWithRetry(ctx, geminiClient, modelName, payload, langName)
			if err != nil {
				langLog.Error("translation failed after all retries", "err", err)
				totalFailed++
				continue
			}

			if dryRun {
				langLog.Info("DRY_RUN: would insert", "translatedTitle", translated.Title)
				totalInserted++
				continue
			}

			// Persist in a transaction; roll back automatically on any error.
			if err := insertTranslation(ctx, pool, recipe, groupID, lang, translated); err != nil {
				langLog.Error("insert failed", "err", err)
				totalFailed++
				continue
			}

			langLog.Info("inserted translation", "translatedTitle", translated.Title)
			totalInserted++
		}
	}

	slog.Info("finished",
		"source_recipes", len(recipes),
		"inserted", totalInserted,
		"skipped", totalSkipped,
		"failed", totalFailed,
	)
	return nil
}

// ── Database helpers ──────────────────────────────────────────────────────────

// loadEnglishPublicRecipes returns all English-language recipes that should be
// translated: admin-seeded public recipes (is_public = TRUE) and inspirator
// "Get Inspired" recipes (is_featured = TRUE).
func loadEnglishPublicRecipes(ctx context.Context, pool *pgxpool.Pool) ([]dbRecipe, error) {
	const q = `
		SELECT
			id, user_id, title, description, servings, prep_time, cook_time,
			difficulty, cuisine, thumbnail_url, source_url, tags,
			is_public, is_featured, content_language, translation_group_id,
			nutrition::text,
			dietary_info::text
		FROM recipes
		WHERE (is_public = TRUE OR is_featured = TRUE)
		  AND (content_language = 'en' OR content_language = '')
		  AND deleted_at IS NULL
		ORDER BY created_at ASC
	`
	rows, err := pool.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	var out []dbRecipe
	for rows.Next() {
		var r dbRecipe
		if err := rows.Scan(
			&r.ID, &r.UserID, &r.Title, &r.Description, &r.Servings,
			&r.PrepTime, &r.CookTime, &r.Difficulty, &r.Cuisine,
			&r.ThumbnailURL, &r.SourceURL, &r.Tags,
			&r.IsPublic, &r.IsFeatured, &r.ContentLanguage, &r.TranslationGroupID,
			&r.NutritionStr, &r.DietaryInfoStr,
		); err != nil {
			return nil, fmt.Errorf("scan recipe row: %w", err)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// ensureTranslationGroup assigns a new translation_group_id to the English
// source recipe if it does not already have one.  It updates the DB row and
// the in-memory struct so subsequent calls see the new value.
func ensureTranslationGroup(ctx context.Context, pool *pgxpool.Pool, r *dbRecipe, dryRun bool) (uuid.UUID, error) {
	if r.TranslationGroupID != nil {
		return *r.TranslationGroupID, nil
	}

	groupID := uuid.New()

	if dryRun {
		slog.Info("DRY_RUN: would assign translation_group_id",
			"id", r.ID, "groupID", groupID)
		r.TranslationGroupID = &groupID
		return groupID, nil
	}

	const q = `UPDATE recipes SET translation_group_id = $1 WHERE id = $2`
	if _, err := pool.Exec(ctx, q, groupID, r.ID); err != nil {
		return uuid.Nil, fmt.Errorf("assign translation_group_id: %w", err)
	}

	r.TranslationGroupID = &groupID
	slog.Info("assigned translation_group_id", "id", r.ID, "groupID", groupID)
	return groupID, nil
}

// translationExists returns true when a non-deleted recipe with the given
// translation_group_id and content_language already exists in the DB.
func translationExists(ctx context.Context, pool *pgxpool.Pool, groupID uuid.UUID, lang string) (bool, error) {
	const q = `
		SELECT 1 FROM recipes
		WHERE translation_group_id = $1
		  AND content_language = $2
		  AND deleted_at IS NULL
		LIMIT 1
	`
	var dummy int
	err := pool.QueryRow(ctx, q, groupID, lang).Scan(&dummy)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

// loadIngredients returns all ingredients for the given recipe, sorted by
// sort_order then id for deterministic ordering.
func loadIngredients(ctx context.Context, pool *pgxpool.Pool, recipeID uuid.UUID) ([]dbIngredient, error) {
	const q = `
		SELECT name, quantity, unit, category, section,
		       is_optional, notes, video_timestamp, sort_order
		FROM recipe_ingredients
		WHERE recipe_id = $1
		ORDER BY sort_order ASC, id ASC
	`
	rows, err := pool.Query(ctx, q, recipeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []dbIngredient
	for rows.Next() {
		var ing dbIngredient
		if err := rows.Scan(
			&ing.Name, &ing.Quantity, &ing.Unit, &ing.Category, &ing.Section,
			&ing.IsOptional, &ing.Notes, &ing.VideoTimestamp, &ing.SortOrder,
		); err != nil {
			return nil, fmt.Errorf("scan ingredient: %w", err)
		}
		out = append(out, ing)
	}
	return out, rows.Err()
}

// loadSteps returns all steps for the given recipe, sorted by step_number.
func loadSteps(ctx context.Context, pool *pgxpool.Pool, recipeID uuid.UUID) ([]dbStep, error) {
	const q = `
		SELECT step_number, instruction, duration_seconds,
		       technique, temperature, video_timestamp_start, video_timestamp_end
		FROM recipe_steps
		WHERE recipe_id = $1
		ORDER BY step_number ASC
	`
	rows, err := pool.Query(ctx, q, recipeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []dbStep
	for rows.Next() {
		var s dbStep
		if err := rows.Scan(
			&s.StepNumber, &s.Instruction, &s.DurationSeconds,
			&s.Technique, &s.Temperature,
			&s.VideoTimestampStart, &s.VideoTimestampEnd,
		); err != nil {
			return nil, fmt.Errorf("scan step: %w", err)
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// ── Payload builder ───────────────────────────────────────────────────────────

// buildPayload converts the hydrated DB rows into the JSON structure that is
// sent to Gemini for translation.
func buildPayload(r dbRecipe, ingredients []dbIngredient, steps []dbStep) recipePayload {
	p := recipePayload{
		Title:    r.Title,
		Servings: r.Servings,
		PrepTime: r.PrepTime,
		CookTime: r.CookTime,
		Tags:     r.Tags,
	}
	if r.Description != nil {
		p.Description = *r.Description
	}
	if r.Difficulty != nil {
		p.Difficulty = *r.Difficulty
	}
	if r.Cuisine != nil {
		p.Cuisine = *r.Cuisine
	}

	for _, ing := range ingredients {
		ip := ingredientPayload{
			Name:           ing.Name,
			Quantity:       ing.Quantity,
			Unit:           ing.Unit,
			Category:       ing.Category,
			IsOptional:     ing.IsOptional,
			Notes:          ing.Notes,
			VideoTimestamp: ing.VideoTimestamp,
			SortOrder:      ing.SortOrder,
		}
		if ing.Section != nil {
			ip.Section = *ing.Section
		}
		p.Ingredients = append(p.Ingredients, ip)
	}

	for _, s := range steps {
		p.Steps = append(p.Steps, stepPayload{
			StepNumber:          s.StepNumber,
			Instruction:         s.Instruction,
			DurationSeconds:     s.DurationSeconds,
			Technique:           s.Technique,
			Temperature:         s.Temperature,
			VideoTimestampStart: s.VideoTimestampStart,
			VideoTimestampEnd:   s.VideoTimestampEnd,
		})
	}

	return p
}

// ── Gemini translation ────────────────────────────────────────────────────────

// translateWithRetry calls Gemini to translate the payload into langName,
// retrying up to maxRetries times with exponential backoff on transient errors.
// It also validates that the returned ingredient/step counts match the source
// so we never silently truncate a recipe.
func translateWithRetry(
	ctx context.Context,
	client *genai.Client,
	modelName string,
	payload recipePayload,
	langName string,
) (*recipePayload, error) {
	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal payload: %w", err)
	}

	model := client.GenerativeModel(modelName)
	model.ResponseMIMEType = "application/json"
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(buildSystemPrompt(langName))},
	}
	model.GenerationConfig.SetTemperature(0.1)                 // low temperature for accuracy
	model.GenerationConfig.SetMaxOutputTokens(maxOutputTokens) // prevent silent truncation

	prompt := fmt.Sprintf(
		"Translate the following recipe JSON into %s. Return only the translated JSON object:\n\n%s",
		langName, string(payloadJSON),
	)

	var lastErr error
	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			delay := backoffDelay(attempt)
			slog.Info("retrying Gemini call",
				"attempt", attempt,
				"maxRetries", maxRetries,
				"delay", delay.String(),
				"lang", langName,
			)
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(delay):
			}
		}

		resp, err := model.GenerateContent(ctx, genai.Text(prompt))
		if err != nil {
			lastErr = err
			if !isRetryable(err) {
				return nil, fmt.Errorf("non-retryable Gemini error: %w", err)
			}
			slog.Warn("retryable Gemini error", "attempt", attempt, "err", err)
			continue
		}

		translated, err := parseTranslationResponse(resp)
		if err != nil {
			lastErr = err
			slog.Warn("failed to parse Gemini response", "attempt", attempt, "err", err)
			// Max tokens is structural — one retry is worth trying (model output is
			// non-deterministic) but further retries are pointless.
			if strings.Contains(err.Error(), "max tokens exceeded") && attempt >= 1 {
				break
			}
			continue
		}

		// Guard: ingredient and step counts must be identical to the source.
		if len(translated.Ingredients) != len(payload.Ingredients) {
			lastErr = fmt.Errorf("ingredient count mismatch: got %d, want %d",
				len(translated.Ingredients), len(payload.Ingredients))
			slog.Warn("count mismatch — retrying", "attempt", attempt, "err", lastErr)
			continue
		}
		if len(translated.Steps) != len(payload.Steps) {
			lastErr = fmt.Errorf("step count mismatch: got %d, want %d",
				len(translated.Steps), len(payload.Steps))
			slog.Warn("count mismatch — retrying", "attempt", attempt, "err", lastErr)
			continue
		}
		if strings.TrimSpace(translated.Title) == "" {
			lastErr = fmt.Errorf("empty title in translation response")
			slog.Warn("empty title — retrying", "attempt", attempt)
			continue
		}

		return translated, nil
	}

	return nil, fmt.Errorf("all %d attempts failed; last error: %w", maxRetries+1, lastErr)
}

// buildSystemPrompt returns the system instruction sent to Gemini.
func buildSystemPrompt(langName string) string {
	return fmt.Sprintf(`You are an expert chef translator specialising in culinary content.

Translate the provided recipe JSON payload into %s.

STRICT RULES:
1. Maintain the EXACT same JSON keys, array lengths, and data types — only translate string values.
2. Translate: title, description, ingredient names, ingredient notes, step instructions, step techniques, tags, difficulty.
3. Do NOT translate standard unit symbols (g, ml, kg, tbsp, tsp, °C, °F, L). DO translate full words like "cups", "tablespoons", "teaspoons", "pounds", "ounces" into their %s equivalents.
4. Keep cuisine names in their internationally recognised form (e.g. "Italian", "French") or use the accepted %s name for that cuisine.
5. Do NOT change: numeric values, boolean values, null values, sort_order, step_number, timestamp fields.
6. Temperature strings (e.g. "180°C", "350°F"): preserve the number and symbol; only translate surrounding prose if any.
7. Return ONLY the JSON object — no markdown fences, no explanatory text, no code blocks.`, langName, langName, langName)
}

// parseTranslationResponse extracts and unmarshals the recipe payload from a
// Gemini GenerateContentResponse.
func parseTranslationResponse(resp *genai.GenerateContentResponse) (*recipePayload, error) {
	if resp == nil || len(resp.Candidates) == 0 {
		return nil, errors.New("empty Gemini response — no candidates")
	}
	candidate := resp.Candidates[0]
	switch candidate.FinishReason {
	case genai.FinishReasonSafety:
		return nil, errors.New("Gemini blocked response: safety filter")
	case genai.FinishReasonRecitation:
		return nil, errors.New("Gemini blocked response: recitation policy")
	case genai.FinishReasonMaxTokens:
		return nil, errors.New("Gemini response truncated: max tokens exceeded (recipe may be incomplete)")
	}
	if candidate.Content == nil {
		return nil, fmt.Errorf("nil content in Gemini candidate (finishReason=%v)", candidate.FinishReason)
	}

	for _, part := range candidate.Content.Parts {
		txt, ok := part.(genai.Text)
		if !ok {
			continue
		}
		raw := strings.TrimSpace(string(txt))

		// Strip accidental markdown code fences that slip through even with
		// ResponseMIMEType = "application/json".
		if strings.HasPrefix(raw, "```") {
			raw = strings.TrimPrefix(raw, "```json")
			raw = strings.TrimPrefix(raw, "```")
			raw = strings.TrimSuffix(raw, "```")
			raw = strings.TrimSpace(raw)
		}

		var p recipePayload
		if err := json.Unmarshal([]byte(raw), &p); err != nil {
			return nil, fmt.Errorf("unmarshal translation JSON: %w (raw excerpt: %.300s)", err, raw)
		}
		return &p, nil
	}

	return nil, errors.New("no text part found in Gemini response")
}

// isRetryable returns true for transient Gemini / network errors that are safe
// to retry (rate limits, service unavailability, timeouts).
func isRetryable(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "429") ||
		strings.Contains(msg, "503") ||
		strings.Contains(msg, "resource_exhausted") ||
		strings.Contains(msg, "unavailable") ||
		strings.Contains(msg, "deadline exceeded") ||
		strings.Contains(msg, "connection reset") ||
		strings.Contains(msg, "too many requests") ||
		strings.Contains(msg, "internal error")
}

// backoffDelay returns the wait duration for the given retry attempt using
// full-jitter exponential backoff (±20% of the base exponential delay),
// capped at maxDelay.
func backoffDelay(attempt int) time.Duration {
	exp := math.Pow(2, float64(attempt-1))
	base := time.Duration(float64(baseDelay) * exp)
	if base > maxDelay {
		base = maxDelay
	}
	// Add ±20 % jitter so concurrent workers don't thunderherd.
	jitter := time.Duration(float64(base) * 0.4 * (rand.Float64() - 0.5))
	return base + jitter
}

// ── Insertion ─────────────────────────────────────────────────────────────────

// insertTranslation wraps the insertion of a translated recipe (plus its
// ingredients and steps) in a single DB transaction.  If any INSERT fails the
// entire transaction is rolled back — no partial rows are ever left behind.
func insertTranslation(
	ctx context.Context,
	pool *pgxpool.Pool,
	source dbRecipe,
	groupID uuid.UUID,
	lang string,
	translated *recipePayload,
) (retErr error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	// Rollback is a no-op on an already-committed transaction.
	defer func() {
		if retErr != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	newID := uuid.New()
	now := time.Now().UTC()

	// ── Nullable scalar fields ───────────────────────────────────────────────

	var description *string
	if translated.Description != "" {
		description = &translated.Description
	}
	var difficulty *string
	if translated.Difficulty != "" {
		difficulty = &translated.Difficulty
	}
	var cuisine *string
	if translated.Cuisine != "" {
		cuisine = &translated.Cuisine
	}

	// ── Nutrition and DietaryInfo: factual data copied verbatim ─────────────
	// These values are language-independent (numbers and booleans) so we copy
	// the raw JSON text from the source row and recast it to JSONB on insert.
	var nutritionArg interface{}
	if source.NutritionStr != nil && *source.NutritionStr != "" && *source.NutritionStr != "null" {
		nutritionArg = *source.NutritionStr
	}
	var dietaryArg interface{}
	if source.DietaryInfoStr != nil && *source.DietaryInfoStr != "" && *source.DietaryInfoStr != "null" {
		dietaryArg = *source.DietaryInfoStr
	}

	// ── Insert translated recipe ─────────────────────────────────────────────
	const insertRecipeSQL = `
		INSERT INTO recipes (
			id, user_id,
			title, description, servings, prep_time, cook_time,
			difficulty, cuisine,
			thumbnail_url, source_type, source_url, source_recipe_id,
			tags, is_public, is_featured, is_favorite,
			content_language, translation_group_id,
			nutrition, dietary_info,
			sync_version, created_at, updated_at
		) VALUES (
			$1,  $2,
			$3,  $4,  $5,  $6,  $7,
			$8,  $9,
			$10, $11, $12, $13,
			$14, $15, $16, $17,
			$18, $19,
			$20::jsonb, $21::jsonb,
			1, $22, $22
		)
	`
	if _, err = tx.Exec(ctx, insertRecipeSQL,
		newID, source.UserID,
		translated.Title, description, translated.Servings, translated.PrepTime, translated.CookTime,
		difficulty, cuisine,
		source.ThumbnailURL, "translation", source.SourceURL, source.ID,
		translated.Tags, source.IsPublic, source.IsFeatured, false,
		lang, groupID,
		nutritionArg, dietaryArg,
		now,
	); err != nil {
		return fmt.Errorf("insert recipe row: %w", err)
	}

	// ── Insert translated ingredients ────────────────────────────────────────
	const insertIngredientSQL = `
		INSERT INTO recipe_ingredients (
			id, recipe_id, name, quantity, unit,
			category, section, is_optional, notes,
			video_timestamp, sort_order, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	for idx, ing := range translated.Ingredients {
		var section *string
		if ing.Section != "" {
			section = &ing.Section
		}
		if _, err = tx.Exec(ctx, insertIngredientSQL,
			uuid.New(), newID, ing.Name, ing.Quantity, ing.Unit,
			ing.Category, section, ing.IsOptional, ing.Notes,
			ing.VideoTimestamp, ing.SortOrder, now,
		); err != nil {
			return fmt.Errorf("insert ingredient[%d] %q: %w", idx, ing.Name, err)
		}
	}

	// ── Insert translated steps ──────────────────────────────────────────────
	const insertStepSQL = `
		INSERT INTO recipe_steps (
			id, recipe_id, step_number, instruction,
			duration_seconds, technique, temperature,
			video_timestamp_start, video_timestamp_end,
			created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	for _, step := range translated.Steps {
		if _, err = tx.Exec(ctx, insertStepSQL,
			uuid.New(), newID, step.StepNumber, step.Instruction,
			step.DurationSeconds, step.Technique, step.Temperature,
			step.VideoTimestampStart, step.VideoTimestampEnd,
			now,
		); err != nil {
			return fmt.Errorf("insert step %d: %w", step.StepNumber, err)
		}
	}

	// ── Commit ───────────────────────────────────────────────────────────────
	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}
