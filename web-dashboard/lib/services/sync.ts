import api from '../api';
import { SyncRequest, SyncResponse } from '../types';

export const syncService = {
    sync: async (request: SyncRequest): Promise<SyncResponse> => {
        const response = await api.post<SyncResponse>('/sync', request);
        return response.data;
    },
};
