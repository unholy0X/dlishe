# DishFlow API Changes

This document outlines recent API changes for frontend integration.

---

## Summary of Changes

| Change | Type | Description |
|--------|------|-------------|
| Unified extraction endpoint | **Breaking** | All extraction now uses `/recipes/extract` |
| Removed old extraction endpoints | **Breaking** | `/video/extract`, `/extract-url`, `/extract-image` removed |
| Added suggested recipes | **New** | Public endpoint for curated recipes |
| Added recipe clone/save | **New** | Save suggested recipes to user's collection |
| New recipe fields | **New** | `isPublic`, `sourceRecipeId` added to Recipe |

---

## 1. Unified Recipe Extraction

### Before (Deprecated)
```
POST /api/v1/video/extract        → Video extraction
POST /api/v1/recipes/extract-url   → URL extraction
POST /api/v1/recipes/extract-image → Image extraction
```

### After (New)
```
POST /api/v1/recipes/extract       → All extraction types
```

### Request Format

**JSON Body:**
```json
{
  "type": "url | image | video",
  "url": "https://example.com/recipe",
  "imageBase64": "base64-encoded-image",
  "mimeType": "image/jpeg",
  "language": "en | fr | es | auto",
  "detailLevel": "quick | detailed",
  "saveAuto": true
}
```

**Multipart Form (for file uploads):**
```
type: "image"
image: <file>
mimeType: "image/jpeg"
language: "auto"
detailLevel: "detailed"
saveAuto: true
```

### Field Requirements by Type

| Field | `type: "url"` | `type: "image"` | `type: "video"` |
|-------|---------------|-----------------|-----------------|
| `url` | Required | - | Required |
| `imageBase64` | - | Required* | - |
| `image` (file) | - | Required* | - |
| `mimeType` | - | Optional | - |

*Either `imageBase64` (JSON) or `image` file (multipart) is required for image extraction.

### Response

All extraction types now return a **job** for async processing:

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "jobType": "url",
  "status": "pending",
  "progress": 0,
  "message": "",
  "sourceUrl": "https://example.com/recipe",
  "statusUrl": "/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000",
  "streamUrl": "/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000/stream",
  "createdAt": "2024-02-01T10:30:00Z"
}
```

### Job Status Values

| Status | Description |
|--------|-------------|
| `pending` | Job created, waiting to process |
| `downloading` | Downloading video (video type only) |
| `processing` | Fetching/reading content |
| `extracting` | AI extracting recipe |
| `completed` | Recipe extracted successfully |
| `failed` | Extraction failed |
| `cancelled` | Job cancelled by user |

---

## 2. Job Endpoints

No endpoint changes, but now handles all extraction types:

```
GET  /api/v1/jobs                  → List all jobs (url, image, video)
GET  /api/v1/jobs/{jobId}          → Get job status
POST /api/v1/jobs/{jobId}/cancel   → Cancel running job
```

### List Jobs with Type Filter

```
GET /api/v1/jobs?type=url          → Only URL extraction jobs
GET /api/v1/jobs?type=image        → Only image extraction jobs
GET /api/v1/jobs?type=video        → Only video extraction jobs
GET /api/v1/jobs?limit=10&offset=0 → Pagination
```

### Job Response (includes jobType)

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "jobType": "video",
  "status": "completed",
  "progress": 100,
  "message": "Recipe extracted successfully",
  "recipe": { ... },
  "createdAt": "2024-02-01T10:30:00Z",
  "completedAt": "2024-02-01T10:32:00Z"
}
```

---

## 3. Suggested Recipes (New)

### Endpoint

```
GET /api/v1/recipes/suggested
```

**Authentication:** Not required (public endpoint)

### Purpose

Returns curated public recipes that serve as starter content for new users. These are recipes created by admins and marked as public.

### Request

```
GET /api/v1/recipes/suggested?limit=20&offset=0
```

