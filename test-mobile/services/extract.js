import { apiFetch } from "./api";

export async function extractRecipeFromUrl({ url, token }) {
  return apiFetch("/recipes/extract", {
    method: "POST",
    token,
    body: JSON.stringify({
      type: "url",
      url,
      saveAuto: true,
      detailLevel: "detailed",
      language: "auto",
    }),
  });
}

export async function getJobStatus({ jobId, token }) {
  return apiFetch(`/jobs/${jobId}`, { token });
}

export function isTerminalStatus(status) {
  return status === "completed" || status === "failed" || status === "cancelled";
}
