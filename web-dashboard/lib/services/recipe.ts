import api from '../api';

export interface Recipe {
    id: string;
    userId: string;
    title: string;
    description?: string;
    servings?: number;
    prepTime?: number;
    cookTime?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    cuisine?: string;
    tags?: string[];
    thumbnailUrl?: string;
    sourceUrl?: string;
    createdAt: string;
    updatedAt: string;
    ingredients?: Ingredient[];
    steps?: Step[];
}

export interface Ingredient {
    id: string;
    recipeId: string;
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    createdAt: string;
}

export interface Step {
    id: string;
    recipeId: string;
    stepNumber: number;
    instruction: string;
    duration?: number;
    createdAt: string;
}

export interface RecipeInput {
    title: string;
    description?: string;
    servings?: number;
    prepTime?: number;
    cookTime?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    cuisine?: string;
    tags?: string[];
    thumbnailUrl?: string;
    sourceUrl?: string;
    ingredients?: IngredientInput[];
    steps?: StepInput[];
}

export interface IngredientInput {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
}

export interface StepInput {
    stepNumber: number;
    instruction: string;
    duration?: number;
}

export interface RecipesResponse {
    recipes: Recipe[];
    count: number;
}

export const recipeService = {
    // Get all recipes
    async getAll(limit?: number, offset?: number): Promise<RecipesResponse> {
        const params: any = {};
        if (limit) params.limit = limit;
        if (offset) params.offset = offset;
        const response = await api.get<RecipesResponse>('/recipes', { params });
        return response.data;
    },

    // Get single recipe
    async getOne(id: string): Promise<Recipe> {
        const response = await api.get<Recipe>(`/recipes/${id}`);
        return response.data;
    },

    // Create recipe
    async create(recipe: RecipeInput): Promise<Recipe> {
        const response = await api.post<Recipe>('/recipes', recipe);
        return response.data;
    },

    // Update recipe
    async update(id: string, recipe: RecipeInput): Promise<Recipe> {
        const response = await api.put<Recipe>(`/recipes/${id}`, recipe);
        return response.data;
    },

    // Delete recipe
    async delete(id: string): Promise<void> {
        await api.delete(`/recipes/${id}`);
    },
};
