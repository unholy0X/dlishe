import { create } from "zustand";
import { extractRecipeFromUrl, extractRecipeFromImage, getJobStatus, getRecipe, isTerminalStatus } from "../services/extract";

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

async function pollJob({ jobId, getToken, set }) {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const jobStatus = await getJobStatus({ jobId, getToken });
    const nextStatus = jobStatus.status;
    const nextMessage = jobStatus.message || "Working on it…";
    const nextProgress = typeof jobStatus.progress === "number" ? jobStatus.progress : 0;

    set({
      status: nextStatus,
      message: nextMessage,
      progress: nextProgress,
    });

    if (isTerminalStatus(nextStatus)) {
      if (nextStatus === "completed") {
        let recipe = jobStatus.recipe || null;
        if (!recipe && jobStatus.recipeId) {
          recipe = await getRecipe({ recipeId: jobStatus.recipeId, getToken });
        }
        if (recipe) {
          set({ recipe, isRunning: false });
        } else {
          set({ error: "We couldn't find the recipe. Please try again.", isRunning: false });
        }
      } else {
        const errMsg = jobStatus?.error?.message || jobStatus.message || "Something went wrong. Give it another try.";
        set({ error: errMsg, isRunning: false });
      }
      return;
    }
  }

  set({
    error: "This is taking too long. Give it another try?",
    isRunning: false,
  });
}

export const useExtractStore = create((set, get) => ({
  ...initialState,
  setUrl: (url) => set({ url }),
  reset: () => set({ ...initialState }),

  startExtraction: async ({ getToken }) => {
    const url = get().url.trim();
    if (!url) {
      set({ error: "Paste a recipe link to get started." });
      return;
    }

    set({
      isRunning: true,
      error: "",
      message: "Getting things ready…",
      status: "pending",
      progress: 0,
      recipe: null,
    });

    try {
      const job = await extractRecipeFromUrl({ url, getToken });
      const jobId = job.jobId || job.jobID || job.id;

      if (!jobId) {
        throw new Error("Something went wrong. Please try again.");
      }

      set({ jobId, status: job.status || "pending", message: job.message || "On it!" });
      await pollJob({ jobId, getToken, set });
    } catch (err) {
      set({
        error: err?.message || "Something went wrong. Give it another try.",
        isRunning: false,
      });
    }
  },

  startImageExtraction: async ({ imageBase64, mimeType, getToken }) => {
    if (!imageBase64) {
      set({ error: "No photo selected." });
      return;
    }

    set({
      isRunning: true,
      error: "",
      message: "Reading your recipe…",
      status: "pending",
      progress: 0,
      recipe: null,
    });

    try {
      const job = await extractRecipeFromImage({ imageBase64, mimeType, getToken });
      const jobId = job.jobId || job.jobID || job.id;

      if (!jobId) {
        throw new Error("Something went wrong. Please try again.");
      }

      set({ jobId, status: job.status || "pending", message: job.message || "On it!" });
      await pollJob({ jobId, getToken, set });
    } catch (err) {
      set({
        error: err?.message || "Something went wrong. Give it another try.",
        isRunning: false,
      });
    }
  },
}));
