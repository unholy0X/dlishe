import api from '../api';
import { PantryItem, PantryItemInput, PantryResponse } from '../types';

export const pantryService = {
    // Get all pantry items
    async getAll(category?: string): Promise<PantryResponse> {
        const params = category ? { category } : {};
        const response = await api.get<PantryResponse>('/pantry', { params });
        return response.data;
    },

    // Get expiring items
    async getExpiring(days: number = 7): Promise<{ items: PantryItem[], count: number, days: number }> {
        const response = await api.get('/pantry/expiring', { params: { days } });
        return response.data;
    },

    // Create new item
    async create(item: PantryItemInput): Promise<PantryItem> {
        const response = await api.post<PantryItem>('/pantry', item);
        return response.data;
    },

    // Update item
    async update(id: string, item: PantryItemInput): Promise<PantryItem> {
        const response = await api.put<PantryItem>(`/pantry/${id}`, item);
        return response.data;
    },

    // Delete item
    async delete(id: string): Promise<void> {
        await api.delete(`/pantry/${id}`);
    },
};
