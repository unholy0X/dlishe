import { create } from "zustand";
import { fetchSuggested } from "../services/recipes";

export const useSuggestedStore = create((set, get) => ({
  recipes: [],
  allRecipes: [],
  total: 0,
  isLoading: false,
  isLoadingAll: false,
  error: "",
  loadId: 0,

  clearCache: () => set((s) => ({ recipes: [], allRecipes: [], total: 0, isLoading: false, isLoadingAll: false, loadId: s.loadId + 1 })),

  loadSuggested: async ({ limit = 10 } = {}) => {
    if (get().isLoading) return;
    const myLoadId = get().loadId;
    set({ isLoading: true, error: "" });
    try {
      const data = await fetchSuggested({ limit, offset: 0 });
      if (get().loadId !== myLoadId) return; // stale — language changed mid-flight
      set({
        recipes: data.items || [],
        total: data.total || 0,
        isLoading: false,
      });
    } catch (err) {
      if (get().loadId !== myLoadId) return;
      set({
        error: err?.message || "Failed to load suggestions",
        isLoading: false,
      });
    }
  },

  loadAll: async () => {
    if (get().isLoadingAll) return;
    const myLoadId = get().loadId;
    set({ isLoadingAll: true });
    try {
      const data = await fetchSuggested({ limit: 50, offset: 0 });
      if (get().loadId !== myLoadId) return; // stale — language changed mid-flight
      set({
        allRecipes: data.items || [],
        total: data.total || 0,
        isLoadingAll: false,
      });
    } catch (err) {
      if (get().loadId !== myLoadId) return;
      set({
        error: err?.message || "Failed to load recipes",
        isLoadingAll: false,
      });
    }
  },
}));
