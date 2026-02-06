// Import canonical category types from single source of truth
import { VALID_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS, type PantryCategory } from './categories';
export { VALID_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS, type PantryCategory };

export interface PantryItem {
    id: string;
    userId: string;
    name: string;
    category: PantryCategory;
    quantity?: number;
    unit?: string;
    expirationDate?: string; // ISO Date string
    syncVersion: number;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}

export interface PantryItemInput {
    name: string;
    category: PantryCategory;
    quantity?: number;
    unit?: string;
    expirationDate?: string;
}

export interface PantryResponse {
    items: PantryItem[];

    count: number;
}

export interface ShoppingList {
    id: string;
    userId: string;
    name: string;
    description?: string;
    icon?: string;
    isTemplate: boolean;
    isArchived: boolean;
    syncVersion: number;
    createdAt: string;
    updatedAt: string;
}

export interface ShoppingItem {
    id: string;
    listId: string;
    name: string;
    quantity?: number;
    unit?: string;
    category?: PantryCategory;
    isChecked: boolean;
    recipeName?: string;
    syncVersion: number;
    createdAt: string;
    updatedAt: string;
}

export interface ShoppingListWithItems extends ShoppingList {
    items: ShoppingItem[];
}

export interface ShoppingListInput {
    name: string;
    description?: string;
    icon?: string;
    isTemplate?: boolean;
}

export interface ShoppingItemInput {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    recipeName?: string;
}

export interface ShoppingListsResponse {
    lists: ShoppingList[];
    count: number;
}

export interface ShoppingItemsResponse {
    items: ShoppingItem[];
    count: number;
    warnings?: string[];
}

export type ResourceType = 'pantry_item' | 'shopping_list' | 'shopping_item' | 'recipe';

export interface SyncRequest {
    lastSyncTimestamp: string; // ISO
    changes: ChangeItem[];
}

export interface ChangeItem {
    id: string; // UUID
    type: ResourceType;
    action: 'create' | 'update' | 'delete';
    data: any; // JSON string in backend, but here actual object? Backend expects serialized JSON string in "Data" field if it's generic?
    // Let's check backend model.
    updatedAt: string;
}

// Backend SyncRequest:
// type SyncRequest struct {
//    ClientID          string       `json:"clientId"`
//    LastSyncTimestamp time.Time    `json:"lastSyncTimestamp"`
//    Changes           []ChangeItem `json:"changes"`
// }
// type ChangeItem struct {
//    ID           uuid.UUID       `json:"id"`
//    Type         ResourceType    `json:"type"`
//    Action       ActionType      `json:"action"`
//    Data         json.RawMessage `json:"data"`
//    ClientTime   time.Time       `json:"clientTime"`
// }

// So payload should match.

export interface SyncResponse {
    serverTimestamp: string;
    changes: ServerChangeItem[];
    conflicts: Conflict[];
}

export interface ServerChangeItem {
    id: string;
    type: ResourceType;
    action: 'create' | 'update' | 'delete';
    data: any;
    updatedAt: string;
}

export interface Conflict {
    id: string;
    type: ResourceType;
    serverVersion: any;
    clientVersion: any;
    resolution: 'server' | 'client' | 'manual';
    resolvedData?: any;
}

export interface ListAnalysisResult {
    suggestions: ListSuggestion[];
    missingEssentials: string[];
    categoryOptimizations: CategoryOptimization[];
}

export interface ListSuggestion {
    type: 'duplicate' | 'merge' | 'general';
    message: string;
    itemNames?: string[];
    actionLabel?: string;
}

export interface CategoryOptimization {
    itemName: string;
    currentCategory: string;
    newCategory: string;
    reason: string;
}

export interface AnalyzeAddResponse {
    analysis: ListAnalysisResult;
    proposedItems: ShoppingItem[];
}

// ============================================================================
// Recipe Nutrition & Dietary Types (NEW - Backend Enrichment)
// ============================================================================

export interface RecipeNutrition {
    calories?: number;      // kcal per serving
    protein?: number;       // grams
    carbs?: number;         // grams
    fat?: number;           // grams
    fiber?: number;         // grams
    sugar?: number;         // grams
    sodium?: number;        // mg
    tags?: string[];        // e.g., "high-protein", "low-carb", "keto-friendly"
    confidence?: number;    // AI confidence 0-1
}

export interface DietaryInfo {
    isVegetarian?: boolean;
    isVegan?: boolean;
    isGlutenFree?: boolean;
    isDairyFree?: boolean;
    isNutFree?: boolean;
    isKeto?: boolean;
    isHalal?: boolean | null;
    isKosher?: boolean | null;
    allergens?: string[];   // e.g., ["dairy", "eggs", "nuts"]
    mealTypes?: string[];   // e.g., ["breakfast", "lunch", "dinner"]
    confidence?: number;
}

// ============================================================================
// Recipe Extraction & Jobs (NEW - Unified Endpoint)
// ============================================================================

