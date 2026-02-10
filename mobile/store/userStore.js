import { create } from "zustand";
import { Alert } from "react-native";
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
    const previous = get().preferredUnitSystem;
    set({ preferredUnitSystem });
    try {
      await updatePrefsApi({ preferredUnitSystem, getToken });
    } catch (err) {
      set({ preferredUnitSystem: previous });
      Alert.alert("Error", err?.message || "Failed to save preferences");
    }
  },

  clearUser: () =>
    set({ firstName: "", lastName: "", imageUrl: null, preferredUnitSystem: "metric" }),
}));
