// Pantry Store - Zustand state management
// Enhanced to work with commonItems catalog (shared with Shopping)
import { create } from 'zustand';
import type { PantryItem, CommonItem, IngredientCategory } from '@/types';
import * as db from '@/lib/database';

interface PantryState {
  items: PantryItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadItems: () => Promise<void>;
  addItem: (item: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<PantryItem>;
  addItemFromCommon: (commonItem: CommonItem, quantity?: number) => Promise<PantryItem>;
  updateItem: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;

  // Query methods
  getItemsByCategory: (category: IngredientCategory) => PantryItem[];
  searchItems: (query: string) => PantryItem[];
  getItemCount: () => number;
  getCategoryCounts: () => Record<IngredientCategory, number>;
}

export const usePantryStore = create<PantryState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  loadItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await db.getAllPantryItems();
      set({ items, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addItem: async (itemData) => {
    set({ isLoading: true, error: null });
    try {
      const newItem = await db.createPantryItem(itemData);
      set((state) => ({
        items: [...state.items, newItem].sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category);
          return a.name.localeCompare(b.name);
        }),
        isLoading: false,
      }));
      return newItem;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Add item directly from commonItems catalog
  addItemFromCommon: async (commonItem, quantity) => {
    const itemData: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt'> = {
      name: commonItem.name,
      category: commonItem.category,
      quantity: quantity ?? commonItem.defaultQuantity,
      unit: commonItem.defaultUnit,
    };
    return get().addItem(itemData);
  },

  updateItem: async (id, updates) => {
    try {
      await db.updatePantryItem(id, updates);
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id
            ? { ...item, ...updates, updatedAt: new Date().toISOString() }
            : item
        ),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  deleteItem: async (id) => {
    try {
      await db.deletePantryItem(id);
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  clearAll: async () => {
    try {
      await db.clearAllPantryItems();
      set({ items: [] });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  getItemsByCategory: (category) => {
    return get().items.filter((item) => item.category === category);
  },

  searchItems: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().items.filter((item) =>
      item.name.toLowerCase().includes(lowerQuery)
    );
  },

  getItemCount: () => {
    return get().items.length;
  },

  getCategoryCounts: () => {
    const counts: Record<string, number> = {};
    for (const item of get().items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts as Record<IngredientCategory, number>;
  },
}));
