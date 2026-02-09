import { create } from "zustand";
import { extractRecipeFromUrl, getJobStatus, getRecipe, isTerminalStatus } from "../services/extract";

const MAX_POLL_TIME = 300000; // 5 minutes
const POLL_INTERVAL = 1000; // 1 second

const initialState = {
  url: "",
  jobId: null,
  status: null,
  progress: 0,
  message: "",
  error: "",
  recipe: null,
  isRunning: false,
};

export const useExtractStore = create((set, get) => ({
  ...initialState,
  setUrl: (url) => set({ url }),
  reset: () => set({ ...initialState }),
  startExtraction: async ({ getToken }) => {
    const url = get().url.trim();
    if (!url) {
      set({ error: "Please paste a recipe URL." });
      return;
    }

    set({
      isRunning: true,
      error: "",
      message: "Starting extraction…",
      status: "pending",
      progress: 0,
      recipe: null,
    });

    try {
      const job = await extractRecipeFromUrl({ url, getToken });
      const jobId = job.jobId || job.jobID || job.id;
      const status = job.status || "pending";

      if (!jobId) {
        throw new Error("No jobId returned from server");
      }

      set({ jobId, status, message: job.message || "Extraction started" });

      // Poll for status with timeout
      const startTime = Date.now();

      while (Date.now() - startTime < MAX_POLL_TIME) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));

        // getToken is called fresh each poll via authFetch (prevents stale tokens)
        const jobStatus = await getJobStatus({ jobId, getToken });
        const nextStatus = jobStatus.status;
        const nextMessage = jobStatus.message || "Working…";
        const nextProgress = typeof jobStatus.progress === "number" ? jobStatus.progress : 0;

        set({
          status: nextStatus,
          message: nextMessage,
          progress: nextProgress,
        });

        if (isTerminalStatus(nextStatus)) {
          if (nextStatus === "completed") {
            // Try to get recipe from response, or fetch by recipeId
            let recipe = jobStatus.recipe || null;
            if (!recipe && jobStatus.recipeId) {
              recipe = await getRecipe({ recipeId: jobStatus.recipeId, getToken });
            }
            if (recipe) {
              set({ recipe, isRunning: false });
            } else {
              set({ error: "Job completed but no recipe returned", isRunning: false });
            }
          } else {
            const errMsg = jobStatus?.error?.message || jobStatus.message || "Extraction failed";
            set({ error: errMsg, isRunning: false });
          }
          return;
        }
      }

      // Timeout
      set({
        error: "Extraction timed out. Please try again.",
        isRunning: false,
      });
    } catch (err) {
      set({
        error: err?.message || "Extraction failed",
        isRunning: false,
      });
    }
  },
}));
