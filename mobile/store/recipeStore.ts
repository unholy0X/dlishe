// Recipe Store - Zustand state management with Backend API
import { create } from 'zustand';
import { authFetch, type GetTokenFn } from '@/lib/api';
import type { Recipe, Ingredient, Instruction } from '@/types';

// Backend API response types
interface BackendRecipe {
  id: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  sourceType?: string;
  thumbnailUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: "easy" | "medium" | "hard";
  cuisine?: string;
  tags?: string[];
  notes?: string;
  isFavorite?: boolean;
  cookedCount?: number;
  lastCookedAt?: string;
  createdAt: string;
  updatedAt: string;
  ingredients: BackendIngredient[];
  steps: BackendStep[];
}

interface BackendIngredient {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  section?: string;
  notes?: string;
  isOptional?: boolean;
}

interface BackendStep {
  id: string;
  stepNumber: number;
  instruction: string;
  durationSeconds?: number;
  technique?: string;
  tip?: string;
}

interface RecipeListResponse {
  items: BackendRecipe[];
  total: number;
  limit: number;
  offset: number;
}

// Convert backend recipe to local Recipe type
function mapBackendToLocal(backend: BackendRecipe): Recipe {
  return {
    id: backend.id,
    title: backend.title,
    description: backend.description,
    sourceUrl: backend.sourceUrl,
    sourceType: backend.sourceType as any,
    thumbnailUrl: backend.thumbnailUrl,
    prepTime: backend.prepTime,
    cookTime: backend.cookTime,
    servings: backend.servings,
    difficulty: backend.difficulty,
    cuisine: backend.cuisine,
    tags: backend.tags,
    notes: backend.notes,
    isFavorite: backend.isFavorite || false,
    cookedCount: backend.cookedCount || 0,
    lastCookedAt: backend.lastCookedAt,
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
    ingredients: backend.ingredients?.map(ing => ({
      id: ing.id,
      name: ing.name,
      amount: ing.quantity,
      unit: ing.unit,
      category: ing.category as any,
      notes: ing.notes,
    })) || [],
    instructions: backend.steps?.map(step => ({
      id: step.id,
      stepNumber: step.stepNumber,
      text: step.instruction,
      technique: step.technique,
      tip: step.tip,
    })) || [],
  };
}

// Convert local recipe to backend format for create/update
function mapLocalToBackend(recipe: Partial<Recipe>): Partial<BackendRecipe> {
  return {
    title: recipe.title,
    description: recipe.description,
    sourceUrl: recipe.sourceUrl,
    sourceType: recipe.sourceType,
    thumbnailUrl: recipe.thumbnailUrl,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    cuisine: recipe.cuisine,
    tags: recipe.tags,
    notes: recipe.notes,
    isFavorite: recipe.isFavorite,
    ingredients: recipe.ingredients?.map(ing => ({
      id: ing.id,
      name: ing.name,
      quantity: ing.amount,
      unit: ing.unit,
      category: ing.category,
      notes: ing.notes,
    })) as any,
    steps: recipe.instructions?.map(inst => ({
      id: inst.id,
      stepNumber: inst.stepNumber,
      instruction: inst.text,
      technique: inst.technique,
      tip: inst.tip,
    })) as any,
  };
}

interface RecipeState {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  getToken: GetTokenFn | null;

  // Actions
  setGetToken: (fn: GetTokenFn) => void;
  loadRecipes: () => Promise<void>;
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'cookedCount'>) => Promise<Recipe>;
  updateRecipe: (id: string, updates: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  markAsCooked: (id: string) => Promise<void>;
  getRecipeById: (id: string) => Recipe | undefined;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  isLoading: false,
  error: null,
  getToken: null,

  setGetToken: (fn) => {
    set({ getToken: fn });
  },

  loadRecipes: async () => {
    const { getToken } = get();
    if (!getToken) {
      console.log("[RecipeStore] No getToken function available");
      set({ error: "Not authenticated" });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      console.log("[RecipeStore] Fetching recipes from backend...");
      // Fetch all recipes (use high limit to get all)
      const response = await authFetch<RecipeListResponse>(
        "/recipes?limit=50",
        getToken
      );

      console.log("[RecipeStore] API response:", JSON.stringify(response, null, 2));
      console.log("[RecipeStore] Items count:", response.items?.length ?? 0);

      const recipes = (response.items || []).map(mapBackendToLocal);
      console.log("[RecipeStore] Mapped recipes:", recipes.length);
      set({ recipes, isLoading: false });
    } catch (error) {
      console.error("[RecipeStore] Error loading recipes:", error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addRecipe: async (recipeData) => {
    const { getToken } = get();
    if (!getToken) {
      throw new Error("Not authenticated");
    }

    set({ isLoading: true, error: null });
    try {
      const backendData = mapLocalToBackend(recipeData as any);
      const created = await authFetch<BackendRecipe>(
        "/recipes",
        getToken,
        {
          method: "POST",
          body: JSON.stringify(backendData),
        }
      );

      const newRecipe = mapBackendToLocal(created);
      set((state) => ({
        recipes: [newRecipe, ...state.recipes],
        isLoading: false,
      }));
      return newRecipe;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateRecipe: async (id, updates) => {
    const { getToken, recipes } = get();
    if (!getToken) {
      throw new Error("Not authenticated");
    }

    try {
      const existing = recipes.find(r => r.id === id);
      if (!existing) {
        throw new Error("Recipe not found");
      }

      const merged = { ...existing, ...updates };
      const backendData = mapLocalToBackend(merged);

      const updated = await authFetch<BackendRecipe>(
        `/recipes/${id}`,
        getToken,
        {
          method: "PUT",
          body: JSON.stringify(backendData),
        }
      );

      const updatedRecipe = mapBackendToLocal(updated);
      set((state) => ({
        recipes: state.recipes.map((r) =>
          r.id === id ? updatedRecipe : r
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteRecipe: async (id) => {
    const { getToken } = get();
    if (!getToken) {
      throw new Error("Not authenticated");
    }

    try {
      await authFetch<void>(
        `/recipes/${id}`,
        getToken,
        { method: "DELETE" }
      );

      set((state) => ({
        recipes: state.recipes.filter((r) => r.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  toggleFavorite: async (id) => {
    const { getToken, recipes } = get();
    if (!getToken) {
      throw new Error("Not authenticated");
    }

    try {
      const recipe = recipes.find(r => r.id === id);
      if (!recipe) {
        throw new Error("Recipe not found");
      }

      const newFavoriteStatus = !recipe.isFavorite;

      await authFetch<{ success: boolean; isFavorite: boolean }>(
        `/recipes/${id}/favorite`,
        getToken,
        {
          method: "POST",
          body: JSON.stringify({ isFavorite: newFavoriteStatus }),
        }
      );

      set((state) => ({
        recipes: state.recipes.map((r) =>
          r.id === id ? { ...r, isFavorite: newFavoriteStatus } : r
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  markAsCooked: async (id) => {
    // Note: Backend might not have this endpoint yet
    // For now, just update local state optimistically
    const { recipes } = get();
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;

    const now = new Date().toISOString();
    set((state) => ({
      recipes: state.recipes.map((r) =>
        r.id === id
          ? { ...r, cookedCount: (r.cookedCount || 0) + 1, lastCookedAt: now }
          : r
      ),
    }));
  },

  getRecipeById: (id) => {
    return get().recipes.find((r) => r.id === id);
  },
}));
