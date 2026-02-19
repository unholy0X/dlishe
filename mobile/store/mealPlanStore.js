import { create } from "zustand";
import {
  fetchCurrentPlan,
  fetchPlanByWeek,
  addPlanEntry,
  removePlanEntry,
  generateShoppingList,
} from "../services/mealPlan";

function getMondayOfWeek(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  return monday.toISOString().split("T")[0];
}

export const useMealPlanStore = create((set, get) => ({
  plan: null,
  selectedDay: (() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // 0=Mon..6=Sun
  })(),
  weekOffset: 0,
  isLoading: false,
  isGenerating: false,
  error: "",

  loadCurrentWeek: async ({ getToken }) => {
    set({ isLoading: true, error: "" });
    try {
      const plan = await fetchCurrentPlan({ getToken });
      set({ plan, isLoading: false, weekOffset: 0 });
    } catch {
      // Fallback to empty plan with current week so UI still renders
      set({
        plan: { weekStart: getMondayOfWeek(0), entries: [] },
        isLoading: false,
        weekOffset: 0,
      });
    }
  },

  loadWeek: async ({ getToken, weekOffset }) => {
    set({ isLoading: true, error: "" });
    try {
      const date = getMondayOfWeek(weekOffset);
      const plan = await fetchPlanByWeek({ getToken, date });
      set({ plan, isLoading: false, weekOffset });
    } catch (err) {
      set({ error: err?.message || "Failed to load meal plan", isLoading: false });
    }
  },

  setSelectedDay: (dayIndex) => set({ selectedDay: dayIndex }),

  navigateWeek: async ({ getToken, direction }) => {
    const newOffset = get().weekOffset + direction;
    const newWeekStart = getMondayOfWeek(newOffset);

    // Update UI immediately so calendar moves even if API fails
    set((state) => ({
      weekOffset: newOffset,
      selectedDay: 0,
      plan: state.plan
        ? { ...state.plan, weekStart: newWeekStart, entries: [] }
        : { weekStart: newWeekStart, entries: [] },
    }));

    // Then try to load from backend
    try {
      const plan = await fetchPlanByWeek({ getToken, date: newWeekStart });
      set({ plan, isLoading: false });
    } catch {
      // API failed — keep the local state with empty entries
      set({ isLoading: false });
    }
  },

  addEntry: async ({ getToken, recipeId, dayIndex, mealType }) => {
    const { plan } = get();
    if (!plan) return;
    if (!plan.id) {
      const err = new Error("Meal plan not synced yet. Pull down to refresh.");
      set({ error: err.message });
      throw err;
    }
    try {
      const entry = await addPlanEntry({
        getToken,
        planId: plan.id,
        recipeId,
        dayIndex,
        mealType,
      });
      set((state) => ({
        plan: state.plan
          ? { ...state.plan, entries: [...(state.plan.entries || []), entry] }
          : null,
      }));
      return entry;
    } catch (err) {
      set({ error: err?.message || "Failed to add entry" });
      throw err;
    }
  },

  removeEntry: async ({ getToken, entryId }) => {
    const { plan } = get();
    if (!plan) return;

    const prevEntries = plan.entries || [];
    // Optimistic
    set({
      plan: { ...plan, entries: prevEntries.filter((e) => e.id !== entryId) },
    });

    try {
      await removePlanEntry({ getToken, planId: plan.id, entryId });
    } catch (err) {
      // Revert
      set({ plan: { ...plan, entries: prevEntries }, error: err?.message || "Failed to remove entry" });
      throw err;
    }
  },

  generateShoppingList: async ({ getToken }) => {
    const { plan } = get();
    if (!plan) return null;

    set({ isGenerating: true, error: "" });
    try {
      const result = await generateShoppingList({ getToken, planId: plan.id });
      set({ isGenerating: false });
      return result;
    } catch (err) {
      set({ error: err?.message || "Failed to generate shopping list", isGenerating: false });
      throw err;
    }
  },

  clearError: () => set({ error: "" }),
}));
