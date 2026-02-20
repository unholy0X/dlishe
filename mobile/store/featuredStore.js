import { create } from "zustand";
import { fetchFeatured } from "../services/recipes";

export const useFeaturedStore = create((set, get) => ({
  recipes: [],
  total: 0,
  isLoading: false,
  error: "",
  loadId: 0,

  clearCache: () => set((s) => ({ recipes: [], total: 0, isLoading: false, loadId: s.loadId + 1 })),

  loadFeatured: async ({ limit = 30 } = {}) => {
    if (get().isLoading) return;
    const myLoadId = get().loadId;
    set({ isLoading: true, error: "" });
    try {
      const data = await fetchFeatured({ limit, offset: 0 });
      if (get().loadId !== myLoadId) return; // stale request — language changed mid-flight
      set({
        recipes: data.items || [],
        total: data.total || 0,
        isLoading: false,
      });
    } catch (err) {
      if (get().loadId !== myLoadId) return;
      set({
        error: err?.message || "Failed to load featured recipes",
        isLoading: false,
      });
    }
  },
}));
