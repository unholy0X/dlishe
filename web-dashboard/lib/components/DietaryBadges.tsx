import { DietaryInfo } from '../types';
import { Leaf, WheatOff, MilkOff, Ban, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface DietaryBadgesProps {
    dietaryInfo?: DietaryInfo;
    className?: string;
}

export function DietaryBadges({ dietaryInfo, className }: DietaryBadgesProps) {
    if (!dietaryInfo) return null;

    const badges = [
        { key: 'isVegetarian', label: 'Vegetarian', icon: Leaf, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
        { key: 'isVegan', label: 'Vegan', icon: Leaf, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
        { key: 'isGlutenFree', label: 'Gluten Free', icon: WheatOff, color: 'bg-amber-100 text-amber-800 border-amber-200' },
        { key: 'isDairyFree', label: 'Dairy Free', icon: MilkOff, color: 'bg-blue-100 text-blue-800 border-blue-200' },
        { key: 'isKeto', label: 'Keto', icon: Zap, color: 'bg-purple-100 text-purple-800 border-purple-200' },
    ] as const;

    const activeBadges = badges.filter(b => dietaryInfo[b.key as keyof DietaryInfo]);

    return (
        <div className={clsx("flex flex-wrap gap-2", className)}>
            {activeBadges.map(badge => (
                <span key={badge.key} className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", badge.color)}>
                    <badge.icon className="w-3.5 h-3.5" />
                    {badge.label}
                </span>
            ))}

            {dietaryInfo.allergens && dietaryInfo.allergens.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Contains: {dietaryInfo.allergens.join(', ')}
                </span>
            )}
        </div>
    );
}

// Helper icon
function Zap(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
    )
}
