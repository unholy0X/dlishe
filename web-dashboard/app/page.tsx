"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import {
  Plus,
  Video,
  Loader2,
  ChefHat,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play
} from 'lucide-react';
import clsx from 'clsx';

interface Job {
  jobId: string;
  status: 'pending' | 'downloading' | 'processing' | 'extracting' | 'completed' | 'failed';
  progress: number;
  message: string;
  videoUrl: string;
  createdAt: string;
  recipe?: {
    id: string;
    title: string;
  };
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 1. Initial Load & Auth Check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // 2. Load Jobs
  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs');
      setJobs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchJobs();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const hasActiveJobs = jobs.some(j =>
      ['pending', 'downloading', 'processing', 'extracting'].includes(j.status)
    );

    if (hasActiveJobs) {
      const interval = setInterval(fetchJobs, 2000);
      return () => clearInterval(interval);
    }
  }, [jobs, isAuthenticated]);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl) return;

    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/video/extract', {
        videoUrl,
        language: 'en',
        detailLevel: 'detailed'
      });
      setVideoUrl('');
      fetchJobs(); // Refresh immediately
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Extraction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 text-honey-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-honey-500" />
            <span className="font-display font-bold text-xl text-text-primary">DishFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">Hello, {user?.name}</span>
            <button
              onClick={() => { useAuth().logout() }}
              className="text-sm text-text-muted hover:text-text-primary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">

        {/* Hero / Extraction Input */}
        <section className="bg-white rounded-2xl shadow-warm border border-stone-200 p-8 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-medium text-text-primary">Extract Recipe from Video</h1>
              <p className="text-text-muted">Paste a YouTube or TikTok URL to generate a recipe instantly.</p>
            </div>

            <form onSubmit={handleExtract} className="flex gap-2 relative">
              <div className="relative flex-1">
                <Video className="absolute left-3 top-3 w-5 h-5 text-text-muted" />
                <input
                  type="url"
                  placeholder="https://youtube.com/shorts/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-honey-300 focus:border-honey-300 outline-none transition bg-stone-50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-honey-400 hover:bg-honey-500 text-white px-6 py-3 rounded-xl font-medium shadow-honey transition-colors disabled:opacity-70 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Extract
              </button>
            </form>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        </section>

        {/* Recent Jobs */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-medium text-text-primary px-2">Recent Extractions</h2>

          <div className="grid gap-4">
            {jobs.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                No extractions yet. Try adding a video above!
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.jobId} className="bg-white rounded-xl shadow-soft border border-stone-200 p-4 flex items-center gap-4 transition hover:shadow-warm">
                  {/* Icon / Status */}
                  <div className={clsx(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                    job.status === 'completed' && "bg-sage-100 text-sage-300",
                    job.status === 'failed' && "bg-red-100 text-red-500",
                    (job.status === 'processing' || job.status === 'extracting' || job.status === 'downloading') && "bg-honey-100 text-honey-400"
                  )}>
                    {job.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                      job.status === 'failed' ? <AlertCircle className="w-6 h-6" /> :
                        <Loader2 className="w-6 h-6 animate-spin" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-text-primary truncate">
                        {job.recipe?.title || job.message || "Processing..."}
                      </h3>
                      <span className={clsx(
                        "text-xs px-2 py-0.5 rounded-full capitalize",
                        job.status === 'completed' ? "bg-sage-100 text-sage-300" : "bg-stone-100 text-text-muted"
                      )}>
                        {job.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(job.createdAt).toLocaleTimeString()}
                      </span>
                      <span className="truncate max-w-[200px] hover:underline cursor-pointer" title={job.videoUrl}>
                        {job.videoUrl}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {job.status !== 'completed' && job.status !== 'failed' && (
                      <div className="mt-2 w-full max-w-xs h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-honey-400 transition-all duration-500 ease-out"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {job.status === 'completed' && job.recipe && (
                    <button
                      onClick={() => router.push(`/recipes/${job.recipe?.id}`)}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-text-secondary rounded-lg text-sm font-medium transition"
                    >
                      View Recipe
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
