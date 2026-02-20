# Backend i18n Wiring — Implementation Plan

**Branch:** `feature/i18n-multilingual-support`
**Date:** 2026-02-20
**Status:** Ready to implement

---

## Two-Track Architecture

There are two fundamentally different recipe flows, each with different language storage strategies:

```
┌──────────────────────────────────────────────────────────────────────┐
│  TRACK A — Admin / Inspirator (public recipes)                       │
│                                                                      │
│  Admin creates master recipe (EN)                                    │
│       │                                                              │
│       └─► Backend auto-translates via Gemini                         │
│               ├─► French  version → saved as row, content_lang="fr" │
│               └─► Arabic  version → saved as row, content_lang="ar" │
│                                                                      │
│  All 3 rows share the same translation_group_id                      │
│                                                                      │
│  GET /recipes/suggested?lang=fr  →  returns the French row only      │
│  GET /recipes/featured?lang=ar   →  returns the Arabic row only      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  TRACK B — Regular user (private extraction)                         │
│                                                                      │
│  User selects "fr" in app                                            │
│       │                                                              │
│       └─► Extracts recipe → Gemini runs in French                    │
│               └─► ONE row saved, content_lang="fr"                   │
│                                                                      │
│  No translation_group_id, no multi-version storage                   │
│  Only the user who extracted it sees this recipe                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

```
Phase 1  — DB Migration (run first, everything depends on new columns)
Phase 2  — Language code→name mapping fn (Gemini service utility)
Phase 3  — User model + preferences handler + repo (preferred_language)
Phase 4  — Language resolution in extraction handler (Track B)
Phase 5  — Wire language into all Gemini extraction methods (Track B)
Phase 6  — Save content_language on every recipe insert (Track B)
Phase 7  — Mobile: send real language code in extraction + pantry + shopping
Phase 8  — Mobile: sync language preference to backend on change + launch
Phase 9  — Gemini TranslateRecipe method (Track A only)
Phase 10 — Admin translation endpoint + translation worker (Track A only)
Phase 11 — Public recipe endpoints accept lang query param (Track A only)
Phase 12 — Mobile: pass lang when fetching public/suggested/featured recipes
```

Phases 1–8 cover Track B (regular users) fully.
Phases 9–12 layer on Track A (admin/inspirator multi-language).

---

## Phase 1 — DB Migration

> **Before creating this file**, check `backend/migrations/` to confirm the next available number. The instructions below use `000020` but increment if needed.

**File:** `backend/migrations/000020_add_language_columns.up.sql`

```sql
-- User's preferred content language for extraction fallback
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) NOT NULL DEFAULT 'en';

-- Language the recipe content is written in (set on every insert)
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS content_language VARCHAR(10) NOT NULL DEFAULT 'en';

-- Groups the EN + FR + AR versions of the same public recipe together.
-- NULL for all regular user recipes (Track B).
ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS translation_group_id UUID DEFAULT NULL;

-- Index: fetch all translations of a public recipe by group
CREATE INDEX IF NOT EXISTS idx_recipes_translation_group
  ON recipes (translation_group_id)
  WHERE translation_group_id IS NOT NULL;

-- Index: fetch public recipes by language efficiently
CREATE INDEX IF NOT EXISTS idx_recipes_public_lang
  ON recipes (content_language, is_public, deleted_at)
  WHERE is_public = TRUE AND deleted_at IS NULL;
```

**File:** `backend/migrations/000020_add_language_columns.down.sql`

```sql
DROP INDEX IF EXISTS idx_recipes_public_lang;
DROP INDEX IF EXISTS idx_recipes_translation_group;
ALTER TABLE recipes DROP COLUMN IF EXISTS translation_group_id;
ALTER TABLE recipes DROP COLUMN IF EXISTS content_language;
ALTER TABLE users   DROP COLUMN IF EXISTS preferred_language;
```

---

## Phase 2 — Language Code Mapping (Gemini Service Utility)

All Gemini prompts use full English language names. Add one central exported mapping in the AI package so other packages (handler, future services) can use it without redefining it.

**File:** `backend/internal/service/ai/gemini.go` (after constants block, ~line 259)

```go
// languageNames maps ISO 639-1 codes to the full name used in Gemini prompts.
// "auto" tells Gemini to detect language from the source content.
var languageNames = map[string]string{
    "en":   "English",
    "fr":   "French",
    "ar":   "Arabic",
    "es":   "Spanish",
    "de":   "German",
    "it":   "Italian",
    "pt":   "Portuguese",
    "zh":   "Chinese",
    "ja":   "Japanese",
    "ko":   "Korean",
    "auto": "auto",
}

