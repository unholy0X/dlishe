// Shopping Store - Zustand state management
import { create } from 'zustand';
import type { ShoppingItem, Recipe, IngredientCategory } from '@/types';
import * as db from '@/lib/database';

interface ShoppingState {
  items: ShoppingItem[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadItems: () => Promise<void>;
  addItem: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => Promise<ShoppingItem>;
  toggleItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearChecked: () => Promise<void>;
  addRecipeIngredients: (recipe: Recipe) => Promise<void>;
  getItemsByCategory: (category: IngredientCategory) => ShoppingItem[];
  getCheckedItems: () => ShoppingItem[];
  getUncheckedItems: () => ShoppingItem[];
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  
  loadItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await db.getAllShoppingItems();
      set({ items, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  addItem: async (itemData) => {
    set({ isLoading: true, error: null });
    try {
      const newItem = await db.createShoppingItem(itemData);
      set((state) => ({
        items: [...state.items, newItem].sort((a, b) => {
          if (a.isChecked !== b.isChecked) return a.isChecked ? 1 : -1;
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
  
  toggleItem: async (id) => {
    try {
      const isChecked = await db.toggleShoppingItem(id);
      set((state) => ({
        items: state.items
          .map((item) => (item.id === id ? { ...item, isChecked } : item))
          .sort((a, b) => {
            if (a.isChecked !== b.isChecked) return a.isChecked ? 1 : -1;
            if (a.category !== b.category) return a.category.localeCompare(b.category);
            return a.name.localeCompare(b.name);
          }),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  deleteItem: async (id) => {
    try {
      await db.deleteShoppingItem(id);
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  clearChecked: async () => {
    try {
      await db.clearCheckedShoppingItems();
      set((state) => ({
        items: state.items.filter((item) => !item.isChecked),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  addRecipeIngredients: async (recipe) => {
    try {
      await db.addRecipeToShoppingList(recipe);
      // Reload to get the new items with proper IDs
      const items = await db.getAllShoppingItems();
      set({ items });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
  
  getItemsByCategory: (category) => {
    return get().items.filter((item) => item.category === category);
  },
  
  getCheckedItems: () => {
    return get().items.filter((item) => item.isChecked);
  },
  
  getUncheckedItems: () => {
    return get().items.filter((item) => !item.isChecked);
  },
}));
