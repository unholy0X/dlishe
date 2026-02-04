import api from '../api';
import { ExtractRequest, Job, JobsResponse } from '../types';

export const extractionService = {
    /**
     * Unified extraction endpoint for URL, image, and video sources
     */
    async extract(request: ExtractRequest, token: string): Promise<Job> {
        const response = await api.post<Job>('/recipes/extract', request, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    /**
     * Extract recipe from image file using multipart form upload
     */
    async extractImageFile(
        file: File,
        options: {
            language?: 'en' | 'fr' | 'es' | 'auto';
            detailLevel?: 'quick' | 'detailed';
            saveAuto?: boolean;
        } | undefined,
        token: string
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

        const response = await api.post<Job>('/recipes/extract', formData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    /**
     * Get job status by ID
     */
    async getJobStatus(jobId: string, token: string): Promise<Job> {
        const response = await api.get<Job>(`/jobs/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    /**
     * List user jobs
     */
    async listJobs(filters: {
        type?: 'url' | 'image' | 'video';
        limit?: number;
        offset?: number;
    } | undefined, token: string): Promise<JobsResponse> {
        const params = filters || {};
        const response = await api.get<JobsResponse>('/jobs', {
            params,
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    /**
     * Cancel a running job
     */
    async cancelJob(jobId: string, token: string): Promise<void> {
        await api.post(`/jobs/${jobId}/cancel`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    /**
     * Delete a job history item
     */
    async deleteJob(jobId: string, token: string): Promise<void> {
        await api.delete(`/jobs/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    /**
     * Clear all finished jobs
     */
    async clearJobHistory(token: string): Promise<void> {
        await api.delete('/jobs', {
            headers: { Authorization: `Bearer ${token}` }
        });
    },
};
