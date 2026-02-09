import { create } from "zustand";
import { fetchRecipes } from "../services/recipes";

const PAGE_SIZE = 20;

export const useRecipeStore = create((set, get) => ({
  recipes: [],
  total: 0,
  offset: 0,
  isLoading: false,
  isLoadingMore: false,
  error: "",

  loadRecipes: async ({ getToken }) => {
    set({ isLoading: true, error: "" });
    try {
      const data = await fetchRecipes({ getToken, limit: PAGE_SIZE, offset: 0 });
      set({
        recipes: data.items || [],
        total: data.total || 0,
        offset: PAGE_SIZE,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err?.message || "Failed to load recipes",
        isLoading: false,
      });
    }
  },

  loadMore: async ({ getToken }) => {
    const { recipes, total, isLoadingMore, isLoading, offset } = get();
    if (isLoadingMore || isLoading || recipes.length >= total) return;

    set({ isLoadingMore: true });
    try {
      const data = await fetchRecipes({ getToken, limit: PAGE_SIZE, offset });
      const newItems = data.items || [];
      set({
        recipes: [...recipes, ...newItems],
        total: data.total || total,
        offset: offset + PAGE_SIZE,
        isLoadingMore: false,
      });
    } catch (err) {
      set({
        error: err?.message || "Failed to load more recipes",
        isLoadingMore: false,
      });
    }
  },

  refresh: async ({ getToken }) => {
    set({ isLoading: true, error: "" });
    try {
      const { recipes } = get();
      // Reload at least the current count so we don't lose scroll position
      const limit = Math.max(recipes.length, PAGE_SIZE);
      const data = await fetchRecipes({ getToken, limit, offset: 0 });
      set({
        recipes: data.items || [],
        total: data.total || 0,
        offset: data.items?.length || PAGE_SIZE,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err?.message || "Failed to refresh recipes",
        isLoading: false,
      });
    }
  },
}));
