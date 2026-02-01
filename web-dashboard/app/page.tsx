"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { NavHeader } from '@/lib/components/NavHeader';
import {
  Plus,
  Video,
  Loader2,
  ChefHat,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RefreshCw,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload
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
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [extractionMode, setExtractionMode] = useState<'video' | 'url' | 'image'>('video');
  const [videoUrl, setVideoUrl] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState('');
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
    setError('');
    setExtractionProgress('');

    try {
      if (extractionMode === 'video') {
        if (!videoUrl) return;
        setIsSubmitting(true);
        await api.post('/video/extract', {
          videoUrl,
          language: 'en',
          detailLevel: 'detailed'
        });
        setVideoUrl('');
      } else if (extractionMode === 'url') {
        if (!webUrl) return;
        setIsSubmitting(true);
        setExtractionProgress('Fetching webpage...');

        const res = await api.post('/recipes/extract-url', { url: webUrl, saveAuto: true });

        setExtractionProgress('Gemini extracting recipe...');
        await new Promise(r => setTimeout(r, 500)); // Brief pause for UX

        const recipeId = res.data?.savedId || res.data?.id;
        if (recipeId) {
          setExtractionProgress('Complete!');
          await new Promise(r => setTimeout(r, 300));
          await fetchJobs(); // Refresh jobs list
          router.push(`/recipes/${recipeId}`);
        } else {
          console.warn('No recipe ID in response:', res.data);
          setError('Recipe extracted but not saved');
        }
        setWebUrl('');

      } else if (extractionMode === 'image') {
        if (!imageFile) return;
        setIsSubmitting(true);
        setExtractionProgress('Uploading image...');

        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('saveAuto', 'true');

        setExtractionProgress('Gemini analyzing image...');
        const res = await api.post('/recipes/extract-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setExtractionProgress('Refining recipe...');
        await new Promise(r => setTimeout(r, 500)); // Brief pause for UX

        const recipeId = res.data?.savedId;

        if (recipeId) {
          setExtractionProgress('Complete!');
          await new Promise(r => setTimeout(r, 300));
          router.push(`/recipes/${recipeId}`);
        } else {
          console.warn('No recipe ID found:', res.data);
          setError('Recipe extracted but not saved');
        }

        setImageFile(null);
        setImagePreview(null);
      }

      fetchJobs(); // Refresh jobs anyway
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Extraction failed');
      setExtractionProgress('');
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
      <NavHeader />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">

        {/* Hero / Extraction Input */}
        <section className="bg-white rounded-2xl shadow-warm border border-stone-200 p-8 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl font-display font-medium text-text-primary">Add New Recipe</h1>

              <div className="flex justify-center gap-2 p-1 bg-stone-100 rounded-full w-fit mx-auto">
                <button
                  onClick={() => setExtractionMode('video')}
                  className={clsx("px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2", extractionMode === 'video' ? "bg-white text-honey-600 shadow-sm" : "text-text-muted hover:text-text-primary")}
                >
                  <Video className="w-4 h-4" /> Video
                </button>
                <button
                  onClick={() => setExtractionMode('url')}
                  className={clsx("px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2", extractionMode === 'url' ? "bg-white text-honey-600 shadow-sm" : "text-text-muted hover:text-text-primary")}
                >
                  <LinkIcon className="w-4 h-4" /> Webpage
                </button>
                <button
                  onClick={() => setExtractionMode('image')}
                  className={clsx("px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2", extractionMode === 'image' ? "bg-white text-honey-600 shadow-sm" : "text-text-muted hover:text-text-primary")}
                >
                  <ImageIcon className="w-4 h-4" /> Image
                </button>
              </div>

              <p className="text-text-muted text-sm">
                {extractionMode === 'video' && "Paste a YouTube or TikTok URL to generate a recipe."}
                {extractionMode === 'url' && "Paste a recipe URL from any cooking website."}
                {extractionMode === 'image' && "Upload a photo of a cookbook page or recipe card."}
              </p>
            </div>

            <form onSubmit={handleExtract} className="space-y-4">
              {extractionMode !== 'image' && (
                <div className="relative">
                  {extractionMode === 'video' ? (
                    <Video className="absolute left-3 top-3 w-5 h-5 text-text-muted" />
                  ) : (
                    <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-text-muted" />
                  )}
                  <input
                    type="url"
                    placeholder={extractionMode === 'video' ? "https://youtube.com/shorts/..." : "https://cooking.nytimes.com/..."}
                    value={extractionMode === 'video' ? videoUrl : webUrl}
                    onChange={(e) => extractionMode === 'video' ? setVideoUrl(e.target.value) : setWebUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-honey-300 focus:border-honey-300 outline-none transition bg-stone-50"
                    required
                  />
                </div>
              )}

              {extractionMode === 'image' && (
                <div className="relative">
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setImageFile(e.target.files[0]);
                        setImagePreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                  />

                  {!imagePreview ? (
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-stone-300 rounded-xl hover:border-honey-300 hover:bg-honey-50/50 transition cursor-pointer"
                    >
                      <Upload className="w-12 h-12 text-stone-400" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-stone-700">Click to upload recipe image</p>
                        <p className="text-xs text-stone-500 mt-1">PNG, JPG, WebP up to 10MB</p>
                      </div>
                    </label>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-900 aspect-video group">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-contain text-white" />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setImageFile(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition backdrop-blur-sm"
                      >
                        <Plus className="w-4 h-4 rotate-45" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting ||
                  (extractionMode === 'video' && !videoUrl) ||
                  (extractionMode === 'url' && !webUrl) ||
                  (extractionMode === 'image' && !imageFile)}
                className="w-full bg-honey-500 text-white px-6 py-3 rounded-lg hover:bg-honey-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {extractionProgress || 'Processing...'}
                  </>
                ) : (
                  <>
                    <ChefHat className="w-5 h-5" />
                    Extract Recipe
                  </>
                )}
              </button>
            </form>
            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
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
