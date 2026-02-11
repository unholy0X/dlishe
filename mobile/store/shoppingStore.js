import { create } from "zustand";
import {
    fetchShoppingLists,
    createShoppingList,
    deleteShoppingList,
    fetchShoppingList,
    addShoppingItem,
    deleteShoppingItem,
    toggleItemChecked,
    completeList,
    smartMergeLists,
} from "../services/shopping";

export const useShoppingStore = create((set, get) => ({
    lists: [],
    activeList: null,
    isLoading: false,
    isLoadingDetails: false,
    isMerging: false,
    error: "",

    // Load all shopping lists (preserves locally-computed counts)
    loadLists: async ({ getToken }) => {
        set({ isLoading: true, error: "" });
        try {
            const data = await fetchShoppingLists({ getToken });
            const serverLists = Array.isArray(data) ? data : (data?.lists || data?.data || []);
            // Build a map of existing local counts keyed by list id
            const existing = {};
            for (const l of get().lists) {
                if (l.itemCount != null) {
                    existing[l.id] = { itemCount: l.itemCount, checkedCount: l.checkedCount || 0 };
                }
            }
            // Merge: keep local counts if server doesn't provide them
            const merged = serverLists.map((sl) => {
                const local = existing[sl.id];
                if (local && sl.itemCount == null) {
                    return { ...sl, itemCount: local.itemCount, checkedCount: local.checkedCount };
                }
                return sl;
            });
            set({ lists: merged, isLoading: false });
        } catch (err) {
            set({ error: err?.message || "Failed to load lists", isLoading: false });
        }
    },

    // Create a new shopping list
    createList: async ({ getToken, name, icon, description }) => {
        try {
            const newList = await createShoppingList({ getToken, name, icon, description });
            set((state) => ({ lists: [{ ...newList, itemCount: 0, checkedCount: 0 }, ...state.lists] }));
            return newList;
        } catch (err) {
            set({ error: err?.message || "Failed to create list" });
            throw err;
        }
    },

    // Delete a shopping list
    deleteList: async ({ getToken, listId }) => {
        try {
            await deleteShoppingList({ getToken, listId });
            set((state) => ({
                lists: state.lists.filter((l) => l.id !== listId),
            }));
        } catch (err) {
            set({ error: err?.message || "Failed to delete list" });
            throw err;
        }
    },

    // Delete multiple shopping lists (parallel)
    deleteLists: async ({ getToken, listIds }) => {
        // Optimistic: remove all immediately
        const prevLists = get().lists;
        set((state) => ({
            lists: state.lists.filter((l) => !listIds.includes(l.id)),
        }));
        // Fire all deletes in parallel
        const results = await Promise.allSettled(
            listIds.map((listId) => deleteShoppingList({ getToken, listId }))
        );
        const failedIds = listIds.filter((_, i) => results[i].status === "rejected");
        if (failedIds.length > 0) {
            // Restore only the ones that failed
            const failedLists = prevLists.filter((l) => failedIds.includes(l.id));
            set((state) => ({
                lists: [...state.lists, ...failedLists],
                error: `Failed to delete ${failedIds.length} list(s)`,
            }));
            throw new Error(`Failed to delete ${failedIds.length} list(s)`);
        }
    },

    // Load list details with items
    loadListDetails: async ({ getToken, listId }) => {
        set({ isLoadingDetails: true, error: "" });
        try {
            const data = await fetchShoppingList({ getToken, listId });
            set({ activeList: data, isLoadingDetails: false });
            get()._syncListCounts();
        } catch (err) {
            set({ error: err?.message || "Failed to load list", isLoadingDetails: false });
            throw err;
        }
    },

    // Sync activeList counts back into the lists array
    _syncListCounts: () => {
        const { activeList, lists } = get();
        if (!activeList) return;
        const items = activeList.items || [];
        const itemCount = items.length;
        const checkedCount = items.filter((i) => i.isChecked).length;
        set({
            lists: lists.map((l) =>
                l.id === activeList.id ? { ...l, itemCount, checkedCount } : l
            ),
        });
    },

    // Clear active list (syncs counts first)
    clearActiveList: () => {
        get()._syncListCounts();
        set({ activeList: null });
    },

    // Add item to active list
    addItem: async ({ getToken, listId, name, quantity, unit, category }) => {
        try {
            const item = await addShoppingItem({ getToken, listId, name, quantity, unit, category });
            set((state) => ({
                activeList: state.activeList
                    ? { ...state.activeList, items: [...(state.activeList.items || []), item] }
                    : null,
            }));
            get()._syncListCounts();
            return item;
        } catch (err) {
            set({ error: err?.message || "Failed to add item" });
            throw err;
        }
    },

    // Remove item from active list
    removeItem: async ({ getToken, listId, itemId }) => {
        const prevList = get().activeList;
        if (prevList) {
            set({
                activeList: {
                    ...prevList,
                    items: (prevList.items || []).filter((i) => i.id !== itemId),
                },
            });
            get()._syncListCounts();
        }
        try {
            await deleteShoppingItem({ getToken, listId, itemId });
        } catch (err) {
            set({ activeList: prevList, error: err?.message || "Failed to delete item" });
            get()._syncListCounts();
            throw err;
        }
    },

    // Toggle item checked
    toggleChecked: async ({ getToken, listId, itemId }) => {
        const prevList = get().activeList;
        if (prevList) {
            set({
                activeList: {
                    ...prevList,
                    items: (prevList.items || []).map((i) =>
                        i.id === itemId ? { ...i, isChecked: !i.isChecked } : i
                    ),
                },
            });
            get()._syncListCounts();
        }
        try {
            await toggleItemChecked({ getToken, listId, itemId });
        } catch (err) {
            set({ activeList: prevList, error: err?.message || "Failed to toggle item" });
            get()._syncListCounts();
            throw err;
        }
    },

    // Complete list (check all + archive)
    completeActiveList: async ({ getToken, listId }) => {
        try {
            await completeList({ getToken, listId });
            set((state) => ({
                lists: state.lists.filter((l) => l.id !== listId),
                activeList: null,
            }));
        } catch (err) {
            set({ error: err?.message || "Failed to complete list" });
            throw err;
        }
    },

    // Smart merge multiple lists
    mergeLists: async ({ getToken, sourceListIds }) => {
        set({ isMerging: true, error: "" });
        try {
            const merged = await smartMergeLists({ getToken, sourceListIds });
            // Add new merged list and reload to get fresh data
            set((state) => ({
                isMerging: false,
                lists: [
                    { ...merged, itemCount: merged.items?.length || 0, checkedCount: 0 },
                    ...state.lists,
                ],
            }));
            return merged;
        } catch (err) {
            set({ error: err?.message || "Failed to merge lists", isMerging: false });
            throw err;
        }
    },

    clearError: () => set({ error: "" }),
}));
