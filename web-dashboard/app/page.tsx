"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { useSync } from '@/lib/sync';
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
  const { sync, isSyncing } = useSync();
  const router = useRouter();
  const [extractionMode, setExtractionMode] = useState<'video' | 'url' | 'image'>('video');
  const [videoUrl, setVideoUrl] = useState('');
  const [webUrl, setWebUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
    setError('');

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
        // Using /video/extract as it handles general async extraction now or /recipes/extract-url if sync? 
        // Backend router has: r.Post("/extract-url", extractionHandler.ExtractFromURL) 
        // and r.Post("/extract-image", ...).
        // Let's assume these are synchronous or return a job? 
        // Wait, the backend router says: extract-url and extract-image are under /recipes/. 
        // Video extract is under /video/extract.
        // If they are synchronous, they return a recipe directly. If async, they return a job?
        // extractionHandler usually returns recipe. 
        // Users wants "plug it to new endpoint". 
        // If it returns a recipe, we should redirect to it?

        const res = await api.post('/recipes/extract-url', { url: webUrl });
        const recipeId = res.data?.id || res.data?.recipe?.id;
        if (recipeId) router.push(`/recipes/${recipeId}`);
        else fetchJobs(); // Fallback if it created a job implicitly or something
        setWebUrl('');

      } else if (extractionMode === 'image') {
        if (!imageFile) return;
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('image', imageFile);
        const res = await api.post('/recipes/extract-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const recipeId = res.data?.id || res.data?.recipe?.id;
        if (recipeId) router.push(`/recipes/${recipeId}`);
        else fetchJobs();
        setImageFile(null);
        setImagePreview(null);
      }

      fetchJobs(); // Refresh jobs anyway
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
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-honey-500" />
              <span className="font-display font-bold text-xl text-text-primary">DishFlow</span>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/recipes" className="text-text-secondary hover:text-emerald-600 transition-colors">Recipes</Link>
              <Link href="/pantry" className="text-text-secondary hover:text-emerald-600 transition-colors">Pantry</Link>
              <Link href="/shopping" className="text-text-secondary hover:text-emerald-600 transition-colors">Shopping</Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => sync()}
              disabled={isSyncing}
              className={clsx(
                "p-2 rounded-full text-text-muted hover:bg-stone-100 transition-colors",
                isSyncing && "animate-spin text-emerald-500"
              )}
              title="Sync Data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <span className="w-px h-6 bg-stone-200 mx-1"></span>

            <span className="text-sm text-text-secondary">Hello, {user?.name}</span>
            <button
              onClick={logout}
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
                    required={extractionMode !== 'image'}
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
                      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-text-muted">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <span className="text-honey-600 font-medium">Click to upload</span>
                        <span className="text-text-muted"> or drag and drop</span>
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
                disabled={isSubmitting || (extractionMode === 'image' && !imageFile)}
                className="w-full bg-honey-400 hover:bg-honey-500 text-white px-6 py-3 rounded-xl font-medium shadow-honey transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                {isSubmitting ? 'Processing...' : 'Extract Recipe'}
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
