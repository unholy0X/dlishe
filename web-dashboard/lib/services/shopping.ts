import api from '../api';
import {
    ShoppingList,
    ShoppingListWithItems,
    ShoppingListInput,
    ShoppingItem,
    ShoppingItemInput,
    ShoppingListsResponse,
    ShoppingItemsResponse,
    ListAnalysisResult,
    AnalyzeAddResponse
} from '../types';

export const shoppingService = {
    // Lists
    async getAll(includeArchived = false): Promise<ShoppingListsResponse> {
        const response = await api.get<ShoppingListsResponse>('/shopping-lists', {
            params: { includeArchived }
        });
        return response.data;
    },

    async getOne(id: string, includeItems = false): Promise<ShoppingList | ShoppingListWithItems> {
        const response = await api.get<ShoppingList | ShoppingListWithItems>(`/shopping-lists/${id}`, {
            params: { includeItems }
        });
        return response.data;
    },

    async create(data: ShoppingListInput): Promise<ShoppingList> {
        const response = await api.post<ShoppingList>('/shopping-lists', data);
        return response.data;
    },

    async update(id: string, data: ShoppingListInput): Promise<ShoppingList> {
        const response = await api.put<ShoppingList>(`/shopping-lists/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/shopping-lists/${id}`);
    },

    async archive(id: string): Promise<void> {
        await api.post(`/shopping-lists/${id}/archive`);
    },

    // Items
    async getItems(listId: string): Promise<ShoppingItemsResponse> {
        const response = await api.get<ShoppingItemsResponse>(`/shopping-lists/${listId}/items`);
        return response.data;
    },

    async addItem(listId: string, data: ShoppingItemInput): Promise<ShoppingItem> {
        const response = await api.post<ShoppingItem>(`/shopping-lists/${listId}/items`, data);
        return response.data;
    },

    async updateItem(listId: string, itemId: string, data: ShoppingItemInput): Promise<ShoppingItem> {
        const response = await api.put<ShoppingItem>(`/shopping-lists/${listId}/items/${itemId}`, data);
        return response.data;
    },

    async deleteItem(listId: string, itemId: string): Promise<void> {
        await api.delete(`/shopping-lists/${listId}/items/${itemId}`);
    },

    async toggleCheck(listId: string, itemId: string): Promise<ShoppingItem> {
        const response = await api.post<ShoppingItem>(`/shopping-lists/${listId}/items/${itemId}/check`);
        return response.data;
    },

    async addFromRecipe(listId: string, recipeId: string, ingredients?: string[]): Promise<ShoppingItemsResponse> {
        const response = await api.post<ShoppingItemsResponse>(`/shopping-lists/${listId}/add-from-recipe`, {
            recipeId,
            ingredients
        });
        return response.data;
    },

    async analyzeAddFromRecipe(listId: string, recipeId: string): Promise<AnalyzeAddResponse> {
        const response = await api.post<AnalyzeAddResponse>(`/shopping-lists/${listId}/analyze-add-recipe`, { recipeId });
        return response.data;
    },

    async completeList(listId: string): Promise<void> {
        await api.post(`/shopping-lists/${listId}/complete`);
    },

    async analyze(listId: string): Promise<ListAnalysisResult> {
        const response = await api.post<ListAnalysisResult>(`/shopping-lists/${listId}/analyze`);
        return response.data;
    }
};
