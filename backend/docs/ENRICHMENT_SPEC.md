# Recipe Enrichment Specification

## Overview

DishFlow uses a **two-step AI workflow** for recipe processing:

1. **Extraction** - Parse recipe structure from URL/image/video
2. **Enrichment** - Analyze recipe text to add nutrition and dietary metadata

This separation improves AI accuracy by giving each step a focused scope.

---

## Workflow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Recipe Source  │────▶│  Cache Check    │────▶│   Extraction    │────▶│   Enrichment    │
│  (URL/Video)    │     │  (PostgreSQL)   │     │   (Step 1)      │     │   (Step 2)      │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │                       │
                        ┌────────┴────────┐              │                       │
                        │                 │              │                       │
                   Cache Hit         Cache Miss          │                       │
                        │                 │              │                       │
                        ▼                 └──────────────┘                       │
               ┌─────────────────┐                                               │
               │ Return cached   │◀──────────────────────────────────────────────┘
               │ result (fast)   │                       │
               └─────────────────┘              Save to cache
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │ Enriched Data:  │
                                                │ - nutrition     │
                                                │ - dietaryInfo   │
                                                │ - servings      │
                                                └─────────────────┘
```

**Note:** Image extraction skips cache (images aren't URL-deduplicated).

---

## Step 1: Extraction

### Purpose
Extract the basic recipe structure from the source content.

### Input
- URL content (HTML)
- Image (base64 or URL)
- Video transcript/frames

### Output Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Recipe name |
| description | string | No | Short description |
| ingredients | array | Yes | List of ingredients with name, amount, unit, notes |
| steps | array | Yes | Ordered preparation steps |
| prepTime | int | No | Prep time in minutes |
| cookTime | int | No | Cook time in minutes |
| totalTime | int | No | Total time in minutes (calculated if not provided) |
| servings | int | No | Number of servings/portions |
| cuisine | string | No | Cuisine type (italian, asian, mexican, etc.) |
| sourceURL | string | No | Original source URL |
| imageURL | string | No | Recipe image URL |

### Notes
- Extraction focuses on **structure**, not analysis
- If servings cannot be determined, leave as 0/null (enrichment will estimate)
- Cuisine can be inferred from ingredients/title if obvious

---

## Step 2: Enrichment

### Purpose
Analyze recipe content to add nutrition estimates, dietary classifications, and meal type inference.

### Input Format

Plain text summary of the recipe:

```
Title: [Recipe Title]

Servings: [X] (or "unknown" if not extracted)

Ingredients:
- [ingredient 1 with amount]
- [ingredient 2 with amount]
- ...

Steps:
1. [step 1]
2. [step 2]
...