### Response

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Classic Spaghetti Carbonara",
      "description": "Traditional Italian pasta dish",
      "servings": 4,
      "prepTime": 10,
      "cookTime": 20,
      "difficulty": "medium",
      "cuisine": "Italian",
      "thumbnailUrl": "https://...",
      "sourceType": "video",
      "isPublic": true,
      "tags": ["italian", "pasta", "quick"],
      "ingredientCount": 6,
      "stepCount": 5,
      "createdAt": "2024-02-01T10:30:00Z"
    }
  ],
  "total": 25,
  "limit": 20,
  "offset": 0
}
```

---

## 4. Clone/Save Recipe (New)

### Endpoint

```
POST /api/v1/recipes/{recipeId}/save
```

**Authentication:** Required

### Purpose

Clones a public/suggested recipe (or user's own recipe) to the user's personal collection.

### Request

No body required. The recipe ID in the URL is the source recipe to clone.

### Response

Returns the newly created recipe:

```json
{
  "id": "new-recipe-uuid",
  "title": "Classic Spaghetti Carbonara",
  "sourceType": "cloned",
  "sourceRecipeId": "original-recipe-uuid",
  "isPublic": false,
  "isFavorite": false,
  "ingredients": [...],
  "steps": [...],
  "createdAt": "2024-02-01T10:30:00Z"
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 403 | `ACCESS_DENIED` | Recipe not accessible (not public, not owned) |
| 404 | `NOT_FOUND` | Recipe not found |
| 409 | `ALREADY_CLONED` | User already has a copy of this recipe |

**409 Response includes existing recipe ID:**
```json
{
  "error": {
    "code": "ALREADY_CLONED",
    "message": "You already have a copy of this recipe",
    "details": {
      "existingRecipeId": "existing-clone-uuid"
    }
  }
}
```

---

## 5. Recipe Model Changes

### New Fields

| Field | Type | Description |
|-------|------|-------------|
| `isPublic` | boolean | `true` for suggested/curated recipes |
| `sourceRecipeId` | string (uuid) | ID of original recipe if cloned |

### Updated sourceType Values

| Value | Description |
|-------|-------------|
| `manual` | Created manually by user |
| `video` | Extracted from video |
| `webpage` | Extracted from URL |
| `image` | Extracted from image |
| `cloned` | Cloned from another recipe |

### Full Recipe Object

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "title": "Spaghetti Carbonara",
  "description": "Classic Italian pasta",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 20,
  "difficulty": "medium",
  "cuisine": "Italian",
  "thumbnailUrl": "https://...",
  "sourceType": "cloned",
  "sourceUrl": "https://original-source.com",
  "sourceRecipeId": "original-recipe-uuid",
  "tags": ["italian", "pasta"],
  "isPublic": false,
  "isFavorite": false,
  "syncVersion": 1,
  "createdAt": "2024-02-01T10:30:00Z",
  "updatedAt": "2024-02-01T10:30:00Z",
  "ingredients": [...],
  "steps": [...]
}
```

---

## 6. Frontend Integration Guide

### Home Screen Flow

```
1. Fetch suggested recipes (no auth needed):
   GET /api/v1/recipes/suggested

2. Display suggested recipes section

3. User taps "Save" on a suggested recipe:
   POST /api/v1/recipes/{id}/save

