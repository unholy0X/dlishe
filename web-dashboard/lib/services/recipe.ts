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
    async getAll(token: string, limit?: number, offset?: number): Promise<RecipesResponse> {
        const params: any = {};
        if (limit) params.limit = limit;
        if (offset) params.offset = offset;
        const response = await api.get<RecipesResponse>('/recipes', {
            params,
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Get suggested recipes (public/curated)
    async getSuggested(token: string, limit?: number, offset?: number): Promise<RecipesResponse> {
        const params: any = {};
        if (limit) params.limit = limit;
        if (offset) params.offset = offset;
        const response = await api.get<RecipesResponse>('/recipes/suggested', {
            params,
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Get single recipe
    async getOne(id: string, token: string): Promise<Recipe> {
        const response = await api.get<Recipe>(`/recipes/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Create recipe
    async create(recipe: RecipeInput, token: string): Promise<Recipe> {
        const response = await api.post<Recipe>('/recipes', recipe, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Update recipe
    async update(id: string, recipe: RecipeInput, token: string): Promise<Recipe> {
        const response = await api.put<Recipe>(`/recipes/${id}`, recipe, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Delete recipe
    async delete(id: string, token: string): Promise<void> {
        await api.delete(`/recipes/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    // Save/clone a recipe to user's collection
    async saveRecipe(recipeId: string, token: string): Promise<Recipe> {
        const response = await api.post<Recipe>(`/recipes/${recipeId}/save`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Toggle favorite status
    async toggleFavorite(recipeId: string, isFavorite: boolean, token: string): Promise<{ success: boolean; isFavorite: boolean }> {
        const response = await api.post(`/recipes/${recipeId}/favorite`, { isFavorite }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    // Get recipe recommendations based on pantry
    async getRecommendations(token: string, filters?: RecommendationFilters): Promise<RecommendationResponse> {
        const params = filters || {};
        const response = await api.get<RecommendationResponse>('/recipes/recommendations', {
            params,
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },
};
