import { create } from "zustand";
import { fetchSuggested } from "../services/recipes";

export const useSuggestedStore = create((set, get) => ({
  recipes: [],
  total: 0,
  isLoading: false,
  error: "",

  loadSuggested: async ({ limit = 10 } = {}) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: "" });
    try {
      const data = await fetchSuggested({ limit, offset: 0 });
      set({
        recipes: data.items || [],
        total: data.total || 0,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err?.message || "Failed to load suggestions",
        isLoading: false,
      });
    }
  },
}));
