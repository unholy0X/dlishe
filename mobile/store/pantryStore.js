import { create } from "zustand";
import { fetchPantryItems, createPantryItem, deletePantryItem, scanPantryImage } from "../services/pantry";

export const usePantryStore = create((set, get) => ({
    groups: [],
    total: 0,
    isLoading: false,
    isScanning: false,
    error: "",
    scanResult: null,

    loadPantry: async ({ getToken }) => {
        set({ isLoading: true, error: "" });
        try {
            const data = await fetchPantryItems({ getToken });
            set({
                groups: data.groups || [],
                total: data.total || 0,
                isLoading: false,
            });
        } catch (err) {
            set({
                error: err?.message || "Failed to load pantry",
                isLoading: false,
            });
        }
    },

    addItem: async ({ getToken, name, category, quantity, unit }) => {
        try {
            const item = await createPantryItem({ getToken, name, category, quantity, unit });
            // Refresh the list to show the new item in correct group
            await get().loadPantry({ getToken });
            return item;
        } catch (err) {
            set({ error: err?.message || "Failed to add item" });
            throw err;
        }
    },

    removeItem: async ({ getToken, itemId }) => {
        try {
            await deletePantryItem({ getToken, itemId });
            // Optimistically remove from local state
            set((state) => {
                const newGroups = state.groups
                    .map((g) => ({
                        ...g,
                        items: (g.items || []).filter((i) => i.id !== itemId),
                        count: (g.items || []).filter((i) => i.id !== itemId).length,
                    }))
                    .filter((g) => g.count > 0);
                return {
                    groups: newGroups,
                    total: state.total - 1,
                };
            });
        } catch (err) {
            set({ error: err?.message || "Failed to remove item" });
            throw err;
        }
    },

    scanImage: async ({ getToken, images }) => {
        set({ isScanning: true, error: "", scanResult: null });
        try {
            const result = await scanPantryImage({ getToken, images, autoAdd: true });
            set({ scanResult: result, isScanning: false });
            // Refresh pantry to show newly added items
            await get().loadPantry({ getToken });
            return result;
        } catch (err) {
            set({
                error: err?.message || "Scan failed",
                isScanning: false,
            });
            throw err;
        }
    },

    // Clear all pantry items (delete every item across all groups)
    clearPantry: async ({ getToken }) => {
        const { groups } = get();
        const allIds = groups.flatMap((g) => (g.items || []).map((i) => i.id));
        if (allIds.length === 0) return;

        // Optimistic: clear immediately
        set({ groups: [], total: 0 });

        try {
            const results = await Promise.allSettled(
                allIds.map((itemId) => deletePantryItem({ getToken, itemId }))
            );
            const failCount = results.filter((r) => r.status === "rejected").length;
            if (failCount > 0) {
                try {
                    await get().loadPantry({ getToken });
                } catch {
                    // reload failed — UI stays empty, error below will inform user
                }
                set({ error: `Failed to remove ${failCount} item(s)` });
            }
        } catch (err) {
            try {
                await get().loadPantry({ getToken });
            } catch {
                // Can't recover — leave error message
            }
            set({ error: err?.message || "Failed to clear pantry" });
        }
    },

    clearError: () => set({ error: "" }),
    clearScanResult: () => set({ scanResult: null }),
}));
