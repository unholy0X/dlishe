import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import Purchases from "react-native-purchases";
import { getSubscription, refreshSubscription } from "../services/subscription";

const STORAGE_KEY = "dlishe_subscription";

// Persist subscription state to survive app restarts
async function persistState(state) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({
      entitlement: state.entitlement,
      isActive: state.isActive,
      limits: state.limits,
    }));
  } catch {
    // Non-fatal — cache miss on next cold start is acceptable
  }
}

export const useSubscriptionStore = create((set, get) => ({
  entitlement: "free",
  isActive: false,
  limits: null,
  isLoading: false,
  offerings: null,

  // Hydrate from SecureStore on cold start (before network call)
  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        set({
          entitlement: cached.entitlement || "free",
          isActive: cached.isActive || false,
          limits: cached.limits || null,
        });
      }
    } catch {
      // Corrupted cache — ignore, will be overwritten on next load
    }
  },

  loadSubscription: async ({ getToken }) => {
    set({ isLoading: true });
    try {
      const data = await getSubscription({ getToken });
      const newState = {
        entitlement: data.entitlement || "free",
        isActive: data.isActive || false,
        limits: data.limits || null,
        isLoading: false,
      };
      set(newState);
      persistState(newState);
    } catch {
      // Keep existing entitlement on error — never downgrade to "free"
      // just because of a transient network failure
      set({ isLoading: false });
    }
  },

  loadOfferings: async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        set({ offerings: offerings.current });
      }
    } catch {
      // Offerings may not be available in dev/simulator
    }
  },

  purchasePackage: async ({ pkg, getToken }) => {
    try {
      const result = await Purchases.purchasePackage(pkg);
      // Purchase succeeded on Apple/Google side.
      // Sync with backend — wrapped in its own try/catch because
      // the purchase already went through. If sync fails, the state
      // will catch up on next app open via loadSubscription or webhook.
      try {
        await refreshSubscription({ getToken });
        await get().loadSubscription({ getToken });
      } catch {
        // Sync failed but purchase succeeded — don't throw
      }
      return result;
    } catch (err) {
      if (err.userCancelled) return null;
      throw err;
    }
  },

  restorePurchases: async ({ getToken }) => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      await refreshSubscription({ getToken });
      await get().loadSubscription({ getToken });
      return customerInfo;
    } catch (err) {
      if (err.userCancelled) return null;
      throw err;
    }
  },
}));
