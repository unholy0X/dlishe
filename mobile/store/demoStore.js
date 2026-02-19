import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

// Static demo token embedded at build time via env var.
// Must match DEMO_TOKEN on the backend.
const DEMO_TOKEN = process.env.EXPO_PUBLIC_DEMO_TOKEN || "";

const STORAGE_KEY = "dlishe_demo_mode";

export const useDemoStore = create((set) => ({
  isDemoMode: false,

  // Call once on app start to restore demo mode across restarts.
  hydrate: async () => {
    try {
      const val = await SecureStore.getItemAsync(STORAGE_KEY);
      if (val === "1") {
        set({ isDemoMode: true });
      }
    } catch {
      // SecureStore unavailable — demo mode defaults to off
    }
  },

  // Activate demo mode and persist the flag.
  activate: async () => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, "1");
    } catch {
      // Non-fatal — demo mode will still work for this session
    }
    set({ isDemoMode: true });
  },

  // Deactivate demo mode and clear the persisted flag.
  deactivate: async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch {
      // Non-fatal
    }
    set({ isDemoMode: false });
  },

  // Returns the static demo Bearer token to send to the backend.
  getToken: () => DEMO_TOKEN,
}));