export interface ExtractRequest {
    type: 'url' | 'image' | 'video';
    url?: string;
    imageBase64?: string;
    mimeType?: string;
    language?: 'en' | 'fr' | 'es' | 'auto';
    detailLevel?: 'quick' | 'detailed';
    saveAuto?: boolean;
}

export interface Job {
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
        retryable?: boolean;
    };
    createdAt: string;
    completedAt?: string;
    estimatedSeconds?: number;
}

export type JobsResponse = Job[];

// ============================================================================
// Recipe Recommendations (NEW)
// ============================================================================

export interface RecommendationFilters {
    mealType?: string;      // breakfast, lunch, dinner, snack, dessert
    maxTime?: number;       // minutes
    cuisine?: string;       // italian, asian, mexican, etc.
    mood?: string;          // quick, comfort, healthy, indulgent
    diet?: string;          // vegetarian, vegan, keto, halal, kosher, pescatarian, paleo
    exclude?: string[];     // allergens: gluten, dairy, nuts, peanuts, shellfish, eggs, soy, fish, pork, sesame
    maxCalories?: number;
    minProtein?: number;
    maxCarbs?: number;
    maxFat?: number;
    minMatch?: number;      // minimum ingredient match percentage (default: 50)
    limit?: number;         // max results per category
}

export interface IngredientMatch {
    recipeIngredient: string;
    pantryItem: string;
    isSubstitute: boolean;
    substituteRatio?: string;
}

export interface SubstituteSuggestion {
    item: string;
    ratio: string;
    notes?: string;
    source: 'pantry' | 'common';
}

export interface MissingIngredient {
    ingredient: string;
    canSkip: boolean;
    category?: string;
    substitutes?: SubstituteSuggestion[];
}

export interface RecipeRecommendation {
    recipe: Recipe;
    matchScore: number;         // 0-100 percentage
    matchedIngredients: IngredientMatch[];
    missingIngredients: MissingIngredient[];
    shoppingListItems: string[];
    reason: string;             // why this was recommended
    nutritionPerServing?: RecipeNutrition;
    filtersMatched: string[];   // filters where recipe has data AND matches
    filtersUnknown: string[];   // filters where recipe lacks data
    filtersNotMatched: string[]; // filters where recipe has data but doesn't match
}

export interface RecipeQuickInfo {
    id: string;
    title: string;
    value: number;
    valueUnit: string; // e.g., "min", "g", "%"
}

export interface RecommendationSummary {
    totalRecipes: number;
    avgCaloriesPerServing?: number;
    quickestRecipe?: RecipeQuickInfo;
    highestProtein?: RecipeQuickInfo;
    bestMatch?: RecipeQuickInfo;
}

export interface RecommendationResponse {
    readyToCook: RecipeRecommendation[];    // 90-100% match
    almostReady: RecipeRecommendation[];    // 70-89% match
    needsShopping: RecipeRecommendation[];  // 50-69% match
    summary: RecommendationSummary;
    filters: {
        appliedMealType?: string;
        appliedMaxTime?: number;
        appliedCuisine?: string;
        appliedDiet?: string;
        appliedExclusions?: string[];
        appliedMood?: string;
        nutritionFilters?: {
            maxCalories?: number;
            minProtein?: number;
            maxCarbs?: number;
            maxFat?: number;
        };
    };
}

// ============================================================================
// Recipe Types (Extended)
// ============================================================================

export interface Recipe {
    id: string;
    userId: string;
    title: string;
    description?: string;
    servings?: number;
    prepTime?: number;
    cookTime?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    cuisine?: string;
    tags?: string[];
    thumbnailUrl?: string;
    sourceType: 'manual' | 'video' | 'webpage' | 'image' | 'cloned';
    sourceUrl?: string;
    sourceRecipeId?: string;    // NEW - ID of original recipe if cloned
    isPublic: boolean;          // NEW - true for suggested/curated recipes
    isFavorite: boolean;
    nutrition?: RecipeNutrition;    // NEW
    dietaryInfo?: DietaryInfo;      // NEW
    syncVersion: number;
    createdAt: string;
    updatedAt: string;
    ingredients?: RecipeIngredient[];
    steps?: RecipeStep[];
    ingredientCount?: number;
    stepCount?: number;
}

export interface RecipeIngredient {
    id: string;
    recipeId: string;
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    section?: string; // e.g. "Dough", "Sauce"
    notes?: string;
    isOptional?: boolean;
    sortOrder?: number;
    videoTimestamp?: number;
    createdAt: string;
}

export interface RecipeStep {
    id: string;
    recipeId: string;
    stepNumber: number;
    instruction: string;
    durationSeconds?: number;
    temperature?: string;
    technique?: string;
    videoTimestampStart?: number;
    videoTimestampEnd?: number;
    createdAt: string;
}

export interface RecipesResponse {
    items: Recipe[];
    count: number;
    total?: number;
    limit?: number;
    offset?: number;
}
