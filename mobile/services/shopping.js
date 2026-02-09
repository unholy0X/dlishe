import { authFetch } from "./api";

/**
 * Fetch all shopping lists for the current user
 */
export async function fetchShoppingLists({ getToken }) {
    return authFetch("/shopping-lists", getToken);
}

/**
 * Create a new shopping list
 */
export async function createShoppingList({ getToken, name, icon, description }) {
    return authFetch("/shopping-lists", getToken, {
        method: "POST",
        body: JSON.stringify({ name, icon, description }),
    });
}

/**
 * Get a shopping list with all its items
 */
export async function fetchShoppingList({ getToken, listId }) {
    return authFetch(`/shopping-lists/${listId}?includeItems=true`, getToken);
}

/**
 * Delete a shopping list
 */
export async function deleteShoppingList({ getToken, listId }) {
    return authFetch(`/shopping-lists/${listId}`, getToken, {
        method: "DELETE",
    });
}

/**
 * Archive a shopping list
 */
export async function archiveShoppingList({ getToken, listId }) {
    return authFetch(`/shopping-lists/${listId}/archive`, getToken, {
        method: "POST",
    });
}

/**
 * Add item to a shopping list
 */
export async function addShoppingItem({ getToken, listId, name, quantity, unit, category }) {
    return authFetch(`/shopping-lists/${listId}/items`, getToken, {
        method: "POST",
        body: JSON.stringify({ name, quantity, unit, category }),
    });
}

/**
 * Delete item from a shopping list
 */
export async function deleteShoppingItem({ getToken, listId, itemId }) {
    return authFetch(`/shopping-lists/${listId}/items/${itemId}`, getToken, {
        method: "DELETE",
    });
}

/**
 * Toggle item checked status
 */
export async function toggleItemChecked({ getToken, listId, itemId }) {
    return authFetch(`/shopping-lists/${listId}/items/${itemId}/check`, getToken, {
        method: "POST",
    });
}

/**
 * Add all ingredients from a recipe to the shopping list
 */
export async function addFromRecipe({ getToken, listId, recipeId }) {
    return authFetch(`/shopping-lists/${listId}/add-from-recipe`, getToken, {
        method: "POST",
        body: JSON.stringify({ recipeId }),
    });
}

/**
 * Complete a shopping list (check all items and archive)
 */
export async function completeList({ getToken, listId }) {
    return authFetch(`/shopping-lists/${listId}/complete`, getToken, {
        method: "POST",
    });
}

/**
 * Smart merge multiple shopping lists into one
 */
export async function smartMergeLists({ getToken, sourceListIds }) {
    return authFetch("/shopping-lists/smart-merge", getToken, {
        method: "POST",
        body: JSON.stringify({ sourceListIds }),
    });
}
