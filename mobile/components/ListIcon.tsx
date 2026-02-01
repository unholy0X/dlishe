// List Icon Component - Luxury Bohème
import { ShoppingCart, PartyPopper, Package, UtensilsCrossed, Salad, Coffee, Wine, Cake, Pizza, Heart, Star, Home, Soup, Apple, Sandwich, IceCream } from 'lucide-react-native';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export type IconName =
    | 'cart'
    | 'party'
    | 'package'
    | 'utensils'
    | 'salad'
    | 'coffee'
    | 'wine'
    | 'cake'
    | 'pizza'
    | 'heart'
    | 'star'
    | 'home'
    | 'soup'
    | 'apple'
    | 'sandwich'
    | 'icecream';

const ICON_MAP: Record<IconName, LucideIcon> = {
    cart: ShoppingCart,
    party: PartyPopper,
    package: Package,
    utensils: UtensilsCrossed,
    salad: Salad,
    coffee: Coffee,
    wine: Wine,
    cake: Cake,
    pizza: Pizza,
    heart: Heart,
    star: Star,
    home: Home,
    soup: Soup,
    apple: Apple,
    sandwich: Sandwich,
    icecream: IceCream,
};

interface ListIconProps {
    name: IconName;
    size?: number;
    color?: string;
    strokeWidth?: number;
    withBackground?: boolean;
    backgroundColor?: string;
}

export function ListIcon({
    name,
    size = 24,
    color = '#C19A6B',
    strokeWidth = 1.5,
    withBackground = false,
    backgroundColor = '#F5E6D3'
}: ListIconProps) {
    const Icon = ICON_MAP[name] || ShoppingCart;

    if (withBackground) {
        return (
            <View
                style={{
                    width: size * 1.8,
                    height: size * 1.8,
                    borderRadius: (size * 1.8) / 2,
                    backgroundColor,
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Icon size={size} color={color} strokeWidth={strokeWidth} />
            </View>
        );
    }

    return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

// Helper to get all available icons for selection
export const AVAILABLE_ICONS: IconName[] = [
    'cart',
    'party',
    'package',
    'utensils',
    'salad',
    'coffee',
    'wine',
    'cake',
    'pizza',
    'soup',
    'sandwich',
    'apple',
    'icecream',
    'heart',
    'star',
    'home',
];

// Default icon for new lists
export const DEFAULT_ICON: IconName = 'cart';
