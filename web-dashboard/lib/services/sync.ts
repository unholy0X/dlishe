import api from '../api';
import { SyncRequest, SyncResponse } from '../types';

export const syncService = {
    sync: async (request: SyncRequest, token: string): Promise<SyncResponse> => {
        const response = await api.post<SyncResponse>('/sync', request, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },
};
