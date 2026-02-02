"use client";

import Link from 'next/link';
import { ChefHat, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSync } from '@/lib/sync';
import clsx from 'clsx';

export function NavHeader() {
    const { user, logout } = useAuth();
    const { sync, isSyncing } = useSync();

    return (
        <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
                        <ChefHat className="w-6 h-6 text-honey-500" />
                        <span className="font-display font-bold text-xl text-text-primary">DishFlow</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link href="/" className="text-text-secondary hover:text-honey-600 transition-colors">Extraction</Link>
                        <Link href="/recipes" className="text-text-secondary hover:text-honey-600 transition-colors">My Recipes</Link>
                        <Link href="/suggested" className="text-text-secondary hover:text-honey-600 transition-colors">Suggested</Link>
                        <Link href="/recommendations" className="text-text-secondary hover:text-honey-600 transition-colors">Recommendations</Link>
                        <Link href="/pantry" className="text-text-secondary hover:text-honey-600 transition-colors">Pantry</Link>
                        <Link href="/shopping" className="text-text-secondary hover:text-honey-600 transition-colors">Shopping</Link>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => sync()}
                        disabled={isSyncing}
                        className={clsx(
                            "p-2 rounded-full text-text-muted hover:bg-stone-100 transition-colors",
                            isSyncing && "animate-spin text-emerald-500"
                        )}
                        title="Sync Data"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>

                    <span className="w-px h-6 bg-stone-200 mx-1"></span>

                    <span className="text-sm text-text-secondary">Hello, {user?.name}</span>
                    <button
                        onClick={logout}
                        className="text-sm text-text-muted hover:text-text-primary"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}
