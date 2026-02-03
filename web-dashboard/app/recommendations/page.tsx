"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { recipeService } from '@/lib/services/recipe';
import { Recipe, RecommendationFilters, RecommendationResponse, RecipeRecommendation } from '@/lib/types';
import { NavHeader } from '@/lib/components/NavHeader';
import { RecommendationCard } from '@/lib/components/RecommendationCard';
import {
    Loader2,
    ChefHat,
    Filter,
    X,
    TrendingUp,
    Star,
    Zap
} from 'lucide-react';
import Link from 'next/link';

export default function RecommendationsPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<RecommendationFilters>({
        limit: 5
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        if (isAuthenticated) {
            fetchRecommendations();
        }
    }, [isAuthenticated, authLoading, router]);

    const fetchRecommendations = async (newFilters?: RecommendationFilters) => {
        try {
            setLoading(true);
            const appliedFilters = newFilters || filters;
            const data = await recipeService.getRecommendations(appliedFilters);
            setRecommendations(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch recommendations:', err);
            setError('Failed to load recommendations');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: keyof RecommendationFilters, value: any) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
    };

    const applyFilters = () => {
        fetchRecommendations(filters);
        setShowFilters(false);
    };

    const clearFilters = () => {
        const clearedFilters: RecommendationFilters = { limit: 5 };
        setFilters(clearedFilters);
        fetchRecommendations(clearedFilters);
    };

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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-display font-medium text-text-primary mb-2">
                            Recommended Recipes
                        </h1>
                        <p className="text-text-muted">
                            Based on ingredients in your pantry
                        </p>
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-stone-300 hover:border-honey-400 transition-colors bg-white"
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-text-primary">Filter Recommendations</h3>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="p-1 text-text-muted hover:text-text-primary transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Meal Type */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Meal Type</label>
                                <select
                                    value={filters.mealType || ''}
                                    onChange={(e) => handleFilterChange('mealType', e.target.value || undefined)}
                                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-honey-300 focus:border-honey-300 outline-none"
                                >
                                    <option value="">Any</option>
                                    <option value="breakfast">Breakfast</option>
                                    <option value="lunch">Lunch</option>
                                    <option value="dinner">Dinner</option>
                                    <option value="snack">Snack</option>
                                    <option value="dessert">Dessert</option>
                                </select>
                            </div>

                            {/* Max Time */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Max Time (min)</label>
                                <input
                                    type="number"
                                    value={filters.maxTime || ''}
                                    onChange={(e) => handleFilterChange('maxTime', e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="Any"
                                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-honey-300 focus:border-honey-300 outline-none"
                                />
                            </div>

                            {/* Cuisine */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Cuisine</label>
                                <select
                                    value={filters.cuisine || ''}
                                    onChange={(e) => handleFilterChange('cuisine', e.target.value || undefined)}
                                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-honey-300 focus:border-honey-300 outline-none"
                                >
                                    <option value="">Any</option>
                                    <option value="italian">Italian</option>
                                    <option value="asian">Asian</option>
                                    <option value="mexican">Mexican</option>
                                    <option value="american">American</option>
                                    <option value="mediterranean">Mediterranean</option>
                                </select>
                            </div>

                            {/* Diet */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Dietary</label>
                                <select
                                    value={filters.diet || ''}
                                    onChange={(e) => handleFilterChange('diet', e.target.value || undefined)}
                                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-honey-300 focus:border-honey-300 outline-none"
                                >
                                    <option value="">Any</option>
                                    <option value="vegetarian">Vegetarian</option>
                                    <option value="vegan">Vegan</option>
                                    <option value="keto">Keto</option>
                                    <option value="halal">Halal</option>
                                    <option value="kosher">Kosher</option>
                                </select>
                            </div>

                            {/* Max Calories */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Max Calories</label>
                                <input
                                    type="number"
                                    value={filters.maxCalories || ''}
                                    onChange={(e) => handleFilterChange('maxCalories', e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="Any"
                                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-honey-300 focus:border-honey-300 outline-none"
                                />
                            </div>

                            {/* Min Protein */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Min Protein (g)</label>
                                <input
                                    type="number"
                                    value={filters.minProtein || ''}
                                    onChange={(e) => handleFilterChange('minProtein', e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="Any"
                                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-honey-300 focus:border-honey-300 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-stone-200">
                            <button
                                onClick={applyFilters}
                                className="px-6 py-2 rounded-xl bg-honey-400 hover:bg-honey-500 text-white font-medium transition-colors"
                            >
                                Apply Filters
                            </button>
                            <button
                                onClick={clearFilters}
                                className="px-6 py-2 rounded-xl border border-stone-300 hover:border-stone-400 text-text-secondary hover:text-text-primary transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 text-honey-400 animate-spin mx-auto" />
                    </div>
                ) : recommendations ? (
                    <>
                        {/* Summary Stats */}
                        {recommendations.summary.totalRecipes > 0 && (
                            <div className="bg-white rounded-xl border border-stone-200 p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 text-text-muted mb-1">
                                            <ChefHat className="w-4 h-4" />
                                            <span className="text-sm">Total Recipes</span>
                                        </div>
                                        <p className="text-2xl font-semibold text-text-primary">{recommendations.summary.totalRecipes}</p>
                                    </div>
                                    {recommendations.summary.quickestRecipe && (
                                        <div>
                                            <div className="flex items-center gap-2 text-text-muted mb-1">
                                                <Zap className="w-4 h-4" />
                                                <span className="text-sm">Quickest</span>
                                            </div>
                                            <p className="text-2xl font-semibold text-text-primary">
                                                {recommendations.summary.quickestRecipe.value}{recommendations.summary.quickestRecipe.valueUnit}
                                            </p>
                                            <p className="text-xs text-text-muted truncate">{recommendations.summary.quickestRecipe.title}</p>
                                        </div>
                                    )}
                                    {recommendations.summary.bestMatch && (
                                        <div>
                                            <div className="flex items-center gap-2 text-text-muted mb-1">
                                                <Star className="w-4 h-4" />
                                                <span className="text-sm">Best Match</span>
                                            </div>
                                            <p className="text-2xl font-semibold text-text-primary">
                                                {recommendations.summary.bestMatch.value}{recommendations.summary.bestMatch.valueUnit}
                                            </p>
                                            <p className="text-xs text-text-muted truncate">{recommendations.summary.bestMatch.title}</p>
                                        </div>
                                    )}
                                    {recommendations.summary.avgCaloriesPerServing && (
                                        <div>
                                            <div className="flex items-center gap-2 text-text-muted mb-1">
                                                <TrendingUp className="w-4 h-4" />
                                                <span className="text-sm">Avg Calories</span>
                                            </div>
                                            <p className="text-2xl font-semibold text-text-primary">
                                                {Math.round(recommendations.summary.avgCaloriesPerServing)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Ready to Cook */}
                        {recommendations.readyToCook.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-display font-medium text-text-primary mb-4 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                    Ready to Cook ({recommendations.readyToCook.length})
                                </h2>
                                <p className="text-text-muted mb-4 text-sm">
                                    You have 90-100% of the ingredients needed
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {recommendations.readyToCook.map(rec => (
                                        <RecommendationCard key={rec.recipe.id} recommendation={rec} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Almost Ready */}
                        {recommendations.almostReady.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-display font-medium text-text-primary mb-4 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                    Almost Ready ({recommendations.almostReady.length})
                                </h2>
                                <p className="text-text-muted mb-4 text-sm">
                                    You have 70-89% of the ingredients needed
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {recommendations.almostReady.map(rec => (
                                        <RecommendationCard key={rec.recipe.id} recommendation={rec} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Needs Shopping */}
                        {recommendations.needsShopping.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-display font-medium text-text-primary mb-4 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                    Needs Shopping ({recommendations.needsShopping.length})
                                </h2>
                                <p className="text-text-muted mb-4 text-sm">
                                    You have 50-69% of the ingredients needed
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {recommendations.needsShopping.map(rec => (
                                        <RecommendationCard key={rec.recipe.id} recommendation={rec} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Empty State */}
                        {recommendations.summary.totalRecipes === 0 && (
                            <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
                                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ChefHat className="w-8 h-8 text-stone-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No recommendations found
                                </h3>
                                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                                    Try adding more ingredients to your pantry or adjusting your filters
                                </p>
                                <Link
                                    href="/pantry"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-honey-400 hover:bg-honey-500 text-white font-medium transition-colors"
                                >
                                    Manage Pantry
                                </Link>
                            </div>
                        )}
                    </>
                ) : null}
            </main>
        </>
    );
}
