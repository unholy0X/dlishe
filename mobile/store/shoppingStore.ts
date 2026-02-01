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
  loadItemsByList: (listId: string) => Promise<void>;
  addItem: (item: Omit<ShoppingItem, 'id' | 'createdAt'>) => Promise<ShoppingItem>;
  toggleItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearChecked: (listId?: string) => Promise<void>;
  addRecipeIngredients: (recipe: Recipe, listId?: string) => Promise<void>;

  // Getters
  getItemsByList: (listId: string) => ShoppingItem[];
  getItemsByCategory: (category: IngredientCategory, listId?: string) => ShoppingItem[];
  getCheckedItems: (listId?: string) => ShoppingItem[];
  getUncheckedItems: (listId?: string) => ShoppingItem[];
  getCategoriesWithItems: (listId?: string) => { category: IngredientCategory; items: ShoppingItem[] }[];
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

  loadItemsByList: async (listId) => {
    set({ isLoading: true, error: null });
    try {
      const items = await db.getShoppingItemsByList(listId);
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

  clearChecked: async (listId) => {
    try {
      if (listId) {
        await db.clearCheckedItemsInList(listId);
        set((state) => ({
          items: state.items.filter((item) => item.listId !== listId || !item.isChecked),
        }));
      } else {
        await db.clearCheckedShoppingItems();
        set((state) => ({
          items: state.items.filter((item) => !item.isChecked),
        }));
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addRecipeIngredients: async (recipe, listId) => {
    try {
      if (!listId) {
        throw new Error('listId is required to add recipe ingredients');
      }
      await db.addRecipeToShoppingList(recipe, listId);
      const items = await db.getShoppingItemsByList(listId);
      set({ items });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  getItemsByList: (listId) => {
    return get().items.filter((item) => item.listId === listId);
  },

  getItemsByCategory: (category, listId) => {
    const items = listId ? get().getItemsByList(listId) : get().items;
    return items.filter((item) => item.category === category);
  },

  getCheckedItems: (listId) => {
    const items = listId ? get().getItemsByList(listId) : get().items;
    return items.filter((item) => item.isChecked);
  },

  getUncheckedItems: (listId) => {
    const items = listId ? get().getItemsByList(listId) : get().items;
    return items.filter((item) => !item.isChecked);
  },

  getCategoriesWithItems: (listId) => {
    const items = listId ? get().getItemsByList(listId) : get().items;
    const categories: IngredientCategory[] = ['produce', 'proteins', 'dairy', 'bakery', 'pantry', 'spices', 'condiments', 'beverages', 'snacks', 'frozen', 'household', 'other'];

    return categories
      .map((category) => ({
        category,
        items: items.filter((item) => item.category === category),
      }))
      .filter((group) => group.items.length > 0);
  },
}));
