"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncService } from './services/sync';
import { useAuth } from './auth';

interface SyncContextType {
    isSyncing: boolean;
    lastSyncTime: string | null;
    sync: () => Promise<void>;
    error: string | null;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const SYNC_STORAGE_KEY = 'last_sync_timestamp';

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Load last sync time from storage
        const stored = localStorage.getItem(SYNC_STORAGE_KEY);
        if (stored) {
            setLastSyncTime(stored);
        }
    }, []);

    const sync = async () => {
        if (!isAuthenticated) return;

        try {
            setIsSyncing(true);
            setError(null);

            // In a real offline-first app, we would gather local changes here.
            // For this basic integration, we just send empty changes to get server updates.
            // (Or if we had a local DB, we would query it).

            const request = {
                lastSyncTimestamp: lastSyncTime || new Date(0).toISOString(),
                changes: [] // No local changes to push in this MVP
            };

            const response = await syncService.sync(request);

            // In a real app, we would apply response.serverChanges to local DB here.

            // Update timestamp
            const newTime = response.serverTimestamp;
            setLastSyncTime(newTime);
            localStorage.setItem(SYNC_STORAGE_KEY, newTime);

            console.log('Sync completed. Server time:', newTime);

            // Optional: Reload page or invalidate queries to show fresh data
            // router.refresh(); 

        } catch (err: any) {
            console.error('Sync failed:', err);
            setError('Sync failed');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <SyncContext.Provider value={{ isSyncing, lastSyncTime, sync, error }}>
            {children}
        </SyncContext.Provider>
    );
}

export function useSync() {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
}
