import { authFetch } from "./api";

export async function extractRecipeFromUrl({ url, getToken }) {
  return authFetch("/recipes/extract", getToken, {
    method: "POST",
    body: JSON.stringify({
      url,
      saveAuto: true,
      detailLevel: "detailed",
      language: "auto",
    }),
  });
}

export async function extractRecipeFromImage({ imageBase64, mimeType, getToken }) {
  return authFetch("/recipes/extract", getToken, {
    method: "POST",
    body: JSON.stringify({
      type: "image",
      imageBase64,
      mimeType: mimeType || "image/jpeg",
      saveAuto: true,
      detailLevel: "detailed",
      language: "auto",
    }),
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
