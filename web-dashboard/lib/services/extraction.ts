import api from '../api';
import { ExtractRequest, Job, JobsResponse } from '../types';

export const extractionService = {
    /**
     * Unified extraction endpoint for URL, image, and video sources
     */
    async extract(request: ExtractRequest): Promise<Job> {
        const response = await api.post<Job>('/recipes/extract', request);
        return response.data;
    },

    /**
     * Extract recipe from image file using multipart form upload
     */
    async extractImageFile(
        file: File,
        options?: {
            language?: 'en' | 'fr' | 'es' | 'auto';
            detailLevel?: 'quick' | 'detailed';
            saveAuto?: boolean;
        }
    ): Promise<Job> {
        const formData = new FormData();
        formData.append('type', 'image');
        formData.append('image', file);
        formData.append('mimeType', file.type);

        if (options?.language) {
            formData.append('language', options.language);
        }
        if (options?.detailLevel) {
            formData.append('detailLevel', options.detailLevel);
        }
        if (options?.saveAuto !== undefined) {
            formData.append('saveAuto', String(options.saveAuto));
        }

        const response = await api.post<Job>('/recipes/extract', formData);
        return response.data;
    },

    /**
     * Get job status by ID
     */
    async getJobStatus(jobId: string): Promise<Job> {
        const response = await api.get<Job>(`/jobs/${jobId}`);
        return response.data;
    },

    /**
     * List jobs with optional filters
     */
    async listJobs(filters?: {
        type?: 'url' | 'image' | 'video';
        limit?: number;
        offset?: number;
    }): Promise<JobsResponse> {
        const params = filters || {};
        const response = await api.get<JobsResponse>('/jobs', { params });
        return response.data;
    },

    /**
     * Cancel a running job
     */
    async cancelJob(jobId: string): Promise<void> {
        await api.post(`/jobs/${jobId}/cancel`);
    },

    /**
     * Delete a job history item
     */
    async deleteJob(jobId: string): Promise<void> {
        await api.delete(`/jobs/${jobId}`);
    },

    /**
     * Clear all finished jobs
     */
    async clearJobHistory(): Promise<void> {
        await api.delete('/jobs');
    },
};