// ResolveLanguageName converts an ISO 639-1 code to the full English name
// used in Gemini prompts. Exported so the handler package can call it.
// Falls back to "English" for unrecognised codes.
func ResolveLanguageName(code string) string {
    if name, ok := languageNames[code]; ok {
        return name
    }
    return "English"
}
```

> **Note:** The function is exported (capital R) so the handler package can call `ai.ResolveLanguageName(code)`. All references in Phase 4 and Phase 5 use this form.

---

## Phase 3 — User Model + Preferences

### 3a. User model

**File:** `backend/internal/model/user.go`

```go
type UserPreferences struct {
    PreferredUnitSystem string `json:"preferred_unit_system" db:"preferred_unit_system"`
    PreferredLanguage   string `json:"preferred_language"    db:"preferred_language"`   // ADD
}
```

### 3b. Preferences handler

**File:** `backend/internal/handler/user.go`

In the request struct:

```go
type UpdatePreferencesRequest struct {
    PreferredUnitSystem string `json:"preferred_unit_system"`
    PreferredLanguage   string `json:"preferred_language"`   // ADD
}
```

Validate before persisting:

```go
if req.PreferredLanguage != "" {
    validLangs := map[string]bool{"en": true, "fr": true, "ar": true}
    if !validLangs[req.PreferredLanguage] {
        response.BadRequest(w, "unsupported language code")
        return
    }
}
```

### 3c. Repository — update query

**File:** `backend/internal/repository/postgres/user.go`

Update the existing preferences UPDATE query to include the new column:

```sql
UPDATE users
   SET preferred_unit_system = COALESCE(NULLIF($2, ''), preferred_unit_system),
       preferred_language     = COALESCE(NULLIF($3, ''), preferred_language),
       updated_at             = NOW()
 WHERE id = $1