Additional context:
- Prep time: [X] minutes
- Cook time: [X] minutes
- Cuisine: [cuisine type if known]
```

### Output Format

```json
{
  "nutrition": {
    "perServing": {
      "calories": 450,
      "protein": 25,
      "carbs": 35,
      "fat": 22,
      "fiber": 5,
      "sugar": 8,
      "sodium": 650
    },
    "tags": ["high-protein", "moderate-carb"],
    "confidence": 0.75
  },
  "dietaryInfo": {
    "isVegetarian": false,
    "isVegan": false,
    "isGlutenFree": true,
    "isDairyFree": false,
    "isNutFree": true,
    "isKeto": false,
    "isHalal": null,
    "isKosher": null,
    "allergens": ["dairy", "eggs"],
    "mealTypes": ["dinner", "lunch"],
    "confidence": 0.85
  },
  "servingsEstimate": {
    "value": 4,
    "confidence": 0.7,
    "reasoning": "Based on ingredient quantities (1 lb protein, 2 cups rice)"
  }
}
```

### Output Field Details

#### nutrition.perServing

| Field | Type | Unit | Description |
|-------|------|------|-------------|
| calories | int | kcal | Estimated calories per serving |
| protein | int | grams | Protein content |
| carbs | int | grams | Carbohydrate content |
| fat | int | grams | Fat content |
| fiber | int | grams | Fiber content |
| sugar | int | grams | Sugar content |
| sodium | int | mg | Sodium content |

#### nutrition.tags

Array of relevant nutrition tags:
- `high-protein` - >25g protein per serving
- `low-carb` - <20g carbs per serving
- `low-fat` - <10g fat per serving
- `high-fiber` - >8g fiber per serving
- `low-calorie` - <300 calories per serving
- `moderate-carb` - 20-50g carbs per serving

#### dietaryInfo Boolean Fields

| Field | Description | When true |
|-------|-------------|-----------|
| isVegetarian | No meat/fish | All ingredients are vegetarian |
| isVegan | No animal products | All ingredients are plant-based |
| isGlutenFree | No gluten | No wheat, barley, rye, or derivatives |
| isDairyFree | No dairy | No milk, cheese, butter, cream, etc. |
| isNutFree | No tree nuts/peanuts | No nuts or nut derivatives |
| isKeto | Keto-compatible | Very low carb (<20g), high fat |
| isHalal | Halal compliant | null if uncertain (requires certification knowledge) |
| isKosher | Kosher compliant | null if uncertain (requires certification knowledge) |

**Note**: Use `null` for isHalal/isKosher unless clearly determinable (e.g., pork = not halal).

#### dietaryInfo.allergens

Array of detected common allergens:
- `dairy`
- `eggs`
- `gluten`
- `nuts`
- `peanuts`
- `soy`
- `shellfish`
- `fish`
- `sesame`

#### dietaryInfo.mealTypes

Array of appropriate meal types for the recipe:
- `breakfast`
- `lunch`
- `dinner`
- `snack`
- `dessert`

**Inference Rules**:

| Recipe Characteristics | Inferred Meal Types |
|----------------------|---------------------|
| Eggs, bacon, pancakes, cereal | breakfast |
| Sandwiches, salads, light dishes | lunch |
| Substantial protein + sides, pasta, stews | dinner |
| Small portions, dips, finger foods | snack |
| Sweet, contains sugar/chocolate as main | dessert |
| Eggs + toast + light | breakfast, lunch |
| Hearty soup/stew | lunch, dinner |

Multiple meal types are allowed when a recipe fits multiple categories.

#### servingsEstimate

Only included if extraction did not provide servings (servings = 0 or null).

| Field | Type | Description |
|-------|------|-------------|
| value | int | Estimated number of servings |
| confidence | float | Confidence in estimate (0-1) |
| reasoning | string | Brief explanation of estimate basis |

**Estimation Heuristics**:
- 1 lb ground meat → typically 4 servings
- 2 chicken breasts → typically 2 servings
- 1 cup dry rice/pasta → typically 4 servings cooked
- "family-style" or large quantities → 6-8 servings
- Single protein portion + small sides → 1-2 servings

---

## Confidence Threshold

**Minimum confidence: 0.5**

- Values with confidence < 0.5 should not be stored
- UI should indicate low-confidence estimates (0.5-0.7)
- High confidence (>0.8) can be shown without qualification

### Confidence Guidelines

| Confidence | Meaning | When to use |
|------------|---------|-------------|
| 0.9-1.0 | Very certain | Clear ingredients, standard recipe |
| 0.7-0.9 | Confident | Most ingredients clear, some estimation |
| 0.5-0.7 | Moderate | Significant estimation required |
| <0.5 | Low | Too uncertain, don't include |

---

## AI Prompt Template

```
Analyze this recipe and provide nutrition estimates and dietary classifications.

Recipe:
---
{recipe_text}
---

Respond with JSON only, no explanation:

{
  "nutrition": {
    "perServing": {
      "calories": <int>,
      "protein": <int grams>,
      "carbs": <int grams>,
      "fat": <int grams>,
      "fiber": <int grams>,
      "sugar": <int grams>,
      "sodium": <int mg>
    },
    "tags": [<relevant tags from: high-protein, low-carb, low-fat, high-fiber, low-calorie, moderate-carb>],
    "confidence": <0.0-1.0>
  },
  "dietaryInfo": {
    "isVegetarian": <bool>,
    "isVegan": <bool>,
    "isGlutenFree": <bool>,
    "isDairyFree": <bool>,
    "isNutFree": <bool>,
    "isKeto": <bool>,
    "isHalal": <bool or null if uncertain>,
    "isKosher": <bool or null if uncertain>,
    "allergens": [<detected allergens>],
    "mealTypes": [<appropriate meal types>],
    "confidence": <0.0-1.0>
  },
  "servingsEstimate": <include only if servings unknown in recipe> {
    "value": <int>,
    "confidence": <0.0-1.0>,
    "reasoning": "<brief explanation>"
  }
}

