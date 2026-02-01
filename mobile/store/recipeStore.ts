// Recipe Store - Zustand state management
import { create } from 'zustand';
import type { Recipe } from '@/types';
import * as db from '@/lib/database';

interface RecipeState {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
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
  
  loadRecipes: async () => {
    set({ isLoading: true, error: null });
    try {
      const recipes = await db.getAllRecipes();
      set({ recipes, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  addRecipe: async (recipeData) => {
    set({ isLoading: true, error: null });
    try {
      const newRecipe = await db.createRecipe(recipeData);
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
    try {
      await db.updateRecipe(id, updates);
      set((state) => ({
        recipes: state.recipes.map((r) =>
          r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  deleteRecipe: async (id) => {
    try {
      await db.deleteRecipe(id);
      set((state) => ({
        recipes: state.recipes.filter((r) => r.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  toggleFavorite: async (id) => {
    try {
      const isFavorite = await db.toggleFavorite(id);
      set((state) => ({
        recipes: state.recipes.map((r) =>
          r.id === id ? { ...r, isFavorite } : r
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  markAsCooked: async (id) => {
    try {
      await db.incrementCookedCount(id);
      const now = new Date().toISOString();
      set((state) => ({
        recipes: state.recipes.map((r) =>
          r.id === id
            ? { ...r, cookedCount: r.cookedCount + 1, lastCookedAt: now }
            : r
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  getRecipeById: (id) => {
    return get().recipes.find((r) => r.id === id);
  },
}));
