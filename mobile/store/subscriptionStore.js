import { create } from "zustand";
import Purchases from "react-native-purchases";
import { getSubscription, refreshSubscription } from "../services/subscription";

export const useSubscriptionStore = create((set, get) => ({
  entitlement: "free",
  isActive: false,
  limits: null,
  isLoading: false,
  offerings: null,

  loadSubscription: async ({ getToken }) => {
    set({ isLoading: true });
    try {
      const data = await getSubscription({ getToken });
      set({
        entitlement: data.entitlement || "free",
        isActive: data.isActive || false,
        limits: data.limits || null,
        isLoading: false,
      });
    } catch {
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
    const result = await Purchases.purchasePackage(pkg);
    if (result.customerInfo.entitlements.active["pro"]) {
      // Sync purchase with backend
      await refreshSubscription({ getToken });
      await get().loadSubscription({ getToken });
    }
    return result;
  },

  restorePurchases: async ({ getToken }) => {
    const customerInfo = await Purchases.restorePurchases();
    // Sync with backend regardless of result
    await refreshSubscription({ getToken });
    await get().loadSubscription({ getToken });
    return customerInfo;
  },

  isPro: () => get().entitlement === "pro",
}));