Guidelines:
- Estimate nutrition per serving based on typical ingredient amounts
- For dietary flags, analyze all ingredients carefully
- Use null for isHalal/isKosher unless clearly determinable
- Infer meal types from recipe characteristics (eggs+bacon=breakfast, etc.)
- Only include servingsEstimate if servings is "unknown" in the recipe
- Set confidence based on how certain you are of your estimates
```

---

## Implementation Notes

### When to Call Enrichment

Enrichment should be called:
1. Immediately after successful extraction (same request flow)
2. As a background job if extraction was async (video)
3. Never for recipes that already have nutrition/dietaryInfo populated

### Error Handling

| Scenario | Handling |
|----------|----------|
| AI returns invalid JSON | Retry once, then save recipe without enrichment |
| Confidence < 0.5 for all fields | Save recipe without that enrichment data |
| Partial success | Save fields that met confidence threshold |
| AI service unavailable | Save recipe, queue for later enrichment |

### Database Storage

Enrichment data maps to recipe columns:
- `nutrition` JSONB column ← nutrition object
- `dietary_info` JSONB column ← dietaryInfo object
- Update `servings` column if servingsEstimate provided and original was null/0

### Performance Considerations

- Enrichment adds ~1-2 seconds to extraction flow
- Consider background processing for bulk imports
- Cache common ingredient nutrition values if needed

---

## Extraction Cache

### Purpose

Avoid redundant AI extraction when multiple users extract the same recipe URL/video. If User A extracts a recipe from a URL, and User B later requests the same URL, return the cached result instantly.

**Benefits:**
- Faster response (skip AI extraction entirely)
- Save AI API costs (Gemini calls)
- Reduce video processing load
- Consistent results for same source

### Database Schema

```sql
CREATE TABLE extraction_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA256 of normalized URL
    normalized_url TEXT NOT NULL,           -- for debugging/inspection
    extraction_result JSONB NOT NULL,       -- full recipe + enrichment data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,        -- created_at + 30 days
    hit_count INT DEFAULT 0                 -- track cache usage
);

CREATE INDEX idx_extraction_cache_hash ON extraction_cache(url_hash);
CREATE INDEX idx_extraction_cache_expires ON extraction_cache(expires_at);
```

**Why PostgreSQL, not Redis:**
- Survives VPS reboots (persistent storage)
- 30-day TTL is long-term, not session-based
- Easy to query, inspect, and manage
- Already have PostgreSQL infrastructure

### URL Normalization

Before cache lookup, normalize URLs to handle variations:

```go
func normalizeURL(rawURL string) string {
    // 1. Parse URL
    // 2. Lowercase host
    // 3. Remove tracking parameters (utm_*, fbclid, etc.)
    // 4. Standardize video hosts:
    //    - youtu.be/X → youtube.com/watch?v=X
    //    - m.youtube.com → youtube.com
    // 5. Remove trailing slashes
    // 6. Sort query parameters alphabetically
    return normalized
}
```

**Normalization examples:**

| Input | Normalized |
|-------|------------|
| `https://youtu.be/abc123` | `https://youtube.com/watch?v=abc123` |
| `https://m.youtube.com/watch?v=abc123` | `https://youtube.com/watch?v=abc123` |
| `https://recipe.com/pasta?utm_source=fb` | `https://recipe.com/pasta` |
| `https://Recipe.COM/Pasta/` | `https://recipe.com/pasta` |

### Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Extraction Request                           │
│                    (URL or Video link)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Normalize URL   │
                    │ Compute SHA256  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Query cache by  │
                    │ url_hash        │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌─────────────────┐          ┌─────────────────┐
     │ CACHE HIT       │          │ CACHE MISS      │
     │ (not expired)   │          │ (or expired)    │
     └────────┬────────┘          └────────┬────────┘
              │                            │
              ▼                            ▼
     ┌─────────────────┐          ┌─────────────────┐
     │ Clone result    │          │ Run Extraction  │
     │ to user's       │          │ + Enrichment    │
     │ recipe          │          └────────┬────────┘
     │                 │                   │
     │ Increment       │                   ▼
     │ hit_count       │          ┌─────────────────┐
     └────────┬────────┘          │ Save to cache   │
              │                   │ (UPSERT)        │
              │                   └────────┬────────┘
              │                            │
              ▼                            ▼
     ┌─────────────────────────────────────────────┐
     │ Create user's recipe record (independent)   │
     │ Return response                             │
     └─────────────────────────────────────────────┘
