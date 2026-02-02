import api from '../api';
import {
    Recipe,
    RecipeIngredient,
    RecipeStep,
    RecipesResponse,
    RecipeNutrition,
    DietaryInfo,
    RecommendationFilters,
    RecommendationResponse
} from '../types';

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
    notes?: string;
    isOptional?: boolean;
}

export interface StepInput {
    stepNumber: number;
    instruction: string;
    durationSeconds?: number;
    temperature?: string;
    technique?: string;
}

export const recipeService = {
    // Get all user's recipes
    async getAll(limit?: number, offset?: number): Promise<RecipesResponse> {
        const params: any = {};
        if (limit) params.limit = limit;
        if (offset) params.offset = offset;
        const response = await api.get<RecipesResponse>('/recipes', { params });
        return response.data;
    },

    // Get suggested recipes (public/curated)
    async getSuggested(limit?: number, offset?: number): Promise<RecipesResponse> {
        const params: any = {};
        if (limit) params.limit = limit;
        if (offset) params.offset = offset;
        const response = await api.get<RecipesResponse>('/recipes/suggested', { params });
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

    // Save/clone a recipe to user's collection
    async saveRecipe(recipeId: string): Promise<Recipe> {
        const response = await api.post<Recipe>(`/recipes/${recipeId}/save`);
        return response.data;
    },

    // Toggle favorite status
    async toggleFavorite(recipeId: string, isFavorite: boolean): Promise<{ success: boolean; isFavorite: boolean }> {
        const response = await api.post(`/recipes/${recipeId}/favorite`, { isFavorite });
        return response.data;
    },

    // Get recipe recommendations based on pantry
    async getRecommendations(filters?: RecommendationFilters): Promise<RecommendationResponse> {
        const params = filters || {};
        const response = await api.get<RecommendationResponse>('/recipes/recommendations', { params });
        return response.data;
    },
};
