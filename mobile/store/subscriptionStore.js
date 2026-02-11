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
    try {
      const result = await Purchases.purchasePackage(pkg);
      if (result?.customerInfo?.entitlements?.active?.["pro"]) {
        await refreshSubscription({ getToken });
        await get().loadSubscription({ getToken });
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
