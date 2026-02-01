"use client";

import { AuthProvider } from "@/lib/auth";
import { SyncProvider } from "@/lib/sync";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <SyncProvider>
                {children}
            </SyncProvider>
        </AuthProvider>
    );
}
