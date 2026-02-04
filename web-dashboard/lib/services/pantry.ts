import api from '../api';
import { PantryItem, PantryItemInput, PantryResponse } from '../types';

export const pantryService = {
    // Get all pantry items
    async getAll(token: string, category?: string): Promise<PantryResponse> {
        const params = category ? { category } : {};
        const response = await api.get<PantryResponse>('/pantry', {
            params,
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Get expiring items
    async getExpiring(token: string, days: number = 7): Promise<{ items: PantryItem[], count: number, days: number }> {
        const response = await api.get('/pantry/expiring', {
            params: { days },
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Create new item
    async create(item: PantryItemInput, token: string): Promise<PantryItem> {
        const response = await api.post<PantryItem>('/pantry', item, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Update item
    async update(id: string, item: PantryItemInput, token: string): Promise<PantryItem> {
        const response = await api.put<PantryItem>(`/pantry/${id}`, item, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Delete item
    async delete(id: string, token: string): Promise<void> {
        await api.delete(`/pantry/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },
};
