import { authFetch } from "./api";

/**
 * Fetch paginated list of pantry items, grouped by category
 */
export async function fetchPantryItems({ getToken, category, limit = 100, offset = 0 }) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (category) params.set("category", category);
    return authFetch(`/pantry?${params}`, getToken);
}

/**
 * Create a new pantry item
 */
export async function createPantryItem({ getToken, name, category, quantity, unit }) {
    return authFetch("/pantry", getToken, {
        method: "POST",
        body: JSON.stringify({ name, category, quantity, unit }),
    });
}

/**
 * Delete a pantry item by ID
 */
export async function deletePantryItem({ getToken, itemId }) {
    return authFetch(`/pantry/${itemId}`, getToken, { method: "DELETE" });
}

/**
 * Scan image(s) with AI to detect pantry items
 * @param {Object} options
 * @param {Function} options.getToken - Clerk getToken function
 * @param {Array} options.images - [{base64, mimeType}]
 * @param {boolean} [options.autoAdd=true] - Auto-add high-confidence items to pantry
 */
export async function scanPantryImage({ getToken, images, autoAdd = true }) {
    const payload = {
        images: images.map((img) => ({
            base64: img.base64,
            mimeType: img.mimeType || "image/jpeg",
        })),
        // Legacy fields for older backend versions
        imageBase64: images[0]?.base64,
        mimeType: images[0]?.mimeType || "image/jpeg",
        autoAdd,
    };
    return authFetch("/pantry/scan", getToken, {
        method: "POST",
        body: JSON.stringify(payload),
        timeout: 120000,
    });
}
