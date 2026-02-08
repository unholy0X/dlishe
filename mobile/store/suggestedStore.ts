import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { Recipe, Ingredient, Instruction } from "@/types";

interface SuggestedState {
  recipes: Recipe[];
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
  loadSuggested: () => Promise<void>;
}

// Map backend recipe JSON → mobile Recipe type
function mapRecipe(r: any): Recipe {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    sourceUrl: r.sourceUrl ?? undefined,
    sourceType: r.sourceType ?? undefined,
    thumbnailUrl: r.thumbnailUrl ?? undefined,
    prepTime: r.prepTime ?? undefined,
    cookTime: r.cookTime ?? undefined,
    servings: r.servings ?? undefined,
    difficulty: r.difficulty ?? undefined,
    cuisine: r.cuisine ?? undefined,
    tags: r.tags ?? [],
    ingredients: (r.ingredients ?? []).map(mapIngredient),
    instructions: (r.steps ?? []).map(mapStep),
    notes: undefined,
    isFavorite: r.isFavorite ?? false,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    cookedCount: 0,
    lastCookedAt: undefined,
  };
}

function mapIngredient(i: any): Ingredient {
  return {
    id: i.id,
    name: i.name,
    amount: i.quantity ?? undefined,
    unit: i.unit ?? undefined,
    notes: i.notes ?? undefined,
    isOptional: i.isOptional ?? false,
    category: i.category ?? "other",
  };
}

function mapStep(s: any): Instruction {
  return {
    id: s.id,
    stepNumber: s.stepNumber,
    text: s.instruction,
    duration: s.durationSeconds ? Math.ceil(s.durationSeconds / 60) : undefined,
    technique: s.technique ?? undefined,
  };
}

export const useSuggestedStore = create<SuggestedState>((set, get) => ({
  recipes: [],
  isLoading: false,
  error: null,
  hasLoaded: false,

  loadSuggested: async () => {
    if (get().hasLoaded) return;

    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<{
        items: any[];
        total: number;
        limit: number;
        offset: number;
      }>("/recipes/suggested?limit=20");

      set({
        recipes: data.items.map(mapRecipe),
        isLoading: false,
        hasLoaded: true,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