```

### Cache Entry Content

The `extraction_result` JSONB stores the complete extracted + enriched recipe:

```json
{
  "recipe": {
    "title": "Grilled Chicken...",
    "description": "...",
    "ingredients": [...],
    "steps": [...],
    "prepTime": 10,
    "cookTime": 25,
    "servings": 2,
    "cuisine": "American",
    "sourceURL": "https://...",
    "imageURL": "https://..."
  },
  "nutrition": {
    "perServing": {...},
    "tags": [...],
    "confidence": 0.85
  },
  "dietaryInfo": {
    "isVegetarian": false,
    ...
  }
}
```

### Cache TTL & Cleanup

**TTL: 30 days**

Recipes on websites can change (corrections, updates). 30 days balances freshness with cache efficiency.

**Cleanup job** (run daily via cron or background worker):

```sql
DELETE FROM extraction_cache WHERE expires_at < NOW();
```

### Concurrent Requests

If two users submit the same URL simultaneously (before either completes):

- Both process independently
- First to finish saves to cache (INSERT)
- Second to finish updates cache (UPSERT - ON CONFLICT UPDATE)
- Both users get their results
- No complex coordination needed

This is simpler than job sharing and handles edge cases gracefully.

### User Recipe Independence

**Important:** Each user gets their own recipe record. The cache stores extraction results, not user data.

- User A extracts URL → gets recipe record A (can edit, delete)
- User B extracts same URL → gets recipe record B (independent copy)
- User A editing their recipe does NOT affect User B
- Deleting cache entry does NOT affect existing user recipes

### Cache Bypass

Some scenarios should skip cache:

| Scenario | Action |
|----------|--------|
| User explicitly requests "re-extract" | Bypass cache, update cache with new result |
| Image extraction (no URL) | No caching (images aren't deduplicated) |
| URL returns error/changed content | Don't cache failures |

### Migration

```sql
-- migrations/000009_extraction_cache.up.sql
CREATE TABLE extraction_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url_hash VARCHAR(64) NOT NULL UNIQUE,
    normalized_url TEXT NOT NULL,
    extraction_result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    hit_count INT DEFAULT 0
);

CREATE INDEX idx_extraction_cache_hash ON extraction_cache(url_hash);
CREATE INDEX idx_extraction_cache_expires ON extraction_cache(expires_at);

-- migrations/000009_extraction_cache.down.sql
DROP TABLE IF EXISTS extraction_cache;
```

---

## Example

### Input (Extraction Result)

```
Title: Grilled Chicken with Roasted Vegetables

Servings: unknown

Ingredients:
- 2 boneless chicken breasts (about 1 lb)
- 2 tablespoons olive oil
- 1 teaspoon garlic powder
- 1 teaspoon paprika
- Salt and pepper to taste
- 2 cups broccoli florets
- 1 red bell pepper, sliced
- 1 zucchini, sliced
- 1 tablespoon balsamic vinegar

Steps:
1. Preheat oven to 400°F
2. Season chicken with garlic powder, paprika, salt and pepper
3. Heat 1 tbsp olive oil in oven-safe skillet, sear chicken 3 min per side
4. Toss vegetables with remaining oil and balsamic
5. Add vegetables around chicken, roast 20 minutes until chicken is 165°F

Additional context:
- Prep time: 10 minutes
- Cook time: 25 minutes
- Cuisine: American
```

### Output (Enrichment Result)

```json
{
  "nutrition": {
    "perServing": {
      "calories": 385,
      "protein": 42,
      "carbs": 12,
      "fat": 18,
      "fiber": 4,
      "sugar": 6,
      "sodium": 420
    },
    "tags": ["high-protein", "low-carb"],
    "confidence": 0.85
  },
  "dietaryInfo": {
    "isVegetarian": false,
    "isVegan": false,
    "isGlutenFree": true,
    "isDairyFree": true,
    "isNutFree": true,
    "isKeto": false,
    "isHalal": null,
    "isKosher": null,
    "allergens": [],
    "mealTypes": ["dinner", "lunch"],
    "confidence": 0.9
  },
  "servingsEstimate": {
    "value": 2,
    "confidence": 0.85,
    "reasoning": "2 chicken breasts (1 lb) typically serves 2 people"
  }
}
```

---

## Related Files

- `internal/service/ai/gemini.go` - AI client with `EnrichRecipe()` method ✅
- `internal/service/ai/interface.go` - `RecipeEnricher` interface and types ✅
- `internal/model/recipe.go` - Recipe model with nutrition/dietary fields ✅
- `internal/model/extraction_cache.go` - Cache model with URL normalization ✅
- `internal/repository/postgres/extraction_cache.go` - Cache repository ✅
- `internal/handler/unified_extraction.go` - Extraction handler with caching/enrichment ✅
- `internal/router/router.go` - Router initialization ✅
- `migrations/000008_recipe_nutrition.up.sql` - Nutrition/dietary columns migration ✅
- `migrations/000009_extraction_cache.up.sql` - Extraction cache table migration ✅
