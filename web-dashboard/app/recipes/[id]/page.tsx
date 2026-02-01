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
    Heart,
    ShoppingCart,
    Plus,
    Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { ShoppingList } from '../../../lib/types';
import { shoppingService } from '../../../lib/services/shopping';
import SupervisedAddModal from './SupervisedAddModal';

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
    const { id } = useParams();
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    // Recipe State
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Shopping List State
    const [lists, setLists] = useState<ShoppingList[]>([]);
    const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
    const [addingToList, setAddingToList] = useState(false);

    // Supervised Add State
    const [isSupervisedModalOpen, setIsSupervisedModalOpen] = useState(false);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [isSupervisedMode, setIsSupervisedMode] = useState(true);

    useEffect(() => {
        // Only redirect if explicitly not loading and not authenticated
        if (!authLoading && !isAuthenticated) {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                router.push('/login');
            }
            return;
        }

        if (id && isAuthenticated) {
            fetchRecipe(id as string);
        }
    }, [id, isAuthenticated, authLoading, router]);

    // Fetch lists when modal opens
    useEffect(() => {
        if (isShoppingModalOpen && isAuthenticated) {
            fetchLists();
        }
    }, [isShoppingModalOpen, isAuthenticated]);

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

    const fetchLists = async () => {
        try {
            const data = await shoppingService.getAll();
            setLists(data.lists || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddToList = async (listId: string) => {
        if (!recipe?.id) return;

        if (isSupervisedMode) {
            setSelectedListId(listId);
            setIsSupervisedModalOpen(true);
            return;
        }

        try {
            setAddingToList(true);
            await shoppingService.addFromRecipe(listId, recipe.id);
            setIsShoppingModalOpen(false);
            // In a real app, replace with a toast notification
            alert('Added to shopping list!');
        } catch (err) {
            console.error('Failed to add to list', err);
            alert('Failed to add to list');
        } finally {
            setAddingToList(false);
        }
    };

    const handleCreateAndAdd = async () => {
        if (!recipe) return;
        try {
            setAddingToList(true);
            // 1. Create List
            const newList = await shoppingService.create({
                name: recipe.title, // Use recipe title as list name
                icon: '🍳',
                description: `Created from ${recipe.title}`
            });

            // 2. Add Ingredients
            await shoppingService.addFromRecipe(newList.id, recipe.id);

            setIsShoppingModalOpen(false);
            alert(`Created list "${recipe.title}" and added ingredients!`);

            // Optional: Redirect to the new list?
            router.push(`/shopping/${newList.id}`);
        } catch (err) {
            console.error('Failed to create and add to list', err);
            alert('Failed to create new list');
        } finally {
            setAddingToList(false);
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
                    <button
                        onClick={() => setIsShoppingModalOpen(true)}
                        className="p-2 text-text-muted hover:text-emerald-600 transition flex items-center gap-2"
                        title="Add to Shopping List"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        <span className="hidden sm:inline text-sm font-medium">Add to List</span>
                    </button>
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

            {/* Shopping List Modal */}
            {isShoppingModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Add to Shopping List</h2>
                            <button onClick={() => setIsShoppingModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                &times;
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            Select a list to add all ingredients from <strong>{recipe.title}</strong>.
                        </p>

                        <div className="mb-4 bg-indigo-50 p-3 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-indigo-600" />
                                <div>
                                    <p className="text-sm font-medium text-indigo-900">Smart Add</p>
                                    <p className="text-xs text-indigo-700">Check for duplicates with Chef's Brain</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isSupervisedMode}
                                    onChange={(e) => setIsSupervisedMode(e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                            {lists.map(list => (
                                <button
                                    key={list.id}
                                    onClick={() => handleAddToList(list.id)}
                                    disabled={addingToList}
                                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex items-center gap-3 disabled:opacity-50"
                                >
                                    <span className="text-xl">{list.icon || '🛒'}</span>
                                    <span className="font-medium text-gray-700">{list.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                            <button
                                onClick={handleCreateAndAdd}
                                disabled={addingToList}
                                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-70"
                            >
                                {addingToList ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={18} />}
                                <span className="font-medium">Create New List "{recipe.title}"</span>
                            </button>
                            <p className="text-xs text-center text-gray-400 mt-2">
                                Check your shopping lists for items after adding.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Supervised Add Modal */}
            {isSupervisedModalOpen && selectedListId && recipe && (
                <SupervisedAddModal
                    listId={selectedListId}
                    recipeId={recipe.id}
                    onClose={() => setIsSupervisedModalOpen(false)}
                    onSuccess={() => {
                        setIsSupervisedModalOpen(false);
                        setIsShoppingModalOpen(false);
                        alert('Ingredients added successfully! 🛒');
                    }}
                />
            )}
        </div>
    );
}
