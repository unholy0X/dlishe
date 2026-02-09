import { create } from "zustand";
import { updatePreferences as updatePrefsApi } from "../services/user";

export const useUserStore = create((set, get) => ({
  firstName: "",
  lastName: "",
  imageUrl: null,
  preferredUnitSystem: "metric",

  setUser: (firstName, lastName, imageUrl) =>
    set({ firstName, lastName, imageUrl: imageUrl || null }),

  setPreferredUnitSystem: (preferredUnitSystem) =>
    set({ preferredUnitSystem }),

  updatePreferences: async ({ preferredUnitSystem, getToken }) => {
    set({ preferredUnitSystem });
    try {
      await updatePrefsApi({ preferredUnitSystem, getToken });
    } catch {
      // Revert on failure would be ideal but keep it simple for now
    }
  },

  clearUser: () =>
    set({ firstName: "", lastName: "", imageUrl: null, preferredUnitSystem: "metric" }),
}));
