import Link from 'next/link';
import { Clock, Users, Heart, Trash2, Leaf, Wheat, Milk, Sparkles, ChefHat } from 'lucide-react';
import { Recipe } from '../types';
import clsx from 'clsx';
import { SyntheticEvent } from 'react';

interface RecipeCardProps {
    recipe: Recipe;
    onToggleFavorite?: (id: string, isFavorite: boolean) => void;
    onDelete?: (id: string) => void;
    className?: string;
    showDelete?: boolean;
    showFavorite?: boolean;
    hideFooter?: boolean;
    children?: React.ReactNode;
}

export function RecipeCard({
    recipe,
    onToggleFavorite,
    onDelete,
    className,
    showDelete = false,
    showFavorite = true,
    hideFooter = false,
    children
}: RecipeCardProps) {

    const handleFavoriteClick = (e: SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleFavorite?.(recipe.id, !recipe.isFavorite);
    };

    const handleDeleteClick = (e: SyntheticEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete?.(recipe.id);
    };

    return (
        <Link
            href={`/recipes/${recipe.id}`}
            className={clsx(
                "group block bg-white rounded-xl shadow-soft border border-stone-200 overflow-hidden transition-all hover:shadow-warm hover:border-honey-200 flex flex-col h-full",
                className
            )}
        >
            {/* Thumbnail */}
            {recipe.thumbnailUrl ? (
                <div className="aspect-video bg-stone-100 overflow-hidden relative shrink-0">
                    <img
                        src={recipe.thumbnailUrl}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {recipe.sourceType === 'cloned' && (
                        <div className="absolute top-2 right-2 bg-purple-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1 backdrop-blur-sm shadow-sm">
                            <Sparkles size={10} /> Cloned
                        </div>
                    )}
                </div>
            ) : (
                <div className="aspect-video bg-gradient-to-br from-honey-100 to-sage-100 flex items-center justify-center relative shrink-0">
                    <ChefHat className="w-12 h-12 text-honey-300" />
                    {recipe.sourceType === 'cloned' && (
                        <div className="absolute top-2 right-2 bg-purple-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide flex items-center gap-1 backdrop-blur-sm shadow-sm">
                            <Sparkles size={10} /> Cloned
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold text-lg text-text-primary group-hover:text-honey-600 transition-colors line-clamp-2">
                        {recipe.title}
                    </h3>
                </div>

                {recipe.description && (
                    <p className="text-text-muted text-sm mb-4 line-clamp-2 min-h-[2.5em]">
                        {recipe.description}
                    </p>
                )}

                {/* Nutrition & Dietary Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3 h-6 overflow-hidden">
                    {recipe.nutrition?.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-xs capitalize">
                            {tag}
                        </span>
                    ))}
                    {recipe.dietaryInfo?.isVegetarian && (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs flex items-center gap-1">
                            <Leaf className="w-3 h-3" />
                            Veg
                        </span>
                    )}
                    {recipe.dietaryInfo?.isGlutenFree && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center gap-1">
                            <Wheat className="w-3 h-3" />
                            GF
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 text-xs text-text-secondary mb-4 mt-auto">
                    {recipe.prepTime && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {recipe.prepTime}m
                        </span>
                    )}
                    {recipe.servings && (
                        <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {recipe.servings}
                        </span>
                    )}
                    {recipe.difficulty && (
                        <span className={clsx(
                            "px-2 py-0.5 rounded-full capitalize",
                            recipe.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                        )}>
                            {recipe.difficulty}
                        </span>
                    )}
                </div>

                {!hideFooter && (
                    <div className="flex items-center justify-between pt-4 border-t border-stone-100 mt-2">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-text-muted">
                                {new Date(recipe.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {showFavorite && onToggleFavorite && (
                                <button
                                    onClick={handleFavoriteClick}
                                    className="p-1.5 text-gray-400 hover:text-honey-600 rounded-md transition-all active:scale-90"
                                    title={recipe.isFavorite ? "Remove from favorites" : "Add to favorites"}
                                >
                                    <Heart
                                        className={clsx(
                                            "w-4 h-4 transition-colors",
                                            recipe.isFavorite && "fill-honey-500 text-honey-500"
                                        )}
                                    />
                                </button>
                            )}
                            {showDelete && onDelete && (
                                <button
                                    onClick={handleDeleteClick}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                    title="Delete Recipe"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {children && (
                    <div className="mt-4 pt-4 border-t border-stone-100">
                        {children}
                    </div>
                )}
            </div>
        </Link>
    );
}
