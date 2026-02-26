import { create } from "zustand";
import {
  fetchRecipes,
  deleteRecipe,
  deleteAllRecipes,
  toggleFavorite as toggleFavoriteApi,
} from "../services/recipes";

function friendlyNetworkError(err, fallback) {
  const msg = (err?.message || "").toLowerCase();
  if (msg.includes("network request failed") || msg.includes("failed to fetch"))
    return "No internet connection. Please check your network and try again.";
  return err?.message || fallback;
}

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
        error: friendlyNetworkError(err, "Failed to load recipes"),
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
        error: friendlyNetworkError(err, "Failed to load more recipes"),
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
        error: friendlyNetworkError(err, "Failed to refresh recipes"),
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
    // Optimistic: wipe local state immediately for instant feedback.
    set({ recipes: [], total: 0, offset: 0 });

    try {
      // Single bulk DELETE — atomically soft-deletes ALL user recipes on the
      // backend regardless of how many are currently loaded in the store.
      await deleteAllRecipes({ getToken });
    } catch (err) {
      // Rollback: reload whatever is still on the server.
      try {
        await get().refresh({ getToken });
      } catch {
        // If the refresh also fails the user is likely offline; the error
        // message below is sufficient — do not cascade another state change.
      }
      set({ error: friendlyNetworkError(err, "Failed to clear recipes") });
    }
  },
}));
