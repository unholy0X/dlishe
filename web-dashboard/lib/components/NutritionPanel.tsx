import { RecipeNutrition } from '../types';
import { Activity, Flame, Zap, Droplet, Heart } from 'lucide-react';

interface NutritionPanelProps {
    nutrition?: RecipeNutrition;
}

export function NutritionPanel({ nutrition }: NutritionPanelProps) {
    if (!nutrition) return null;

    const macros = [
        { label: 'Protein', value: nutrition.protein, unit: 'g', color: 'bg-blue-100 text-blue-700', icon: Activity },
        { label: 'Carbs', value: nutrition.carbs, unit: 'g', color: 'bg-green-100 text-green-700', icon: Zap },
        { label: 'Fat', value: nutrition.fat, unit: 'g', color: 'bg-yellow-100 text-yellow-700', icon: Droplet },
    ];

    const micros = [
        { label: 'Fiber', value: nutrition.fiber, unit: 'g' },
        { label: 'Sugar', value: nutrition.sugar, unit: 'g' },
        { label: 'Sodium', value: nutrition.sodium, unit: 'mg' },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <h3 className="text-lg font-display font-bold text-stone-900 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-honey-500" />
                    Nutrition per Serving
                </div>
                {nutrition.confidence && (
                    <div className={`text-xs px-2 py-1 rounded-full border ${nutrition.confidence > 0.8 ? 'bg-green-50 text-green-700 border-green-200' :
                            nutrition.confidence > 0.5 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {Math.round(nutrition.confidence * 100)}% AI Confidence
                    </div>
                )}
            </h3>

            <div className="flex items-baseline gap-2 mb-6">
                <span className="text-3xl font-bold text-stone-900">{nutrition.calories || '-'}</span>
                <span className="text-stone-500 font-medium">kcal</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
                {macros.map((macro) => (
                    <div key={macro.label} className={`p-3 rounded-xl ${macro.color} bg-opacity-50`}>
                        <div className="flex items-center gap-1.5 mb-1 opacity-80">
                            <macro.icon className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold uppercase tracking-wide">{macro.label}</span>
                        </div>
                        <div className="text-lg font-bold">
                            {macro.value || '-'}
                            <span className="text-xs ml-0.5 opacity-70">{macro.unit}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-stone-100">
                {micros.map((micro) => (
                    <div key={micro.label} className="flex justify-between items-center text-sm">
                        <span className="text-stone-600">{micro.label}</span>
                        <span className="font-medium text-stone-900">
                            {micro.value ? `${micro.value}${micro.unit}` : '-'}
                        </span>
                    </div>
                ))}
            </div>

            {nutrition.tags && nutrition.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {nutrition.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