```

### 3d. Repository — GetPreferences method

**File:** `backend/internal/repository/postgres/user.go`

If a `GetPreferences` method does not already exist, create it:

```go
func (r *UserRepository) GetPreferences(ctx context.Context, userID uuid.UUID) (model.UserPreferences, error) {
    var prefs model.UserPreferences
    err := r.db.QueryRow(ctx,
        `SELECT preferred_unit_system, preferred_language
           FROM users
          WHERE id = $1 AND deleted_at IS NULL`,
        userID,
    ).Scan(&prefs.PreferredUnitSystem, &prefs.PreferredLanguage)
    return prefs, err
}
```

Also add `preferred_language` to every other `SELECT` that already scans user preferences into `UserPreferences`.

---

## Phase 4 — Language Resolution in Extraction Handler (Track B)

**File:** `backend/internal/handler/unified_extraction.go`

### 4a. Add LanguageCode to ExtractionRequest

`ExtractionRequest` is defined in `backend/internal/model/job.go` (or wherever it currently lives — search for `type ExtractionRequest struct`). Add one field:

```go
type ExtractionRequest struct {
    // ... existing fields including Language string ...
    LanguageCode string // raw ISO code e.g. "fr", set by the handler after resolution
}
```

### 4b. Resolution logic

After parsing `language` from the request body (~lines 232–310), add:

```go
// Resolve effective language.
//   Priority: explicit request param → user's stored preference → "en"
effectiveLangCode := req.Language
if effectiveLangCode == "" || effectiveLangCode == "auto" {
    userPrefs, err := h.userRepo.GetPreferences(ctx, userID)
    if err == nil && userPrefs.PreferredLanguage != "" {
        effectiveLangCode = userPrefs.PreferredLanguage
    } else {
        effectiveLangCode = "en"
    }
}
req.LanguageCode = effectiveLangCode                    // ISO code stored in DB
req.Language     = ai.ResolveLanguageName(effectiveLangCode) // full name for Gemini
```

### 4c. Propagate ISO code into the job before spawning the goroutine

Wherever the handler sets fields on the `extractionJob` struct before calling `go processJob(...)`, add:

```go
job.Language = req.LanguageCode  // store ISO code e.g. "fr", not the full name
```

This overwrites whatever raw value arrived from the client (previously could be "auto").

---

## Phase 5 — Wire Language Into All Gemini Extraction Methods

### 5a. `RefineRecipe` — HIGHEST PRIORITY (runs on every extraction)

**File:** `backend/internal/service/ai/gemini.go`, `RefineRecipe` method (~line 576)

Prepend these lines at the very top of the existing prompt string (before any existing rules):

```go
prompt := fmt.Sprintf(`You are an expert chef. Refine the following recipe JSON.

Target Language: %s
CRITICAL: The entire output — title, description, ingredient names,
step instructions, tags — MUST be written in %s.
Do NOT switch to any other language under any circumstances.

Rules:
- Standardise ingredient names and units
...`, req.Language, req.Language)
```

> Without this fix, `RefineRecipe` silently translates everything back to English regardless of what language the extraction step produced. This is the single most impactful change in the whole plan.

### 5b. `ScanPantryMulti` — currently returns English names

**File:** `backend/internal/service/ai/gemini.go`, `ScanPantryMulti` method (~line 904)

Add `Language string` to `PantryMultiRequest` (search for `type PantryMultiRequest struct`). Prepend to the existing prompt:

```go
prompt := fmt.Sprintf(`Identify all food items in the image(s).

Target Language: %s
Return food item names in %s.

CRITICAL: The "category" field must ALWAYS be one of these exact English codes,
regardless of the target language:
dairy | produce | proteins | bakery | pantry | spices | condiments |
beverages | snacks | frozen | household | other
Only translate "name". Never translate "category".

Return JSON: {"items": [{"name":"...","category":"...","quantity":...,"confidence":0.0}]}
...`, req.Language, req.Language)
```

### 5c. `SmartMergeItems` — currently returns English names

**File:** `backend/internal/service/ai/gemini.go`, `SmartMergeItems` method (~line 692)

Add `Language string` to the merge request struct (search for its `type` definition). Prepend to the existing prompt:

```go
prompt := fmt.Sprintf(`You are a smart shopping assistant.

Target Language: %s
All merged item names must be in %s.

CRITICAL: The "category" field must remain one of these exact English codes:
dairy | produce | proteins | bakery | pantry | spices | condiments |
beverages | snacks | frozen | household | other

Merge and deduplicate:
<input_list>%s</input_list>
...`, req.Language, req.Language, itemsXML)
```

### 5d. `EnrichRecipe` — allergens and meal type labels are user-visible

**File:** `backend/internal/service/ai/gemini.go`, `EnrichRecipe` method (~line 1000)

Numeric macros and boolean flags are language-neutral. Only `allergens[]` and `mealTypes[]` strings are user-visible. Prepend to the existing prompt:

```go
fmt.Sprintf("Target Language for allergen names and meal type labels: %s\n", req.Language)
```

### 5e. Already handled

`ExtractRecipe`, `ExtractFromWebpage`, `ExtractFromImages` already have `Target Language: %s` in their prompts. No prompt change needed — Phase 4 ensures they receive the resolved full name via `req.Language`.

---

## Phase 6 — Save `content_language` on Every Recipe Insert

### 6a. Recipe model

**File:** `backend/internal/model/recipe.go`

```go
type Recipe struct {
    // ... existing fields ...
    ContentLanguage    string     `json:"content_language"     db:"content_language"`
    TranslationGroupID *uuid.UUID `json:"translation_group_id" db:"translation_group_id"` // nil for Track B
}
```

### 6b. Extraction save function

**File:** `backend/internal/handler/unified_extraction.go`, `saveExtractedRecipe` function

Add `content_language` and `translation_group_id` to the INSERT:

```go
_, err = h.db.Exec(ctx, `
    INSERT INTO recipes (
        id, user_id, title, description, servings,
        prep_time, cook_time, difficulty, cuisine,
        source_type, source_url, tags,
        content_language,
        translation_group_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    recipe.ID, userID, recipe.Title, recipe.Description, recipe.Servings,
    recipe.PrepTime, recipe.CookTime, recipe.Difficulty, recipe.Cuisine,
    job.SourceType, job.SourceURL, pq.Array(recipe.Tags),
    job.Language, // ISO code set in Phase 4c, e.g. "fr"
    nil,          // always nil for regular user extractions (Track B)
)
```

### 6c. Clone handler

**File:** wherever `POST /recipes/{id}/save` is handled

When inserting the cloned row, copy `content_language` from the source recipe. Do **not** copy `translation_group_id` — a cloned recipe is private and has no multi-language semantics.

---

## Phase 7 — Mobile: Send Actual Language in All API Calls

### 7a. Extraction

**File:** `mobile/services/extract.js`

```js
import { useLanguageStore } from "../store/languageStore";

export async function extractRecipeFromUrl({ url, getToken }) {
  const language = useLanguageStore.getState().language; // "en" | "fr" | "ar"
  return authFetch("/recipes/extract", getToken, {
    method: "POST",
    body: JSON.stringify({ url, saveAuto: true, detailLevel: "detailed", language }),
  });
}

export async function extractRecipeFromImages({ images, getToken }) {
  const language = useLanguageStore.getState().language;
  return authFetch("/recipes/extract", getToken, {
    method: "POST",
    body: JSON.stringify({
      type: "image",
      images: images.map((img) => ({ base64: img.base64, mimeType: img.mimeType || "image/jpeg" })),
      saveAuto: true,
      detailLevel: "detailed",
      language,          // was hardcoded "auto"
    }),
    timeout: 120000,
  });
}
```

> Use `useLanguageStore.getState()` (non-hook form) — service files are not React components and cannot use hooks.

### 7b. Pantry scan

**File:** `mobile/services/pantry.js`

Find the function that calls `POST /pantry/scan-multi` and add `language`:

```js
export async function scanPantry({ images, getToken }) {
  const language = useLanguageStore.getState().language;
  return authFetch("/pantry/scan-multi", getToken, {
    method: "POST",
    body: JSON.stringify({ images, language }),
  });
}
```

### 7c. Shopping list smart merge

**File:** `mobile/services/shopping.js`

Find the function that calls the smart-merge endpoint and add `language`:

```js
export async function smartMergeList({ listId, getToken }) {
  const language = useLanguageStore.getState().language;
  return authFetch(`/shopping/lists/${listId}/smart-merge`, getToken, {
    method: "POST",
    body: JSON.stringify({ language }),
  });
}
```

---

## Phase 8 — Mobile: Sync Language to Backend

### 8a. On language change

**File:** `mobile/store/languageStore.js`

The Zustand store cannot use React hooks, so it cannot call `useAuth()` to get a token. Pass `getToken` as a parameter to `setLanguage` from the calling component.

Update the `setLanguage` signature in the store:

```js
setLanguage: async (lang, getToken) => {
  set({ language: lang, isRTL: lang === "ar" });
  await SecureStore.setItemAsync("dlishe_language", lang);

  // Sync to backend — so extraction fallback uses the right language
  // getToken is passed in by the calling component via useAuth()
  if (getToken) {
    try {
      await updatePreferences({ preferred_language: lang }, getToken);
    } catch (e) {
      // Non-fatal. The explicit language param in each request is the primary signal.
    }
  }

  if (lang === "ar") {
    I18nManager.forceRTL(true);
    await Updates.reloadAsync();
  } else {
    I18nManager.forceRTL(false);
  }
},
```

Update every call site that calls `setLanguage(lang)` to pass `getToken`:

```js
// In any component that renders the language picker:
const { getToken } = useAuth(); // from @clerk/clerk-expo
// ...
onPress={() => languageStore.setLanguage(lang, getToken)}
```

**File:** `mobile/services/user.js`

Add if not already present:

```js
export async function updatePreferences(prefs, getToken) {
  return authFetch("/users/me/preferences", getToken, {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
}
```

### 8b. On app launch (cold start sync)

**File:** `mobile/app/_layout.jsx` (or wherever auth initialisation happens)

```js
// At the top of the component:
const { isSignedIn, getToken } = useAuth(); // from @clerk/clerk-expo

useEffect(() => {
  if (!isSignedIn) return;
  const lang = useLanguageStore.getState().language;
  updatePreferences({ preferred_language: lang }, getToken).catch(() => {});
}, [isSignedIn]);
```

---

## Phase 9 — Gemini `TranslateRecipe` Method (Track A only)

This method translates existing recipe text content into a target language. It does not re-analyse any media.

**File:** `backend/internal/service/ai/gemini.go`

Use the same `Ingredient` and `Step` types already defined in `backend/internal/service/ai/interface.go` (the same ones used by `ExtractionResult`).

```go
type TranslateRecipeRequest struct {
    Title          string       `json:"title"`
    Description    string       `json:"description"`
    Ingredients    []Ingredient `json:"ingredients"`
    Steps          []Step       `json:"steps"`
    Tags           []string     `json:"tags"`
    Allergens      []string     `json:"allergens"`
    MealTypes      []string     `json:"meal_types"`
    TargetLanguage string       `json:"-"` // excluded from JSON marshal; full name e.g. "French"
}

func (g *GeminiClient) TranslateRecipe(ctx context.Context, req *TranslateRecipeRequest) (*ExtractionResult, error) {
    // Marshal only the text content fields (TargetLanguage is excluded via json:"-")
    sourceJSON, err := json.Marshal(req)
    if err != nil {
        return nil, fmt.Errorf("marshal source recipe: %w", err)
    }

    prompt := fmt.Sprintf(`You are an expert chef and translator.

Translate the following recipe into %s.

Rules:
- Translate: title, description, ingredient names, ingredient notes,
  step instructions, tags, allergen names, meal type labels.
- Do NOT translate: quantity numbers, units of measure (g, ml, cup, etc.),
  temperature values, duration values.
- The "category" field on each ingredient must remain one of these exact
  English codes unchanged:
  dairy | produce | proteins | bakery | pantry | spices | condiments |
  beverages | snacks | frozen | household | other
- Preserve all numeric fields (quantity, durationSeconds, stepNumber, etc.) exactly.
- Return the same JSON structure as the input.

Input recipe JSON:
%s`, req.TargetLanguage, string(sourceJSON))

    // Follow the same Gemini call pattern as ExtractFromWebpage (~line 828 in gemini.go):
    // set ResponseMIMEType = "application/json", wrap in withRetry(), unmarshal into ExtractionResult.
    return g.withRetry(ctx, func() (*ExtractionResult, error) {
        genModel := g.client.GenerativeModel(g.model)
        genModel.ResponseMIMEType = "application/json"
        resp, err := genModel.GenerateContent(ctx, genai.Text(prompt))
        if err != nil {
            return nil, err
        }
        // unmarshal resp into *ExtractionResult — same pattern as other methods
        ...
    })
}
```

---

## Phase 10 — Admin Translation Endpoint (Track A only)

### 10a. Admin authentication

Add to `backend/internal/config/config.go`:

```go
type Config struct {
    // ... existing fields ...
    AdminSecret string // env: ADMIN_SECRET — required for admin routes
}
```

Load in the config loader: `cfg.AdminSecret = os.Getenv("ADMIN_SECRET")`

**File:** `backend/internal/middleware/admin.go` (new file)

```go
// AdminOnly returns a middleware that requires a valid ADMIN_SECRET bearer token.
func AdminOnly(secret string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
            if token == "" || token != secret {
                http.Error(w, "forbidden", http.StatusForbidden)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

### 10b. New route

**File:** `backend/internal/router/router.go`

```go
// Admin routes — protected by ADMIN_SECRET bearer token
r.Group(func(r chi.Router) {
    r.Use(middleware.AdminOnly(cfg.AdminSecret))
    r.Post("/api/v1/admin/recipes/{recipeID}/translate", adminRecipeHandler.Translate)
})
```

### 10c. Handler

**File:** `backend/internal/handler/admin_recipe.go` (new file)

```go
// POST /api/v1/admin/recipes/{recipeID}/translate
// Body: { "languages": ["fr", "ar"] }  — optional, defaults to ["fr", "ar"]
//
// This handler runs SYNCHRONOUSLY (the connection stays open until all
// translations are complete). Use a 120s server-side write timeout on this
// route. Translation of one language typically takes 5–15s.
//
// Flow:
// 1. Parse recipeID from URL; parse optional "languages" from body (default ["fr","ar"])
// 2. Load the master recipe from DB (must have is_public=true)
// 3. If translation_group_id is NULL on the master, assign uuid.New() and UPDATE the row:
//      content_language = 'en', translation_group_id = <new uuid>
// 4. For each target language code in the requested list:
//    a. Map code to full name: ai.ResolveLanguageName(code)
//    b. Build TranslateRecipeRequest from master recipe content + target language
//    c. Call geminiClient.TranslateRecipe(ctx, req) → get ExtractionResult
//    d. Check if a translation row already exists:
//         SELECT id FROM recipes WHERE translation_group_id=$1 AND content_language=$2
//       — if yes: UPDATE that row's title, description + delete+reinsert its ingredients/steps
//       — if no:  INSERT new recipe row
//    e. When inserting/updating the recipe row, copy all non-text fields from master:
//         servings, prep_time, cook_time, difficulty, cuisine, thumbnail_url,
//         source_type, source_url, source_metadata, nutrition, dietary_info,
//         is_public=true, is_featured, featured_at, translation_group_id
//       Set: content_language = target ISO code, user_id = master.user_id
//    f. Insert translated ingredients using the same helper used in saveExtractedRecipe
//       in unified_extraction.go — extract this into a shared function if needed
//    g. Insert translated steps the same way
// 5. Return HTTP 200: { "master_id": "...", "translations": [{"language":"fr","recipe_id":"..."}] }
```

### 10d. Repository queries needed

```sql
-- Check for existing translation
SELECT id FROM recipes
 WHERE translation_group_id = $1
   AND content_language = $2
   AND deleted_at IS NULL
 LIMIT 1;

-- Assign translation_group_id to master (only if not already set)
UPDATE recipes
   SET translation_group_id = $2,
       content_language      = 'en',
       updated_at            = NOW()
 WHERE id = $1
   AND translation_group_id IS NULL;
```

---

## Phase 11 — Public Recipe Endpoints Accept `lang` Param (Track A only)

**Files:** the handler files for `GET /recipes/suggested`, `GET /recipes/featured`, `GET /recipes/search/public`

Add `lang` query parameter resolution at the top of each handler:

```go
lang := r.URL.Query().Get("lang")
if lang == "" {
    lang = "en"
}
validLangs := map[string]bool{"en": true, "fr": true, "ar": true}
if !validLangs[lang] {
    lang = "en"
}
```

Update the repository queries for each endpoint to filter by `content_language`:

```sql
SELECT r.*
  FROM recipes r
 WHERE r.is_public        = TRUE
   AND r.deleted_at       IS NULL
   AND r.content_language = $1
 ORDER BY r.created_at DESC
 LIMIT $2 OFFSET $3;
```

If no results are returned for the requested language (translation not yet generated), fall back to English:

```go
recipes, err := repo.ListPublic(ctx, lang, limit, offset)
if err != nil {
    // handle error
}
if len(recipes) == 0 && lang != "en" {
    recipes, err = repo.ListPublic(ctx, "en", limit, offset)
}
```

Apply the same pattern to `featured` and `search/public`.

---

## Phase 12 — Mobile: Pass `lang` When Fetching Public Recipes (Track A only)

**File:** `mobile/services/recipes.js`

Find the existing functions for suggested, featured, and public search, and add `?lang=` to each URL:

```js
export async function getSuggestedRecipes(getToken) {
  const lang = useLanguageStore.getState().language;
  return authFetch(`/recipes/suggested?lang=${lang}`, getToken);
}

export async function getFeaturedRecipes(getToken) {
  const lang = useLanguageStore.getState().language;
  return authFetch(`/recipes/featured?lang=${lang}`, getToken);
}

export async function searchPublicRecipes({ query, getToken }) {
  const lang = useLanguageStore.getState().language;
  return authFetch(`/recipes/search/public?q=${encodeURIComponent(query)}&lang=${lang}`, getToken);
}
```

> These endpoints are public (no auth required on the server) but `authFetch` sending a token is harmless — the server ignores it for public routes.

---

## Data Model Summary

```
recipes
├── id
├── user_id
├── title                  ← language-dependent text
├── description            ← language-dependent text
├── content_language       ← NEW: "en" | "fr" | "ar"
├── translation_group_id   ← NEW: NULL for Track B, UUID for Track A
├── is_public
├── servings, prep_time, cook_time   ← language-neutral numbers
├── nutrition JSONB        ← language-neutral numbers + English-code tags
├── dietary_info JSONB     ← booleans + allergens[] (language-dependent strings)
└── ...

recipe_ingredients
├── recipe_id
├── name                   ← language-dependent
├── notes                  ← language-dependent
├── category               ← ALWAYS English enum code, never translated
├── quantity, unit         ← language-neutral
└── ...

recipe_steps
├── recipe_id
├── instruction            ← language-dependent
├── technique, temperature ← language-neutral values
└── ...
```

---

## Key Rules

| Rule | Reason |
|---|---|
| `category` enum is always English | It's an internal grouping code, not display text. Translating it breaks shopping list logic. |
| `RefineRecipe` must get language param | It runs on every extraction. Without it, it silently translates back to English. |
| `ResolveLanguageName` is exported (capital R) | The handler package must call `ai.ResolveLanguageName()`. Lowercase would not compile. |
| `job.Language` stores the ISO code, not the full name | The full name is only used inside Gemini prompts. The DB and job model always store the ISO code. |
| `setLanguage` accepts `getToken` as parameter | Zustand store actions cannot use React hooks. The calling component must pass `getToken` from `useAuth()`. |
| `translation_group_id` is NULL for all Track B recipes | Regular users never have multi-language versions. |
| Public recipe queries filter by `content_language` | Never return a French row to an Arabic user. |
| Translation falls back to EN if lang version missing | Prevents empty screens while admin translations are being generated. |
| Clone handler copies `content_language`, NOT `translation_group_id` | A cloned recipe is private; it has no multi-version semantics. |
| Arabic text stores fine in PostgreSQL | UTF-8 by default. No encoding changes needed. |
| `preferred_language` is the extraction fallback, not the rule | Explicit `language` param in the request always wins. |

---

## What Does NOT Need to Change

- PostgreSQL text columns — UTF-8 handles all languages natively
- Recipe CRUD (`GET`, `PUT`, `DELETE /recipes`) — returns whatever language is stored; correct once insertion is fixed
- `ExtractRecipe`, `ExtractFromWebpage`, `ExtractFromImages` prompts — already have `Target Language: %s`
- Clerk auth / JWT
- Subscription / quota logic

---

## Minimum Viable Subset for Track B (ship first)

These four changes alone make regular user extraction fully language-aware:

1. **Phase 1** — Run migration (`content_language`, `preferred_language` columns)
2. **Phase 5a** — Add language param to `RefineRecipe` prompt
3. **Phase 7a** — Mobile sends real language code instead of `"auto"`
4. **Phase 4** — Server-side language resolution fallback

Track A (admin multi-language public recipes) can be a follow-up PR once Track B is stable in production.
