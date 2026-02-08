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
} from "../services/shopping";

export const useShoppingStore = create((set, get) => ({
    lists: [],
    activeList: null,
    isLoading: false,
    isLoadingDetails: false,
    error: "",

    // Load all shopping lists
    loadLists: async ({ getToken }) => {
        set({ isLoading: true, error: "" });
        try {
            const data = await fetchShoppingLists({ getToken });
            // Handle various response shapes: array, { lists: [...] }, { data: [...] }, or null
            const lists = Array.isArray(data) ? data : (data?.lists || data?.data || []);
            set({ lists, isLoading: false });
        } catch (err) {
            set({ error: err?.message || "Failed to load lists", isLoading: false, lists: [] });
        }
    },

    // Create a new shopping list
    createList: async ({ getToken, name, icon, description }) => {
        try {
            const newList = await createShoppingList({ getToken, name, icon, description });
            set((state) => ({ lists: [newList, ...state.lists] }));
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

    // Load list details with items
    loadListDetails: async ({ getToken, listId }) => {
        set({ isLoadingDetails: true, error: "" });
        try {
            const data = await fetchShoppingList({ getToken, listId });
            set({ activeList: data, isLoadingDetails: false });
        } catch (err) {
            set({ error: err?.message || "Failed to load list", isLoadingDetails: false });
            throw err;
        }
    },

    // Clear active list
    clearActiveList: () => set({ activeList: null }),

    // Add item to active list
    addItem: async ({ getToken, listId, name, quantity, unit, category }) => {
        try {
            const item = await addShoppingItem({ getToken, listId, name, quantity, unit, category });
            set((state) => ({
                activeList: state.activeList
                    ? { ...state.activeList, items: [...(state.activeList.items || []), item] }
                    : null,
            }));
            return item;
        } catch (err) {
            set({ error: err?.message || "Failed to add item" });
            throw err;
        }
    },

    // Remove item from active list
    removeItem: async ({ getToken, listId, itemId }) => {
        // Optimistic update
        const prevList = get().activeList;
        if (prevList) {
            set({
                activeList: {
                    ...prevList,
                    items: prevList.items.filter((i) => i.id !== itemId),
                },
            });
        }
        try {
            await deleteShoppingItem({ getToken, listId, itemId });
        } catch (err) {
            set({ activeList: prevList, error: err?.message || "Failed to delete item" });
            throw err;
        }
    },

    // Toggle item checked
    toggleChecked: async ({ getToken, listId, itemId }) => {
        // Optimistic update
        const prevList = get().activeList;
        if (prevList) {
            set({
                activeList: {
                    ...prevList,
                    items: prevList.items.map((i) =>
                        i.id === itemId ? { ...i, isChecked: !i.isChecked } : i
                    ),
                },
            });
        }
        try {
            await toggleItemChecked({ getToken, listId, itemId });
        } catch (err) {
            set({ activeList: prevList, error: err?.message || "Failed to toggle item" });
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

    clearError: () => set({ error: "" }),
}));
