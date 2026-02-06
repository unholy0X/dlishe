"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useUser } from "@clerk/nextjs";
import {
    ArrowLeft,
    Clock,
    Users,
    ChefHat,
    Flame,
    Loader2,
    Share2,
    Heart,
    ShoppingCart,
    Plus,
    Sparkles,
    Trash2,
    Edit,
    Link as LinkIcon
} from 'lucide-react';
import clsx from 'clsx';
import { Recipe, ShoppingList } from '@/lib/types';
import { shoppingService } from '@/lib/services/shopping';
import { recipeService } from '@/lib/services/recipe';
import SupervisedAddModal from './SupervisedAddModal';
import { NutritionPanel } from '@/lib/components/NutritionPanel';
import { DietaryBadges } from '@/lib/components/DietaryBadges';

export default function RecipeDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useUser();
    const { isSignedIn: isAuthenticated, isLoaded: authLoaded, getToken } = useAuth();

    // Recipe State
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    // Shopping List State
    const [lists, setLists] = useState<ShoppingList[]>([]);
    const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
    const [addingToList, setAddingToList] = useState(false);

    // Supervised Add State
    const [isSupervisedModalOpen, setIsSupervisedModalOpen] = useState(false);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [isSupervisedMode, setIsSupervisedMode] = useState(true);

    useEffect(() => {
        // Middleware handles protection.

        if (id && isAuthenticated) {
            fetchRecipe(id as string);
        }
    }, [id, isAuthenticated, authLoaded, router]);

    // Fetch lists when modal opens
    useEffect(() => {
        if (isShoppingModalOpen && isAuthenticated) {
            fetchLists();
        }
    }, [isShoppingModalOpen, isAuthenticated]);

    const fetchRecipe = async (recipeId: string) => {
        try {
            const token = await getToken();
            if (!token) return;
            const data = await recipeService.getOne(recipeId, token);
            setRecipe(data);
            setIsFavorite(data.isFavorite);
        } catch (err: any) {
            setError(err.response?.data?.error?.message || 'Failed to load recipe');
        } finally {
            setLoading(false);
        }
    };

    const fetchLists = async () => {
        try {
            const token = await getToken();
            if (!token) return;
            const data = await shoppingService.getAll(token, false);
            setLists(data.lists || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleFavorite = async () => {
        if (!recipe) return;
        setFavoriteLoading(true);
        try {
            const newState = !isFavorite;
            const token = await getToken();
            if (token) await recipeService.toggleFavorite(recipe.id, newState, token);
            setIsFavorite(newState);
        } catch (err) {
            console.error('Failed to toggle favorite', err);
        } finally {
            setFavoriteLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this recipe?')) return;
        try {
            const token = await getToken();
            if (token) await recipeService.delete(id as string, token);
            router.push('/recipes');
        } catch (err) {
            console.error('Failed to delete', err);
            alert('Failed to delete recipe');
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
            const token = await getToken();
            if (token) await shoppingService.addFromRecipe(listId, recipe.id, token, undefined); // Pass undefined for ingredients if not selecting specifics
            setIsShoppingModalOpen(false);
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
            const token = await getToken();
            if (!token) return;

            const newList = await shoppingService.create({
                name: recipe.title,
                icon: '🍳',
                description: `Created from ${recipe.title}`
            }, token);

            await shoppingService.addFromRecipe(newList.id, recipe.id, token, undefined);

            setIsShoppingModalOpen(false);
            alert(`Created list "${recipe.title}" and added ingredients!`);
            router.push(`/shopping/${newList.id}`);
        } catch (err) {
            console.error('Failed to create and add to list', err);
            alert('Failed to create new list');
        } finally {
            setAddingToList(false);
        }
    };

    if (!authLoaded || loading) {
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
                    <Link href="/recipes" className="text-honey-500 hover:underline">Return to Recipes</Link>
                </div>
            </div>
        );
    }

    const isOwner = user?.id === recipe.userId;

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            {/* Navigation */}
            <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 h-16 flex items-center justify-between">
                <Link href="/recipes" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back</span>
                </Link>
                <div className="flex gap-2">
                    {isOwner && (
                        <>
                            <button
                                onClick={handleDelete}
                                className="p-2 text-text-muted hover:text-red-500 transition"
                                title="Delete Recipe"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <button
                                className="p-2 text-text-muted hover:text-text-primary transition"
                                title="Edit Recipe"
                                onClick={() => alert('Edit feature coming soon')}
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setIsShoppingModalOpen(true)}
                        className="p-2 text-text-muted hover:text-emerald-600 transition flex items-center gap-2"
                        title="Add to Shopping List"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        <span className="hidden sm:inline text-sm font-medium">Add to List</span>
                    </button>
                    <button
                        onClick={handleToggleFavorite}
                        disabled={favoriteLoading}
                        className="p-2 text-text-muted hover:text-honey-500 transition"
                    >
                        <Heart className={clsx("w-5 h-5 transition-transform active:scale-95", isFavorite && "fill-current text-honey-500")} />
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
                        {recipe.sourceType === 'cloned' && (
                            <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Cloned
                            </span>
                        )}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-display font-bold text-text-primary leading-tight text-center">
                        {recipe.title}
                    </h1>

                    <div className="flex justify-center">
                        <DietaryBadges dietaryInfo={recipe.dietaryInfo} />
                    </div>

                    {recipe.description && (
                        <p className="text-lg text-text-muted max-w-3xl mx-auto leading-relaxed text-center">
                            {recipe.description}
                        </p>
                    )}

                    {recipe.sourceUrl && (
                        <div className="text-center">
                            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-honey-600 hover:text-honey-700 hover:underline">
                                <LinkIcon className="w-3 h-3" /> View Source
                            </a>
                        </div>
                    )}
                </header>

                {/* Thumbnail Card */}
                {recipe.thumbnailUrl && (
                    <div className="bg-white rounded-2xl shadow-warm border border-stone-200 overflow-hidden max-w-4xl mx-auto">
                        <img
                            src={recipe.thumbnailUrl}
                            alt={recipe.title}
                            className="w-full h-auto object-cover max-h-[500px]"
                        />
                    </div>
                )}

                {/* Meta Stats */}
                <div className="bg-white rounded-2xl shadow-warm border border-stone-200 p-6 max-w-4xl mx-auto">
                    <div className="flex justify-around gap-4">
                        <div className="text-center">
                            <div className="flex justify-center mb-2 text-honey-400"><Clock className="w-6 h-6" /></div>
                            <div className="font-display font-bold text-2xl text-text-primary">{((recipe.prepTime || 0) + (recipe.cookTime || 0))}m</div>
                            <div className="text-sm text-text-muted uppercase tracking-wide">Total</div>
                        </div>
                        <div className="text-center">
                            <div className="flex justify-center mb-2 text-honey-400"><Users className="w-6 h-6" /></div>
                            <div className="font-display font-bold text-2xl text-text-primary">{recipe.servings || '-'}</div>
                            <div className="text-sm text-text-muted uppercase tracking-wide">Servings</div>
                        </div>
                        <div className="text-center">
                            <div className="flex justify-center mb-2 text-honey-400"><Flame className="w-6 h-6" /></div>
                            <div className="font-display font-bold text-2xl text-text-primary">{(recipe.ingredients || []).length}</div>
                            <div className="text-sm text-text-muted uppercase tracking-wide">Items</div>
                        </div>
                        {recipe.nutrition?.calories && (
                            <div className="text-center hidden sm:block">
                                <div className="flex justify-center mb-2 text-emerald-500"><Heart className="w-6 h-6" /></div>
                                <div className="font-display font-bold text-2xl text-text-primary">{recipe.nutrition.calories}</div>
                                <div className="text-sm text-text-muted uppercase tracking-wide">Calories</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Nutrition Panel (if available) */}
                {recipe.nutrition && (
                    <div className="max-w-4xl mx-auto">
                        <NutritionPanel nutrition={recipe.nutrition} />
                    </div>
                )}

                {/* Ingredients & Steps */}
                <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    {/* Ingredients Column */}
                    <section className="bg-white rounded-2xl shadow-warm border border-stone-200 p-6 md:p-8 h-fit lg:sticky lg:top-24">
                        <h2 className="font-display text-3xl font-bold text-text-primary mb-6 flex items-center gap-2">
                            <Flame className="w-7 h-7 text-honey-400" />
                            <span>Ingredients</span>
                        </h2>
                        {(recipe.ingredients || []).length > 0 ? (
                            (() => {
                                // Group ingredients by section
                                const ingredients = recipe.ingredients || [];
                                const grouped = ingredients.reduce((acc, ing) => {
                                    const section = ing.section || 'Main';
                                    if (!acc[section]) acc[section] = [];
                                    acc[section].push(ing);
                                    return acc;
                                }, {} as Record<string, typeof ingredients>);

                                const sections = Object.keys(grouped);
                                // If only "Main" section, render flat list
                                const showHeaders = sections.length > 1 || (sections.length === 1 && sections[0] !== 'Main');

                                return (
                                    <div className="space-y-6">
                                        {sections.map((section) => (
                                            <div key={section}>
                                                {showHeaders && (
                                                    <h3 className="font-display font-bold text-lg text-honey-600 mb-3 border-b border-honey-100 pb-1">
                                                        {section}
                                                    </h3>
                                                )}
                                                <ul className="space-y-3">
                                                    {grouped[section].map((ing) => (
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
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()
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
