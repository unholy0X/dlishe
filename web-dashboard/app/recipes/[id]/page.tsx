"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import {
    ArrowLeft,
    Clock,
    Users,
    ChefHat,
    Flame,
    Loader2,
    Calendar,
    Share2,
    Heart
} from 'lucide-react';
import clsx from 'clsx';

// Types (Frontend representation)
interface Ingredient {
    id: string;
    name: string;
    quantity?: number;
    unit?: string;
    category: string;
    notes?: string;
}

interface Step {
    id: string;
    stepNumber: number;
    instruction: string;
    durationSeconds?: number;
    technique?: string;
    temperature?: string;
}

interface Recipe {
    id: string;
    title: string;
    description?: string;
    servings?: number;
    prepTime?: number;
    cookTime?: number;
    difficulty?: string;
    cuisine?: string;
    thumbnailUrl?: string;
    isFavorite: boolean;
    ingredients?: Ingredient[];
    steps?: Step[];
    tags?: string[];
}

export default function RecipeDetailPage() {
    const { id } = useParams(); // Note: id might be array or string depending on Next.js version, but usually string in param
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
            return;
        }

        if (id && isAuthenticated) {
            fetchRecipe(id as string);
        }
    }, [id, isAuthenticated, authLoading, router]);

    const fetchRecipe = async (recipeId: string) => {
        try {
            const res = await api.get(`/recipes/${recipeId}`);
            setRecipe(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to load recipe');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50">
                <Loader2 className="w-8 h-8 text-honey-400 animate-spin" />
            </div>
        );
    }

    if (error || !recipe) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-50 text-center">
                <div>
                    <p className="text-red-500 mb-4">{error || 'Recipe not found'}</p>
                    <Link href="/" className="text-honey-500 hover:underline">Return to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            {/* Navigation */}
            <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back</span>
                </Link>
                <div className="flex gap-4">
                    <button className="p-2 text-text-muted hover:text-honey-500 transition">
                        <Heart className={clsx("w-5 h-5", recipe.isFavorite && "fill-current text-honey-500")} />
                    </button>
                    <button className="p-2 text-text-muted hover:text-text-primary transition">
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Header */}
                <header className="space-y-6">
                    <div className="flex justify-center gap-2 flex-wrap">
                        {recipe.cuisine && (
                            <span className="bg-sage-100 text-sage-300 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider">
                                {recipe.cuisine}
                            </span>
                        )}
                        {recipe.difficulty && (
                            <span className="bg-stone-200 text-text-secondary px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider">
                                {recipe.difficulty}
                            </span>
                        )}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-bold text-text-primary leading-tight text-center">
                        {recipe.title}
                    </h1>
                    {recipe.description && (
                        <p className="text-lg text-text-muted max-w-3xl mx-auto leading-relaxed text-center">
                            {recipe.description}
                        </p>
                    )}
                </header>

                {/* Thumbnail Card */}
                {recipe.thumbnailUrl && (
                    <div className="bg-white rounded-2xl shadow-warm border border-stone-200 overflow-hidden">
                        <img
                            src={recipe.thumbnailUrl}
                            alt={recipe.title}
                            className="w-full h-auto object-cover max-h-[500px]"
                        />
                    </div>
                )}

                {/* Meta Stats */}
                <div className="bg-white rounded-2xl shadow-warm border border-stone-200 p-6">
                    <div className="flex justify-around gap-4 max-w-2xl mx-auto">
                        <div className="text-center">
                            <div className="flex justify-center mb-2 text-honey-400"><Clock className="w-6 h-6" /></div>
                            <div className="font-display font-bold text-2xl text-text-primary">{((recipe.prepTime || 0) + (recipe.cookTime || 0))}m</div>
                            <div className="text-sm text-text-muted uppercase tracking-wide">Total Time</div>
                        </div>
                        <div className="text-center">
                            <div className="flex justify-center mb-2 text-honey-400"><Users className="w-6 h-6" /></div>
                            <div className="font-display font-bold text-2xl text-text-primary">{recipe.servings || '-'}</div>
                            <div className="text-sm text-text-muted uppercase tracking-wide">Servings</div>
                        </div>
                        <div className="text-center">
                            <div className="flex justify-center mb-2 text-honey-400"><Flame className="w-6 h-6" /></div>
                            <div className="font-display font-bold text-2xl text-text-primary">{(recipe.ingredients || []).length}</div>
                            <div className="text-sm text-text-muted uppercase tracking-wide">Ingredients</div>
                        </div>
                    </div>
                </div>

                {/* Two Column Layout: Ingredients (Left) | Steps (Right) */}
                <div className="grid lg:grid-cols-2 gap-8">

                    {/* Ingredients Column */}
                    <section className="bg-white rounded-2xl shadow-warm border border-stone-200 p-6 md:p-8 h-fit lg:sticky lg:top-8">
                        <h2 className="font-display text-3xl font-bold text-text-primary mb-6 flex items-center gap-2">
                            <Flame className="w-7 h-7 text-honey-400" />
                            <span>Ingredients</span>
                        </h2>
                        {(recipe.ingredients || []).length > 0 ? (
                            <ul className="space-y-3">
                                {(recipe.ingredients || []).map((ing) => (
                                    <li key={ing.id} className="flex items-baseline justify-between py-3 border-b border-stone-100 last:border-0 group hover:bg-stone-50 px-2 -mx-2 rounded transition">
                                        <div className="pr-4 flex-1">
                                            <span className="font-semibold text-text-primary text-lg">{ing.name}</span>
                                            {ing.notes && <span className="block text-sm text-text-muted italic mt-1">{ing.notes}</span>}
                                        </div>
                                        <div className="text-honey-500 font-display font-bold whitespace-nowrap text-lg">
                                            {ing.quantity} {ing.unit}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-text-muted italic">No ingredients listed.</p>
                        )}
                    </section>

                    {/* Steps Column */}
                    <section className="bg-white rounded-2xl shadow-warm border border-stone-200 p-6 md:p-8">
                        <h2 className="font-display text-3xl font-bold text-text-primary mb-6 flex items-center gap-2">
                            <ChefHat className="w-7 h-7 text-honey-400" />
                            <span>Instructions</span>
                        </h2>
                        <div className="space-y-6">
                            {(recipe.steps || []).length > 0 ? (
                                (recipe.steps || []).map((step, index) => (
                                    <div key={step.id} className="flex gap-4 group hover:bg-stone-50 p-3 -mx-3 rounded-lg transition">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-honey-100 text-honey-500 flex items-center justify-center font-display font-bold text-xl border-2 border-honey-200 group-hover:bg-honey-200 group-hover:border-honey-300 transition">
                                            {step.stepNumber}
                                        </div>
                                        <div className="flex-1 space-y-2 pt-1">
                                            <p className="text-text-primary leading-relaxed text-base">
                                                {step.instruction}
                                            </p>
                                            <div className="flex gap-3 flex-wrap">
                                                {step.durationSeconds && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-sage-300 bg-sage-50 px-2 py-1 rounded-md border border-sage-100">
                                                        <Clock className="w-3 h-3" /> {step.durationSeconds}s
                                                    </span>
                                                )}
                                                {step.technique && (
                                                    <span className="inline-flex items-center gap-1 text-xs text-honey-400 bg-honey-50 px-2 py-1 rounded-md border border-honey-100">
                                                        <ChefHat className="w-3 h-3" /> {step.technique}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-text-muted italic">No instructions found.</p>
                            )}
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}
