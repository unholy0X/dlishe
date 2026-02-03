"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Search, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { recipeService } from '../../lib/services/recipe';
import { Recipe } from '../../lib/types';
import Link from 'next/link';
import { NavHeader } from '@/lib/components/NavHeader';
import { RecipeCard } from '@/lib/components/RecipeCard';

export default function RecipesPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        if (isAuthenticated) {
            fetchRecipes();
        }
    }, [isAuthenticated, authLoading, router]);

    const fetchRecipes = async () => {
        try {
            setLoading(true);
            const data = await recipeService.getAll();
            setRecipes(data.items || []); // Backend returns 'items', not 'recipes'
            setError(null);
        } catch (err) {
            console.error('Failed to fetch recipes:', err);
            setError('Failed to load recipes');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this recipe?')) return;
        try {
            await recipeService.delete(id);
            setRecipes(recipes.filter(r => r.id !== id));
        } catch (err) {
            console.error('Failed to delete recipe:', err);
            setError('Failed to delete recipe');
        }
    };

    const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
        // Optimistic update
        setRecipes(prev => prev.map(r =>
            r.id === id ? { ...r, isFavorite } : r
        ));

        try {
            await recipeService.toggleFavorite(id, isFavorite);
        } catch (err) {
            console.error('Failed to toggle favorite', err);
            // Revert on error
            setRecipes(prev => prev.map(r =>
                r.id === id ? { ...r, isFavorite: !isFavorite } : r
            ));
        }
    };

    const filteredRecipes = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.cuisine?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (authLoading || (!isAuthenticated && loading)) {
        return (
            <div className="flex justify-center items-center h-screen bg-stone-50">
                <Loader2 className="w-8 h-8 text-honey-400 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <NavHeader />

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search recipes by name, cuisine, or ingredients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-honey-300 focus:border-honey-300 outline-none transition bg-white"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredRecipes.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
                        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ChefHat className="w-8 h-8 text-stone-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchQuery ? 'No recipes found' : 'No recipes yet'}
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                            {searchQuery
                                ? 'Try adjusting your search terms'
                                : 'Start by extracting a recipe from a video, webpage, or image'}
                        </p>
                        {!searchQuery && (
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 bg-honey-400 hover:bg-honey-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-honey"
                            >
                                <Plus className="w-5 h-5" />
                                Add Your First Recipe
                            </Link>
                        )}
                    </div>
                )}

                {/* Recipe Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRecipes.map((recipe) => (
                        <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            onToggleFavorite={handleToggleFavorite}
                            onDelete={handleDelete}
                            showDelete={true}
                        />
                    ))}
                </div>

                {loading && (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 text-honey-400 animate-spin mx-auto" />
                    </div>
                )}
            </main>
        </>
    );
}
