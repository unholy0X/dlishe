import { apiFetch, authFetch } from "./api";
import { useLanguageStore } from "../store/languageStore";

function getCurrentLanguage() {
  return useLanguageStore.getState().language || "en";
}

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
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset), lang: getCurrentLanguage() });
  return apiFetch(`/recipes/suggested?${params}`, {});
}

export async function fetchFeatured({ limit = 30, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset), lang: getCurrentLanguage() });
  return apiFetch(`/recipes/featured?${params}`, {});
}

export async function cloneRecipe({ recipeId, getToken }) {
  return authFetch(`/recipes/${recipeId}/save`, getToken, { method: "POST" });
}

export async function searchRecipes({ getToken, query, limit = 10 }) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return authFetch(`/recipes/search?${params}`, getToken);
}

export async function searchPublicRecipes({ query, limit = 15 }) {
  const params = new URLSearchParams({ q: query, limit: String(limit), lang: getCurrentLanguage() });
  return apiFetch(`/recipes/search/public?${params}`, {});
}

export async function toggleFavorite({ recipeId, isFavorite, getToken }) {
  return authFetch(`/recipes/${recipeId}/favorite`, getToken, {
    method: "POST",
    body: JSON.stringify({ isFavorite }),
  });
}

export async function fetchRecommendations({ getToken, filter, limit = 20 }) {
  const params = new URLSearchParams({ limit: String(limit), minMatch: "0" });
  if (filter === "high-protein") {
    params.set("minProtein", "20");
    params.set("mood", "healthy");
  } else if (filter === "quick-meals") {
    params.set("maxTime", "30");
    params.set("mood", "quick");
  }
  return authFetch(`/recommendations?${params}`, getToken);
}
