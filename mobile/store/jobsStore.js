import { create } from "zustand";

export const ACTIVE_STATUSES = ["pending", "downloading", "processing", "extracting"];
export const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

// Auto-expire completed jobs from the sheet after this many ms
const COMPLETED_JOB_TTL = 60_000;

export const useJobsStore = create((set) => ({
  // Currently in-progress jobs (drives the badge count)
  activeJobs: [],

  // Recently finished jobs shown briefly in the sheet
  completedJobs: [],

  setActiveJobs: (jobs) => set({ activeJobs: jobs }),

  addCompletedJob: (job) =>
    set((state) => ({
      completedJobs: [
        { ...job, _completedAt: Date.now() },
        ...state.completedJobs,
      ].slice(0, 5), // keep last 5 only
    })),

  removeCompletedJob: (id) =>
    set((state) => ({
      completedJobs: state.completedJobs.filter(
        (j) => (j.id ?? j.jobId) !== id
      ),
    })),

  clearExpiredCompleted: () =>
    set((state) => ({
      completedJobs: state.completedJobs.filter(
        (j) => Date.now() - j._completedAt < COMPLETED_JOB_TTL
      ),
    })),
}));
