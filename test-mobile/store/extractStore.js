import { create } from "zustand";
import { extractRecipeFromUrl, getJobStatus, isTerminalStatus } from "../services/extract";

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
      const token = await getToken?.();
      console.log("token here", token);
      const job = await extractRecipeFromUrl({ url, token });
      const jobId = job.jobId || job.jobID || job.id;
      const status = job.status || "pending";

      if (!jobId) {
        throw new Error("No jobId returned from server");
      }

      set({ jobId, status, message: job.message || "Extraction started" });

      // Poll for status
      let done = false;
      while (!done) {
        await new Promise((r) => setTimeout(r, 2000));
        const jobStatus = await getJobStatus({ jobId, token });
        const nextStatus = jobStatus.status;
        const nextMessage = jobStatus.message || "Working…";
        const nextProgress = typeof jobStatus.progress === "number" ? jobStatus.progress : 0;
        const nextRecipe = jobStatus.recipe || null;

        set({
          status: nextStatus,
          message: nextMessage,
          progress: nextProgress,
          recipe: nextRecipe,
        });

        if (isTerminalStatus(nextStatus)) {
          done = true;
          if (nextStatus !== "completed") {
            const errMsg = jobStatus?.error?.message || "Extraction failed";
            set({ error: errMsg });
          }
          set({ isRunning: false });
        }
      }
    } catch (err) {
      set({
        error: err?.message || "Extraction failed",
        isRunning: false,
      });
    }
  },
}));
