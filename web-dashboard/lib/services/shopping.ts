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
    async getAll(token: string, includeArchived = false): Promise<ShoppingListsResponse> {
        const response = await api.get<ShoppingListsResponse>('/shopping-lists', {
            params: { includeArchived },
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    async getOne(id: string, token: string, includeItems = false): Promise<ShoppingList | ShoppingListWithItems> {
        const response = await api.get<ShoppingList | ShoppingListWithItems>(`/shopping-lists/${id}`, {
            params: { includeItems },
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    async create(data: ShoppingListInput, token: string): Promise<ShoppingList> {
        const response = await api.post<ShoppingList>('/shopping-lists', data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    async update(id: string, data: ShoppingListInput, token: string): Promise<ShoppingList> {
        const response = await api.put<ShoppingList>(`/shopping-lists/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    async delete(id: string, token: string): Promise<void> {
        await api.delete(`/shopping-lists/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    async archive(id: string, token: string): Promise<void> {
        await api.post(`/shopping-lists/${id}/archive`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    // Items
    async getItems(listId: string, token: string): Promise<ShoppingItemsResponse> {
        const response = await api.get<ShoppingItemsResponse>(`/shopping-lists/${listId}/items`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    async addItem(listId: string, data: ShoppingItemInput, token: string): Promise<ShoppingItem> {
        const response = await api.post<ShoppingItem>(`/shopping-lists/${listId}/items`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    async updateItem(listId: string, itemId: string, data: ShoppingItemInput, token: string): Promise<ShoppingItem> {
        const response = await api.put<ShoppingItem>(`/shopping-lists/${listId}/items/${itemId}`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    async deleteItem(listId: string, itemId: string, token: string): Promise<void> {
        await api.delete(`/shopping-lists/${listId}/items/${itemId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    async toggleCheck(listId: string, itemId: string, token: string): Promise<ShoppingItem> {
        const response = await api.post<ShoppingItem>(`/shopping-lists/${listId}/items/${itemId}/check`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    async addFromRecipe(listId: string, recipeId: string, token: string, ingredients?: string[]): Promise<ShoppingItemsResponse> {
        const response = await api.post<ShoppingItemsResponse>(`/shopping-lists/${listId}/add-from-recipe`, {
            recipeId,
            ingredients
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    async analyzeAddFromRecipe(listId: string, recipeId: string, token: string): Promise<AnalyzeAddResponse> {
        const response = await api.post<AnalyzeAddResponse>(`/shopping-lists/${listId}/analyze-add-recipe`, { recipeId }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    async completeList(listId: string, token: string): Promise<void> {
        await api.post(`/shopping-lists/${listId}/complete`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    async analyze(listId: string, token: string): Promise<ListAnalysisResult> {
        const response = await api.post<ListAnalysisResult>(`/shopping-lists/${listId}/analyze`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    async smartMergeLists(sourceListIds: string[], token: string): Promise<ShoppingListWithItems> {
        const response = await api.post<ShoppingListWithItems>('/shopping-lists/smart-merge', { sourceListIds }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }
};
