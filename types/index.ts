// DishFlow Type Definitions

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  sourceType?: 'tiktok' | 'instagram' | 'youtube' | 'website' | 'manual';
  thumbnailUrl?: string;
  prepTime?: number; // in minutes
  cookTime?: number; // in minutes
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  tags?: string[];
  ingredients: Ingredient[];
  instructions: Instruction[];
  notes?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  cookedCount: number;
  lastCookedAt?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  amount?: number;
  unit?: string;
  notes?: string;
  isOptional?: boolean;
  category?: IngredientCategory;
}

export interface Instruction {
  id: string;
  stepNumber: number;
  text: string;
  duration?: number; // in minutes
  imageUrl?: string;
}

export type IngredientCategory =
  | 'produce'
  | 'meat_seafood'
  | 'dairy'
  | 'bakery'
  | 'frozen'
  | 'pantry'
  | 'spices'
  | 'beverages'
  | 'other';

export interface PantryItem {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity?: number;
  unit?: string;
  expiresAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity?: number;
  unit?: string;
  isChecked: boolean;
  recipeId?: string;
  recipeName?: string;
  notes?: string;
  createdAt: string;
}

// Form types for creating/editing
export interface RecipeFormData {
  title: string;
  description?: string;
  sourceUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  tags?: string[];
  ingredients: IngredientFormData[];
  instructions: InstructionFormData[];
  notes?: string;
}

export interface IngredientFormData {
  name: string;
  amount?: string;
  unit?: string;
  notes?: string;
  isOptional?: boolean;
}

export interface InstructionFormData {
  text: string;
  duration?: number;
}
