import { authFetch } from "./api";
import { useLanguageStore } from "../store/languageStore";

function getCurrentLanguage() {
  return useLanguageStore.getState().language || "en";
}

export async function extractRecipeFromUrl({ url, getToken }) {
  return authFetch("/recipes/extract", getToken, {
    method: "POST",
    body: JSON.stringify({
      url,
      saveAuto: true,
      detailLevel: "detailed",
      language: getCurrentLanguage(),
    }),
  });
}

export async function extractRecipeFromImage({ images, getToken }) {
  const lang = getCurrentLanguage();
  // Build request with new images[] array + legacy fields for backward compat
  const payload = {
    type: "image",
    images: images.map((img) => ({
      base64: img.base64,
      mimeType: img.mimeType || "image/jpeg",
    })),
    // Legacy fields for older backend versions
    imageBase64: images[0]?.base64,
    mimeType: images[0]?.mimeType || "image/jpeg",
    saveAuto: true,
    detailLevel: "detailed",
    language: lang,
  };
  return authFetch("/recipes/extract", getToken, {
    method: "POST",
    body: JSON.stringify(payload),
    timeout: 120000,
  });
}

export async function getJobStatus({ jobId, getToken }) {
  return authFetch(`/jobs/${jobId}`, getToken);
}

export async function getRecipe({ recipeId, getToken }) {
  return authFetch(`/recipes/${recipeId}`, getToken);
}

export function isTerminalStatus(status) {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "cancelled"
  );
}
