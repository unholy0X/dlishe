import { apiFetch, authFetch } from "./api";

export async function fetchRecipes({ getToken, limit = 20, offset = 0 }) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return authFetch(`/recipes?${params}`, getToken);
}

export async function fetchRecipeById({ recipeId, getToken }) {
  return authFetch(`/recipes/${recipeId}`, getToken);
}

export async function deleteRecipe({ recipeId, getToken }) {
  return authFetch(`/recipes/${recipeId}`, getToken, { method: "DELETE" });
}

export async function fetchSuggested({ limit = 10, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiFetch(`/recipes/suggested?${params}`, {});
}

export async function cloneRecipe({ recipeId, getToken }) {
  return authFetch(`/recipes/${recipeId}/save`, getToken, { method: "POST" });
}
