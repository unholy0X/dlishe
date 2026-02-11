import { create } from "zustand";
import { fetchRecipes, deleteRecipe, toggleFavorite as toggleFavoriteApi } from "../services/recipes";

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
        recipes: [...get().recipes, ...newItems],
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

  toggleFavorite: async ({ recipeId, getToken }) => {
    const { recipes } = get();
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;

    const newValue = !recipe.isFavorite;

    // Optimistic update
    set({
      recipes: recipes.map((r) =>
        r.id === recipeId ? { ...r, isFavorite: newValue } : r
      ),
    });

    try {
      await toggleFavoriteApi({ recipeId, isFavorite: newValue, getToken });
    } catch {
      // Revert on failure
      set({
        recipes: get().recipes.map((r) =>
          r.id === recipeId ? { ...r, isFavorite: !newValue } : r
        ),
        error: "Couldn't update favorite. Please try again.",
      });
    }
  },

  clearAll: async ({ getToken }) => {
    const { recipes } = get();
    const allIds = recipes.map((r) => r.id);
    if (allIds.length === 0) return;

    // Optimistic: clear immediately
    set({ recipes: [], total: 0, offset: 0 });

    try {
      const results = await Promise.allSettled(
        allIds.map((recipeId) => deleteRecipe({ recipeId, getToken }))
      );
      const failCount = results.filter((r) => r.status === "rejected").length;
      if (failCount > 0) {
        try {
          await get().refresh({ getToken });
        } catch {
          // refresh failed — UI stays empty, error below will inform user
        }
        set({ error: `Failed to remove ${failCount} recipe(s)` });
      }
    } catch (err) {
      try {
        await get().refresh({ getToken });
      } catch {
        // Can't recover — leave error message
      }
      set({ error: err?.message || "Failed to clear recipes" });
    }
  },
}));
