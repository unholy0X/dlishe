// Package categories provides the single source of truth for ingredient categories
// Used across frontend and backend to ensure consistency
export const VALID_CATEGORIES = [
    'produce',
    'proteins',
    'dairy',
    'pantry',
    'bakery',
    'spices',
    'condiments',
    'beverages',
    'frozen',
    'snacks',
    'household',
    'other'
] as const;

export type PantryCategory = typeof VALID_CATEGORIES[number];

// Category display names for UI
export const CATEGORY_LABELS: Record<PantryCategory, string> = {
    produce: 'Produce',
    proteins: 'Proteins',
    dairy: 'Dairy',
    pantry: 'Pantry',
    bakery: 'Bakery',
    spices: 'Spices',
    condiments: 'Condiments',
    beverages: 'Beverages',
    frozen: 'Frozen',
    snacks: 'Snacks',
    household: 'Household',
    other: 'Other'
};

// Category icons for UI (optional)
export const CATEGORY_ICONS: Record<PantryCategory, string> = {
    produce: '🥬',
    proteins: '🥩',
    dairy: '🥛',
    pantry: '🏺',
    bakery: '🍞',
    spices: '🌶️',
    condiments: '🧂',
    beverages: '🥤',
    frozen: '❄️',
    snacks: '🍿',
    household: '🧽',
    other: '📦'
};

// Validate if a string is a valid category
export function isValidCategory(category: string): category is PantryCategory {
    return VALID_CATEGORIES.includes(category as PantryCategory);
}

// Normalize a category string (basic frontend normalization)
// For comprehensive normalization, the backend handles aliases
export function normalizeCategory(category: string | undefined): PantryCategory {
    if (!category) return 'other';
    const normalized = category.toLowerCase().trim();
    return isValidCategory(normalized) ? normalized : 'other';
}