4. Handle responses:
   - 201: Recipe saved, add to user's collection
   - 409: Already saved, show existing recipe
   - 403: Access denied (shouldn't happen for public recipes)

5. User's recipes now include the saved recipe:
   GET /api/v1/recipes
```

### Extraction Flow (Updated)

```
1. User submits URL/image/video for extraction:
   POST /api/v1/recipes/extract
   {
     "type": "url",
     "url": "https://recipe-site.com/carbonara"
   }

2. Receive job response:
   { "jobId": "xxx", "status": "pending", ... }

3. Poll for status (or use SSE when available):
   GET /api/v1/jobs/{jobId}

4. When status === "completed":
   - Recipe is in job.recipe
   - Recipe is auto-saved if saveAuto was true

5. Display recipe to user
```

### Type Definitions (TypeScript)

```typescript
// Extraction request
interface ExtractRequest {
  type: 'url' | 'image' | 'video';
  url?: string;
  imageBase64?: string;
  mimeType?: string;
  language?: 'en' | 'fr' | 'es' | 'auto';
  detailLevel?: 'quick' | 'detailed';
  saveAuto?: boolean;
}

// Job response
interface JobResponse {
  jobId: string;
  jobType: 'url' | 'image' | 'video';
  status: 'pending' | 'downloading' | 'processing' | 'extracting' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message?: string;
  sourceUrl?: string;
  statusUrl?: string;
  streamUrl?: string;
  recipe?: Recipe;
  error?: {
    code: string;
    message: string;
  };
  createdAt: string;
  completedAt?: string;
}

// Recipe (updated)
interface Recipe {
  id: string;
  userId: string;
  title: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  thumbnailUrl?: string;
  sourceType: 'manual' | 'video' | 'webpage' | 'image' | 'cloned';
  sourceUrl?: string;
  sourceRecipeId?: string;  // NEW
  tags?: string[];
  isPublic: boolean;        // NEW
  isFavorite: boolean;
  syncVersion: number;
  createdAt: string;
  updatedAt: string;
  ingredients?: RecipeIngredient[];
  steps?: RecipeStep[];
}
```

---

## 7. Migration Notes

### For Existing Frontend Code

1. **Replace extraction endpoints:**
   - `/video/extract` → `/recipes/extract` with `type: "video"`
   - `/recipes/extract-url` → `/recipes/extract` with `type: "url"`
   - `/recipes/extract-image` → `/recipes/extract` with `type: "image"`

2. **Update job handling:**
   - Jobs now have `jobType` field
   - Filter by type if needed: `GET /jobs?type=video`

3. **Add suggested recipes section:**
   - Fetch from `GET /recipes/suggested`
   - Implement "Save" button calling `POST /recipes/{id}/save`

4. **Handle new recipe fields:**
   - Display `isPublic` indicator if needed
   - Handle `sourceRecipeId` for showing "Cloned from..." info

---

## 8. Recipe Recommendations (New)

### Endpoint

```
GET /api/v1/recipes/recommendations
```

**Authentication:** Required

### Purpose

Get personalized recipe recommendations based on user's pantry items. All filters are **soft/lenient** - recipes are included even if they don't match or lack data. Each recipe includes metadata about which filters it matches.

### Filter Philosophy

- **Primary filter**: Pantry ingredient match (only hard requirement via `minMatch`)
- **All other filters are SOFT**: They help prioritize and provide metadata, but don't exclude recipes
- Recipes without data for a filter are still included (marked as "unknown")
- Frontend can use filter metadata to sort/display recommendations

### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `mealType` | string | Prefer meal type: breakfast, lunch, dinner, snack, dessert |
| `maxTime` | int | Prefer max total time in minutes |
| `cuisine` | string | Prefer cuisine (e.g., italian, asian, mexican) |
| `mood` | string | Mood preference: quick, comfort, healthy, indulgent |
| `diet` | string | Dietary preference: vegetarian, vegan, keto, halal, kosher, pescatarian, paleo |
| `exclude` | string[] | Prefer to exclude: gluten, dairy, nuts, peanuts, shellfish, eggs, soy, fish, pork, sesame |
| `maxCalories` | int | Prefer max calories per serving |
| `minProtein` | int | Prefer min protein grams per serving |
| `maxCarbs` | int | Prefer max carbs grams per serving |
| `maxFat` | int | Prefer max fat grams per serving |
| `minMatch` | int | Minimum ingredient match percentage (default: 50) - **only hard filter** |
| `limit` | int | Max results per category (default: 10, max: 50) |

### Response

```json
{
  "readyToCook": [
    {
      "recipe": { /* full recipe object */ },
      "matchScore": 95,
      "matchedIngredients": [
        {
          "recipeIngredient": "chicken breast",
          "pantryItem": "Chicken Breast",
          "isSubstitute": false
        }
      ],
      "missingIngredients": [
        {
          "ingredient": "fresh thyme",
          "canSkip": true,
          "category": "spices"
        }
      ],
      "shoppingListItems": [],
      "reason": "You have all the ingredients • Perfect for lunch • 450 cal/serving",
      "nutritionPerServing": {
        "calories": 450,
        "protein": 35,
        "carbs": 20,
        "fat": 22
      },
      "filtersMatched": ["mealType", "maxCalories"],
      "filtersUnknown": [],
      "filtersNotMatched": []
    },
    {
      "recipe": { /* recipe without nutrition data */ },
      "matchScore": 90,
      "filtersMatched": ["mealType"],
      "filtersUnknown": ["maxCalories"],
      "filtersNotMatched": []
    }
  ],
  "almostReady": [
    /* 70-89% match recipes */
  ],
  "needsShopping": [
    /* 50-69% match recipes */
  ],
  "summary": {
    "totalRecipes": 15,
    "avgCaloriesPerServing": 380,
    "quickestRecipe": {
      "id": "recipe-uuid",
      "title": "Quick Stir Fry",
      "value": 15,
      "valueUnit": "min"
    },
    "highestProtein": {
      "id": "recipe-uuid",
      "title": "Grilled Chicken",
      "value": 42,
      "valueUnit": "g"
    },
    "bestMatch": {
      "id": "recipe-uuid",
      "title": "Pasta Carbonara",
      "value": 100,
      "valueUnit": "%"
    }
  },
  "filters": {
    "appliedMealType": "lunch",
    "appliedMaxTime": 30,
    "nutritionFilters": {
      "maxCalories": 500
    }
  }
}
```

### Filter Metadata on Each Recipe

| Field | Description |
|-------|-------------|
| `filtersMatched` | Filters where recipe has data AND matches user's preference |
| `filtersUnknown` | Filters where recipe lacks data (e.g., no nutrition info) |
| `filtersNotMatched` | Filters where recipe has data but doesn't match |

**Frontend usage**:
- Show recipes with `filtersMatched` first
- Display badges like "Calories: unknown" for `filtersUnknown`
- Optionally dim/deprioritize recipes with `filtersNotMatched`

### Match Score Categories

| Category | Score Range | Description |
|----------|-------------|-------------|
| `readyToCook` | 90-100% | All or nearly all ingredients available |
| `almostReady` | 70-89% | Missing 1-2 ingredients (often substitutable) |
| `needsShopping` | 50-69% | Missing several ingredients |

### Example Requests

**Quick breakfast options:**
```
GET /api/v1/recipes/recommendations?mealType=breakfast&maxTime=20&mood=quick
```

**High-protein keto meals:**
```
GET /api/v1/recipes/recommendations?diet=keto&minProtein=30&maxCarbs=20
```

**Vegetarian dinner excluding nuts:**
```
GET /api/v1/recipes/recommendations?mealType=dinner&diet=vegetarian&exclude=nuts&exclude=peanuts
```

**Low-calorie Italian cuisine:**
```
GET /api/v1/recipes/recommendations?cuisine=italian&maxCalories=400
```

---

## 9. Recipe Nutrition & Dietary Info (New)

### New Fields on Recipe Model

```json
{
  "nutrition": {
    "calories": 450,
    "protein": 25,
    "carbs": 30,
    "fat": 20,
    "fiber": 5,
    "sugar": 8,
    "sodium": 600,
    "tags": ["high-protein", "low-carb"],
    "confidence": 0.85
  },
  "dietaryInfo": {
    "isVegetarian": false,
    "isVegan": false,
    "isGlutenFree": true,
    "isDairyFree": false,
    "isNutFree": true,
    "isKeto": false,
    "isHalal": true,
    "isKosher": false,
    "allergens": ["dairy"],
    "mealTypes": ["dinner", "lunch"]
  }
}
```

### Nutrition Tags

| Tag | Criteria |
|-----|----------|
| `low-calorie` | < 300 cal/serving |
| `high-protein` | > 25g protein/serving |
| `low-carb` | < 20g carbs/serving |
| `keto-friendly` | < 10g net carbs |
| `low-fat` | < 10g fat/serving |
| `high-fiber` | > 8g fiber/serving |
| `low-sodium` | < 400mg sodium |

---

## API Endpoints Summary

### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |
| GET | `/api/v1/info` | API info |
| GET | `/api/v1/recipes/suggested` | List suggested recipes |
| POST | `/api/v1/auth/anonymous` | Anonymous auth |
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh token |

### Protected Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/recipes` | List user's recipes |
| POST | `/api/v1/recipes` | Create recipe |
| GET | `/api/v1/recipes/recommendations` | Get recipe recommendations |
| POST | `/api/v1/recipes/extract` | Extract recipe (unified) |
| GET | `/api/v1/recipes/{id}` | Get recipe |
| PUT | `/api/v1/recipes/{id}` | Update recipe |
| DELETE | `/api/v1/recipes/{id}` | Delete recipe |
| POST | `/api/v1/recipes/{id}/favorite` | Toggle favorite |
| POST | `/api/v1/recipes/{id}/save` | Clone/save recipe |
| GET | `/api/v1/jobs` | List jobs |
| GET | `/api/v1/jobs/{id}` | Get job status |
| POST | `/api/v1/jobs/{id}/cancel` | Cancel job |

---

*Last updated: February 2, 2026*
