import { create } from "zustand";
import { fetchFeatured } from "../services/recipes";

export const useFeaturedStore = create((set, get) => ({
  recipes: [],
  total: 0,
  isLoading: false,
  error: "",

  clearCache: () => set({ recipes: [], total: 0 }),

  loadFeatured: async ({ limit = 30 } = {}) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: "" });
    try {
      const data = await fetchFeatured({ limit, offset: 0 });
      set({
        recipes: data.items || [],
        total: data.total || 0,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err?.message || "Failed to load featured recipes",
        isLoading: false,
      });
    }
  },
}));
