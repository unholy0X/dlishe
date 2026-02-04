import { ClerkProvider } from "@clerk/nextjs";
import { SyncProvider } from "@/lib/sync";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider>
            <SyncProvider>
                {children}
            </SyncProvider>
        </ClerkProvider>
    );
}
