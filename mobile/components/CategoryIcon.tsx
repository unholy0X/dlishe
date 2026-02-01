// Category Icon Component - Luxury Bohème
import { Leaf, Beef, Milk, Croissant, Package, Flame, Droplet, Coffee, Popcorn, Snowflake, Home, ShoppingCart } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { IngredientCategory } from '@/types';

const CATEGORY_ICON_MAP: Record<IngredientCategory, LucideIcon> = {
    produce: Leaf,
    proteins: Beef,
    dairy: Milk,
    bakery: Croissant,
    pantry: Package,
    spices: Flame,
    condiments: Droplet,
    beverages: Coffee,
    snacks: Popcorn,
    frozen: Snowflake,
    household: Home,
    other: ShoppingCart,
};

interface CategoryIconProps {
    category: IngredientCategory;
    size?: number;
    color?: string;
    strokeWidth?: number;
}

export function CategoryIcon({
    category,
    size = 20,
    color = '#C19A6B',
    strokeWidth = 1.5
}: CategoryIconProps) {
    const Icon = CATEGORY_ICON_MAP[category];
    if (!Icon) {
        console.warn(`No icon found for category: ${category}, using ShoppingCart as fallback`);
        return <ShoppingCart size={size} color={color} strokeWidth={strokeWidth} />;
    }
    return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

export { CATEGORY_ICON_MAP };
