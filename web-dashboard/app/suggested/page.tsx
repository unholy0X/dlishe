"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { recipeService } from '@/lib/services/recipe';
import { Recipe } from '@/lib/types';
import { NavHeader } from '@/lib/components/NavHeader';
import { RecipeCard } from '@/lib/components/RecipeCard';
import {
    Loader2,
    ChefHat,
    Search,
    BookmarkPlus,
    Check
} from 'lucide-react';
import Link from 'next/link';

export default function SuggestedRecipesPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
    const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        if (isAuthenticated) {
            fetchSuggestedRecipes();
        }
    }, [isAuthenticated, authLoading, router]);

    const fetchSuggestedRecipes = async () => {
        try {
            setLoading(true);
            const data = await recipeService.getSuggested();
            setRecipes(data.items || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch suggested recipes:', err);
            setError('Failed to load suggested recipes');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRecipe = async (recipeId: string) => {
        try {
            setSavingRecipeId(recipeId);
            await recipeService.saveRecipe(recipeId);
            setSavedRecipeIds(prev => new Set(prev).add(recipeId));
            // Show success notification (could be replaced with a toast)
            setTimeout(() => setSavingRecipeId(null), 1000);
        } catch (err: any) {
            console.error('Failed to save recipe:', err);

            // Handle 409 conflict (already cloned)
            if (err.response?.status === 409) {
                const existingRecipeId = err.response?.data?.error?.details?.existingRecipeId;
                if (existingRecipeId) {
                    setSavedRecipeIds(prev => new Set(prev).add(recipeId));
                    alert('You already have this recipe in your collection!');
                }
            } else {
                alert(err.response?.data?.error?.message || 'Failed to save recipe');
            }
            setSavingRecipeId(null);
        }
    };

    const filteredRecipes = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.cuisine?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (authLoading) {
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
                {/* Header */}
                <div className="text-center space-y-3">
                    <h1 className="text-4xl font-display font-medium text-text-primary">
                        Suggested Recipes
                    </h1>
                    <p className="text-text-muted max-w-2xl mx-auto">
                        Discover curated recipes from our collection. Save any recipe to your personal collection to get started.
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search suggested recipes..."
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
                            {searchQuery ? 'No recipes found' : 'No suggested recipes available'}
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                            {searchQuery
                                ? 'Try adjusting your search terms'
                                : 'Check back later for curated recipe suggestions'}
                        </p>
                    </div>
                )}

                {/* Recipe Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRecipes.map((recipe) => (
                        <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            hideFooter={true}
                            showFavorite={false}
                            showDelete={false}
                        >
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSaveRecipe(recipe.id);
                                }}
                                disabled={savingRecipeId === recipe.id || savedRecipeIds.has(recipe.id)}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${savedRecipeIds.has(recipe.id)
                                    ? 'bg-sage-100 text-sage-700 cursor-not-allowed'
                                    : 'bg-honey-400 hover:bg-honey-500 text-white'
                                    }`}
                            >
                                {savingRecipeId === recipe.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : savedRecipeIds.has(recipe.id) ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Saved
                                    </>
                                ) : (
                                    <>
                                        <BookmarkPlus className="w-4 h-4" />
                                        Save to My Recipes
                                    </>
                                )}
                            </button>
                        </RecipeCard>
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
