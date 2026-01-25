// Category Visual Configuration for Pantry Grid
// Colors, gradients, and styling for category tiles and item badges

import type { IngredientCategory } from '@/types';

export interface CategoryVisual {
  bg: string;
  icon: string;
  gradient: [string, string];
}

// Visual styling for all 12 categories - luxury bohème palette
export const CATEGORY_VISUALS: Record<IngredientCategory, CategoryVisual> = {
  produce: {
    bg: '#7D7A68',
    icon: 'white',
    gradient: ['#8D8A78', '#6D6A58'],
  },
  proteins: {
    bg: '#A8845A',
    icon: 'white',
    gradient: ['#B8946A', '#98744A'],
  },
  dairy: {
    bg: '#E8D4B8',
    icon: '#7D7A68',
    gradient: ['#F0DCC0', '#E0CCB0'],
  },
  bakery: {
    bg: '#D4B896',
    icon: '#5C5A4D',
    gradient: ['#DCC09E', '#CCB08E'],
  },
  pantry: {
    bg: '#C19A6B',
    icon: 'white',
    gradient: ['#D1AA7B', '#B18A5B'],
  },
  spices: {
    bg: '#B85C38',
    icon: 'white',
    gradient: ['#C86C48', '#A84C28'],
  },
  condiments: {
    bg: '#8B8173',
    icon: 'white',
    gradient: ['#9B9183', '#7B7163'],
  },
  beverages: {
    bg: '#6B5B4F',
    icon: 'white',
    gradient: ['#7B6B5F', '#5B4B3F'],
  },
  snacks: {
    bg: '#D4A574',
    icon: '#5C5A4D',
    gradient: ['#DEB584', '#C49564'],
  },
  frozen: {
    bg: '#9FB4C7',
    icon: 'white',
    gradient: ['#AFCCD7', '#8FA4B7'],
  },
  household: {
    bg: '#ADA396',
    icon: 'white',
    gradient: ['#BDB3A6', '#9D9386'],
  },
  other: {
    bg: '#C4BBAB',
    icon: '#5C5A4D',
    gradient: ['#D4CBBB', '#B4AB9B'],
  },
};

// Category icons mapping (emoji representation)
export const CATEGORY_ICONS: Record<IngredientCategory, string> = {
  produce: '🥬',
  proteins: '🥩',
  dairy: '🥛',
  bakery: '🥖',
  pantry: '📦',
  spices: '🧂',
  condiments: '🫙',
  beverages: '🍷',
  snacks: '🍪',
  frozen: '🧊',
  household: '🧹',
  other: '📋',
};

// Get visual config for a category
export function getCategoryVisual(category: IngredientCategory): CategoryVisual {
  return CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS.other;
}

// Get icon for a category
export function getCategoryIcon(category: IngredientCategory): string {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.other;
}
