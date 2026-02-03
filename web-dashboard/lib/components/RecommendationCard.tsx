import Link from 'next/link';
import { Clock, Users, Heart, Leaf, Wheat, Milk, Sparkles, ChefHat, ShoppingCart, Star } from 'lucide-react';
import { RecipeRecommendation } from '../types';
import clsx from 'clsx';
import { SyntheticEvent } from 'react';

interface RecommendationCardProps {
    recommendation: RecipeRecommendation;
    className?: string;
}

export function RecommendationCard({
    recommendation,
    className
}: RecommendationCardProps) {
    const { recipe, matchScore, matchedIngredients, missingIngredients, reason } = recommendation;

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
                    {/* Match Score Badge */}
                    <div className={clsx(
                        "absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-bold shadow-sm backdrop-blur-sm",
                        matchScore >= 90 ? 'bg-green-500/90 text-white' :
                            matchScore >= 70 ? 'bg-yellow-500/90 text-white' :
                                'bg-orange-500/90 text-white'
                    )}>
                        {matchScore}% Match
                    </div>
                </div>
            ) : (
                <div className="aspect-video bg-gradient-to-br from-honey-100 to-sage-100 flex items-center justify-center relative shrink-0">
                    <ChefHat className="w-12 h-12 text-honey-300" />
                    <div className={clsx(
                        "absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-bold shadow-sm backdrop-blur-sm",
                        matchScore >= 90 ? 'bg-green-500/90 text-white' :
                            matchScore >= 70 ? 'bg-yellow-500/90 text-white' :
                                'bg-orange-500/90 text-white'
                    )}>
                        {matchScore}% Match
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold text-lg text-text-primary group-hover:text-honey-600 transition-colors line-clamp-2">
                        {recipe.title}
                    </h3>
                    {recipe.isFavorite && (
                        <Heart className="w-4 h-4 fill-honey-500 text-honey-500 shrink-0 mt-1" />
                    )}
                </div>

                <p className="text-xs text-text-muted mb-3 italic">
                    {reason}
                </p>

                {/* Ingredients Match */}
                <div className="space-y-1 mb-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                        <Star className="w-3 h-3 fill-emerald-700" />
                        {matchedIngredients.length} ingredients you have
                    </div>
                    {missingIngredients.length > 0 && (
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md w-fit">
                            <ShoppingCart className="w-3 h-3" />
                            {missingIngredients.length} missing
                        </div>
                    )}
                </div>

                {/* Nutrition & Dietary Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3 h-6 overflow-hidden mt-auto">
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

                <div className="flex items-center gap-3 text-xs text-text-secondary pt-3 border-t border-stone-100">
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
                    {recommendation.nutritionPerServing?.calories && (
                        <span className="flex items-center gap-1 font-medium text-honey-600">
                            {recommendation.nutritionPerServing.calories} cal
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
