/**
 * Backend Recipe Extraction API Client
 * 
 * This module provides authenticated API calls to the backend for recipe extraction.
 * Unlike the local recipeExtractor.ts (which uses client-side Gemini AI),
 * this routes extraction through the backend, which:
 * - Creates users on first authenticated request
 * - Enforces subscription quotas
 * - Caches extraction results
 * - Provides job-based async processing
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.dlishe.com/api/v1";

export type JobStatus =
    | "pending"
    | "downloading"
    | "processing"
    | "extracting"
    | "completed"
    | "failed"
    | "cancelled"
    | "transient_failure";

export interface JobResponse {
    jobId: string;
    status: JobStatus;
    progress?: number;
    message?: string;
    recipeId?: string;
    recipe?: BackendRecipe;
    error?: {
        code: string;
        message: string;
    };
}

export interface BackendRecipe {
    id: string;
    title: string;
    description?: string;
    sourceUrl?: string;
    sourceType?: string;
    thumbnailUrl?: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    difficulty?: "easy" | "medium" | "hard";
    cuisine?: string;
    tags?: string[];
    notes?: string;
    ingredients: BackendIngredient[];
    instructions: BackendInstruction[];
    isFavorite?: boolean;
    nutrition?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        fiber?: number;
    };
}

export interface BackendIngredient {
    id: string;
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    section?: string;
    notes?: string;
    isOptional?: boolean;
}

export interface BackendInstruction {
    id: string;
    stepNumber: number;
    instruction: string;
    durationSeconds?: number;
    technique?: string;
    tip?: string;
}

export interface ExtractionOptions {
    type?: "url" | "image" | "video";
    language?: "en" | "fr" | "es" | "auto";
    detailLevel?: "quick" | "detailed";
    saveAuto?: boolean;
    forceRefresh?: boolean;
}

export interface ExtractFromUrlParams {
    url: string;
    options?: ExtractionOptions;
    getToken: () => Promise<string | null>;
}

export interface ExtractFromImageParams {
    imageBase64: string;
    mimeType: string;
    options?: ExtractionOptions;
    getToken: () => Promise<string | null>;
}

export interface ExtractionResult {
    success: boolean;
    recipe?: BackendRecipe;
    error?: string;
    jobId?: string;
}

/**
 * Helper to make authenticated API requests
 */
async function authFetch<T>(
    path: string,
    getToken: () => Promise<string | null>,
    options?: RequestInit
): Promise<T> {
    const token = await getToken();

    if (!token) {
        throw new Error("Not authenticated");
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...options?.headers,
        },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => null);
        const errorMessage = body?.error?.message || body?.message || `Request failed (${res.status})`;
        throw new Error(errorMessage);
    }

    return res.json();
}

/**
 * Start a URL extraction job
 */
export async function extractFromUrl({
    url,
    options = {},
    getToken,
}: ExtractFromUrlParams): Promise<JobResponse> {
    const body = {
        type: options.type || "url",
        url,
        language: options.language || "auto",
        detailLevel: options.detailLevel || "detailed",
        saveAuto: options.saveAuto ?? true,
        forceRefresh: options.forceRefresh ?? false,
    };

    return authFetch<JobResponse>("/recipes/extract", getToken, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

/**
 * Start an image extraction job
 */
export async function extractFromImage({
    imageBase64,
    mimeType,
    options = {},
    getToken,
}: ExtractFromImageParams): Promise<JobResponse> {
    const body = {
        type: "image",
        imageBase64,
        mimeType,
        language: options.language || "auto",
        detailLevel: options.detailLevel || "detailed",
        saveAuto: options.saveAuto ?? true,
    };

    return authFetch<JobResponse>("/recipes/extract", getToken, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

/**
 * Get job status
 */
export async function getJobStatus(
    jobId: string,
    getToken: () => Promise<string | null>
): Promise<JobResponse> {
    return authFetch<JobResponse>(`/jobs/${jobId}`, getToken);
}

/**
 * Get recipe by ID
 */
export async function getRecipe(
    recipeId: string,
    getToken: () => Promise<string | null>
): Promise<BackendRecipe> {
    return authFetch<BackendRecipe>(`/recipes/${recipeId}`, getToken);
}

/**
 * Poll a job until completion with progress callback
 */
export async function pollJobUntilComplete(
    jobId: string,
    getToken: () => Promise<string | null>,
    onProgress?: (status: JobStatus, progress: number, message: string) => void,
    pollIntervalMs: number = 1000,
    maxPollTime: number = 300000 // 5 minutes
): Promise<ExtractionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollTime) {
        const job = await getJobStatus(jobId, getToken);

        // Report progress
        if (onProgress) {
            onProgress(job.status, job.progress || 0, job.message || "");
        }

        // Check terminal states
        if (job.status === "completed") {
            // Recipe should be embedded in response, or we need to fetch it
            if (job.recipe) {
                return {
                    success: true,
                    recipe: job.recipe,
                    jobId,
                };
            } else if (job.recipeId) {
                // Fetch the recipe
                const recipe = await getRecipe(job.recipeId, getToken);
                return {
                    success: true,
                    recipe,
                    jobId,
                };
            } else {
                return {
                    success: false,
                    error: "Job completed but no recipe returned",
                    jobId,
                };
            }
        }

        if (job.status === "failed" || job.status === "cancelled" || job.status === "transient_failure") {
            return {
                success: false,
                error: job.error?.message || job.message || "Extraction failed",
                jobId,
            };
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    // Timeout
    return {
        success: false,
        error: "Extraction timed out. Please try again.",
        jobId,
    };
}

/**
 * High-level: Extract recipe from URL and wait for completion
 */
export async function extractRecipeFromUrlAsync(
    url: string,
    getToken: () => Promise<string | null>,
    onProgress?: (status: JobStatus, progress: number, message: string) => void
): Promise<ExtractionResult> {
    try {
        // Start the job
        const startResult = await extractFromUrl({ url, getToken });

        if (!startResult.jobId) {
            return {
                success: false,
                error: "Failed to start extraction job",
            };
        }

        // Poll until complete
        return pollJobUntilComplete(startResult.jobId, getToken, onProgress);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
}

/**
 * High-level: Extract recipe from image and wait for completion
 */
export async function extractRecipeFromImageAsync(
    imageBase64: string,
    mimeType: string,
    getToken: () => Promise<string | null>,
    onProgress?: (status: JobStatus, progress: number, message: string) => void
): Promise<ExtractionResult> {
    try {
        // Start the job
        const startResult = await extractFromImage({ imageBase64, mimeType, getToken });

        if (!startResult.jobId) {
            return {
                success: false,
                error: "Failed to start extraction job",
            };
        }

        // Poll until complete
        return pollJobUntilComplete(startResult.jobId, getToken, onProgress);
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
}
