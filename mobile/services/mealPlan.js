import { authFetch } from "./api";

export async function fetchCurrentPlan({ getToken }) {
  return authFetch("/meal-plans/current", getToken);
}

export async function fetchPlanByWeek({ getToken, date }) {
  return authFetch(`/meal-plans/week/${date}`, getToken);
}

export async function updatePlanTitle({ getToken, planId, title }) {
  return authFetch(`/meal-plans/${planId}`, getToken, {
    method: "PUT",
    body: JSON.stringify({ title }),
  });
}

export async function addPlanEntry({ getToken, planId, recipeId, dayIndex, mealType }) {
  return authFetch(`/meal-plans/${planId}/entries`, getToken, {
    method: "POST",
    body: JSON.stringify({ recipeId, dayIndex, mealType }),
  });
}

export async function removePlanEntry({ getToken, planId, entryId }) {
  return authFetch(`/meal-plans/${planId}/entries/${entryId}`, getToken, {
    method: "DELETE",
  });
}

export async function generateShoppingList({ getToken, planId }) {
  return authFetch(`/meal-plans/${planId}/generate-list`, getToken, {
    method: "POST",
  });
}
