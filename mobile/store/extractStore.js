import { create } from "zustand";
import { extractRecipeFromUrl, extractRecipeFromImage, getJobStatus, getRecipe, isTerminalStatus } from "../services/extract";

const MAX_POLL_TIME = 300000; // 5 minutes
const INITIAL_POLL_INTERVAL = 1000; // 1 second
const MAX_POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_RETRIES = 3; // retries per poll failure

// Cancellation token — incremented on each new extraction or reset
let currentExtractionId = 0;

function friendlyError(raw) {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("quota_exceeded") || msg.includes("monthly extraction limit") || msg.includes("monthly scan limit"))
    return "QUOTA_EXCEEDED";
  if (msg.includes("download") || msg.includes("yt-dlp") || msg.includes("ytdl"))
    return "We couldn't download this video. The link may be private, region-locked, or unsupported.";
  if (msg.includes("instagram"))
    return "Instagram blocked this request. Try copying the recipe text or taking a screenshot instead.";
  if (msg.includes("tiktok"))
    return "We couldn't access this TikTok. It may be private or region-restricted.";
  if (msg.includes("timeout") || msg.includes("timed out"))
    return "The request took too long. Please try again.";
  if (msg.includes("rate") || msg.includes("limit") || msg.includes("429"))
    return "Too many requests. Please wait a moment and try again.";
  if (msg.includes("not found") || msg.includes("404"))
    return "We couldn't find a recipe at this link. Double-check the URL.";
  if (msg.includes("no recipe") || msg.includes("couldn't extract") || msg.includes("could not extract"))
    return "We couldn't find a recipe in this content. Try a different link or take a photo.";
  if (raw && raw.length > 120)
    return "Something went wrong processing this link. Try a different one or take a photo instead.";
  return raw || "Something went wrong. Give it another try.";
}

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

async function pollJob({ jobId, getToken, set, extractionId }) {
  const startTime = Date.now();
  let consecutiveFailures = 0;
  let pollCount = 0;

  while (Date.now() - startTime < MAX_POLL_TIME) {
    // Check cancellation before each poll
    if (extractionId !== currentExtractionId) return;

    // Progressive backoff: 1s for first 10 polls, then ramp up to 5s
    const interval = pollCount < 10
      ? INITIAL_POLL_INTERVAL
      : Math.min(INITIAL_POLL_INTERVAL + (pollCount - 10) * 500, MAX_POLL_INTERVAL);
    await new Promise((r) => setTimeout(r, interval));
    pollCount++;

    // Check cancellation after sleep
    if (extractionId !== currentExtractionId) return;

    let jobStatus;
    try {
      jobStatus = await getJobStatus({ jobId, getToken });
      consecutiveFailures = 0;
    } catch (err) {
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_POLL_RETRIES) {
        set({
          error: "Connection lost. Please check your network and try again.",
          isRunning: false,
        });
        return;
      }
      // Wait a bit longer before retrying
      await new Promise((r) => setTimeout(r, MAX_POLL_INTERVAL));
      continue;
    }

    if (extractionId !== currentExtractionId) return;

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
          try {
            recipe = await getRecipe({ recipeId: jobStatus.recipeId, getToken });
          } catch {
            // Fall through to "couldn't find" error below
          }
        }
        if (extractionId !== currentExtractionId) return;
        if (recipe) {
          set({ recipe, isRunning: false });
        } else {
          set({ error: "We couldn't find the recipe. Please try again.", isRunning: false });
        }
      } else {
        const rawMsg = jobStatus?.error?.message || jobStatus.message || "";
        const errMsg = friendlyError(rawMsg);
        set({ error: errMsg, isRunning: false });
      }
      return;
    }
  }

  if (extractionId !== currentExtractionId) return;
  set({
    error: "This is taking too long. Give it another try?",
    isRunning: false,
  });
}

export const useExtractStore = create((set, get) => ({
  ...initialState,
  setUrl: (url) => set({ url }),
  reset: () => {
    currentExtractionId++; // Cancel any running poll loop
    set({ ...initialState });
  },

  startExtraction: async ({ getToken }) => {
    const url = get().url.trim();
    if (!url) {
      set({ error: "Paste a recipe link to get started." });
      return;
    }

    currentExtractionId++; // Cancel any previous poll
    const extractionId = currentExtractionId;

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
      if (extractionId !== currentExtractionId) return;
      const jobId = job.jobId || job.jobID || job.id;

      if (!jobId) {
        throw new Error("Something went wrong. Please try again.");
      }

      set({ jobId, status: job.status || "pending", message: job.message || "On it!" });
      await pollJob({ jobId, getToken, set, extractionId });
    } catch (err) {
      if (extractionId !== currentExtractionId) return;
      set({
        error: friendlyError(err?.message),
        isRunning: false,
      });
    }
  },

  startImageExtraction: async ({ images, getToken }) => {
    if (!images || images.length === 0) {
      set({ error: "No photo selected." });
      return;
    }

    currentExtractionId++; // Cancel any previous poll
    const extractionId = currentExtractionId;

    set({
      isRunning: true,
      error: "",
      message: "Reading your recipe…",
      status: "pending",
      progress: 0,
      recipe: null,
    });

    try {
      const job = await extractRecipeFromImage({ images, getToken });
      if (extractionId !== currentExtractionId) return;
      const jobId = job.jobId || job.jobID || job.id;

      if (!jobId) {
        throw new Error("Something went wrong. Please try again.");
      }

      set({ jobId, status: job.status || "pending", message: job.message || "On it!" });
      await pollJob({ jobId, getToken, set, extractionId });
    } catch (err) {
      if (extractionId !== currentExtractionId) return;
      set({
        error: friendlyError(err?.message),
        isRunning: false,
      });
    }
  },
}));
