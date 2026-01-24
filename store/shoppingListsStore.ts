// Shopping Lists Store - Zustand state management
import { create } from 'zustand';
import type { ShoppingList, CommonItem, IngredientCategory } from '@/types';
import * as db from '@/lib/database';

interface ShoppingListsState {
    lists: ShoppingList[];
    activeListId: string | null;
    commonItems: CommonItem[];
    isLoading: boolean;
    error: string | null;

    // List Actions
    loadLists: () => Promise<void>;
    createList: (list: Omit<ShoppingList, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ShoppingList>;
    updateList: (id: string, updates: Partial<ShoppingList>) => Promise<void>;
    deleteList: (id: string) => Promise<void>;
    setActiveList: (id: string | null) => void;
    getActiveList: () => ShoppingList | null;

    // Common Items Actions
    loadCommonItems: () => Promise<void>;
    getCommonItemsByCategory: (category: IngredientCategory) => CommonItem[];
    searchCommonItems: (query: string) => Promise<CommonItem[]>;
    incrementItemUsage: (itemId: string) => Promise<void>;
}

export const useShoppingListsStore = create<ShoppingListsState>((set, get) => ({
    lists: [],
    activeListId: null,
    commonItems: [],
    isLoading: false,
    error: null,

    loadLists: async () => {
        set({ isLoading: true, error: null });
        try {
            const lists = await db.getAllShoppingLists();
            set({ lists, isLoading: false });

            // Set first list as active if none selected
            if (!get().activeListId && lists.length > 0) {
                set({ activeListId: lists[0].id });
            }
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    createList: async (listData) => {
        set({ isLoading: true, error: null });
        try {
            const newList = await db.createShoppingList(listData);
            set((state) => ({
                lists: [newList, ...state.lists],
                activeListId: newList.id, // Set new list as active
                isLoading: false,
            }));
            return newList;
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
            throw error;
        }
    },

    updateList: async (id, updates) => {
        try {
            await db.updateShoppingList(id, updates);
            set((state) => ({
                lists: state.lists.map((list) =>
                    list.id === id ? { ...list, ...updates, updatedAt: new Date().toISOString() } : list
                ),
            }));
        } catch (error) {
            set({ error: (error as Error).message });
        }
    },

    deleteList: async (id) => {
        try {
            await db.deleteShoppingList(id);
            set((state) => {
                const newLists = state.lists.filter((list) => list.id !== id);
                const newActiveId = state.activeListId === id
                    ? (newLists.length > 0 ? newLists[0].id : null)
                    : state.activeListId;

                return {
                    lists: newLists,
                    activeListId: newActiveId,
                };
            });
        } catch (error) {
            set({ error: (error as Error).message });
        }
    },

    setActiveList: (id) => {
        set({ activeListId: id });
        if (id) {
            db.updateListLastUsed(id);
        }
    },

    getActiveList: () => {
        const { lists, activeListId } = get();
        return lists.find((list) => list.id === activeListId) || null;
    },

    loadCommonItems: async () => {
        set({ isLoading: true, error: null });
        try {
            // Seed common items if needed (first launch)
            await db.seedCommonItemsIfNeeded();

            const commonItems = await db.getAllCommonItems();
            set({ commonItems, isLoading: false });
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    getCommonItemsByCategory: (category) => {
        return get().commonItems.filter((item) => item.category === category);
    },

    searchCommonItems: async (query) => {
        try {
            const results = await db.searchCommonItems(query);
            return results;
        } catch (error) {
            set({ error: (error as Error).message });
            return [];
        }
    },

    incrementItemUsage: async (itemId) => {
        try {
            await db.incrementItemUsage(itemId);
            set((state) => ({
                commonItems: state.commonItems.map((item) =>
                    item.id === itemId ? { ...item, usageCount: item.usageCount + 1 } : item
                ),
            }));
        } catch (error) {
            set({ error: (error as Error).message });
        }
    },
}));
