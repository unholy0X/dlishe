"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";

/* ─── Scroll reveal observer ────────────────────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function LandingPage() {
  useScrollReveal();
  const [comingSoon, setComingSoon] = useState(false);

  const showComingSoon = useCallback(() => {
    setComingSoon(true);
    setTimeout(() => setComingSoon(false), 3000);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden">
      {/* ════════ Navigation ════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-mark.png" alt="Dlishe" width={36} height={36} className="w-9 h-9" />
            <span className="text-2xl sm:text-3xl font-display font-extrabold text-green-primary tracking-tight">
              Dlishe
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-text-muted hover:text-green-primary transition-colors hidden sm:block">
              Features
            </a>
            <a href="#how" className="text-sm font-medium text-text-muted hover:text-green-primary transition-colors hidden sm:block">
              How it works
            </a>
            <Link href="/privacy" className="text-sm font-medium text-text-muted hover:text-green-primary transition-colors hidden sm:block">
              Privacy
            </Link>
            <button onClick={showComingSoon} className="bg-green-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:shadow-glow-green transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer">
              Get the app
            </button>
          </div>
        </div>
      </nav>

      {/* ════════ Hero ════════ */}
      <section className="hero-gradient min-h-screen pt-28 pb-20 px-6 relative">
        {/* Decorative shapes */}
        <div className="absolute top-36 left-[8%] w-24 h-24 bg-green-light/50 rounded-3xl float opacity-50 hidden lg:block" />
        <div className="absolute top-52 right-[12%] w-16 h-16 bg-lavender-bg/40 rounded-2xl float-delayed opacity-50 hidden lg:block" />
        <div className="absolute bottom-36 left-[6%] w-14 h-14 bg-honey-bg/50 rounded-xl float-slow opacity-50 hidden lg:block" />
        <div className="absolute top-[62%] right-[6%] w-12 h-12 bg-coral-bg/50 rounded-full float opacity-40 hidden lg:block" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-[82vh]">
            {/* Left content */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <div className="inline-flex items-center gap-2.5 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-8 shadow-soft border border-white/60">
                <span className="w-2 h-2 bg-green-bright rounded-full animate-pulse" />
                <span className="text-sm text-text-muted font-medium">Soon available on iOS & Android</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-display font-semibold text-text-dark leading-[1.08] mb-7 tracking-tight">
                Your recipes,<br />
                <span className="gradient-text">all in one place</span>
              </h1>

              <p className="text-lg sm:text-xl text-text-muted leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
                Save recipes from <span className="text-text-dark font-semibold">TikTok</span>, <span className="text-text-dark font-semibold">YouTube</span>, any website, or snap a cookbook page.
                Dlishe turns any recipe into your personal cookbook, instantly.
              </p>

              {/* Store buttons */}
              <div id="download" className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                <button onClick={showComingSoon} className="group inline-flex items-center gap-3 bg-text-dark text-white px-6 py-4 rounded-2xl hover:bg-black transition-all hover:shadow-float active:scale-[0.97] cursor-pointer">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[11px] opacity-60 leading-tight">Download on the</div>
                    <div className="text-lg font-semibold leading-tight">App Store</div>
                  </div>
                </button>
                <button onClick={showComingSoon} className="group inline-flex items-center gap-3 bg-text-dark text-white px-6 py-4 rounded-2xl hover:bg-black transition-all hover:shadow-float active:scale-[0.97] cursor-pointer">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[11px] opacity-60 leading-tight">Get it on</div>
                    <div className="text-lg font-semibold leading-tight">Google Play</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Right: Phone mockup */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
              <div className="relative">
                {/* Main phone */}
                <div className="phone-frame w-[280px] sm:w-[310px] float-slow">
                  <div className="phone-screen aspect-[9/19.5] relative">
                    <div className="phone-notch" />
                    {/* App UI recreation */}
                    <div className="p-4 pt-12">
                      {/* Welcome card */}
                      <div className="bg-white rounded-2xl p-3.5 mb-3.5 shadow-soft">
                        <div className="flex items-center gap-3">
                          <Image src="/logo-mark.png" alt="" width={40} height={40} className="w-10 h-10 rounded-full" />
                          <div>
                            <div className="text-sm font-semibold text-text-dark">Welcome back</div>
                            <div className="text-[11px] text-text-muted">Your kitchen awaits</div>
                          </div>
                        </div>
                      </div>

                      {/* Category pills */}
                      <div className="flex gap-1.5 mb-3.5">
                        {[
                          { name: "Breakfast", bg: "bg-honey-bg" },
                          { name: "Lunch", bg: "bg-lavender-bg" },
                          { name: "Dinner", bg: "bg-coral-bg" },
                        ].map((cat) => (
                          <div key={cat.name} className="bg-white rounded-2xl px-2.5 py-2 flex flex-col items-center shadow-soft flex-1">
                            <div className={`w-7 h-7 ${cat.bg} rounded-lg mb-1`} />
                            <span className="text-[8px] text-text-dark font-medium">{cat.name}</span>
                          </div>
                        ))}
                        <div className="bg-green-bright rounded-2xl px-2.5 py-2 flex flex-col items-center flex-1">
                          <div className="w-7 h-7 bg-green-primary/20 rounded-lg mb-1" />
                          <span className="text-[8px] text-green-primary font-semibold">More</span>
                        </div>
                      </div>

                      {/* Stats cards */}
                      <div className="flex gap-1.5 mb-3.5">
                        <div className="stat-card bg-coral-bg flex-1">
                          <div className="stat-accent bg-coral" />
                          <div className="text-[8px] text-coral-text font-medium flex items-center gap-1">
                            <svg className="w-2 h-2" fill="#E84057" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                            Favorites
                          </div>
                          <div className="text-xl font-semibold text-coral-text mt-1.5">12</div>
                        </div>
                        <div className="stat-card bg-lavender-bg flex-1">
                          <div className="stat-accent bg-lavender" />
                          <div className="text-[8px] text-lavender-text font-medium flex items-center gap-1">
                            <svg className="w-2 h-2" fill="#4A2D73" viewBox="0 0 24 24"><path d="M12 23c-4.97 0-8-3.03-8-7.5 0-3.82 2.77-7.3 5.06-9.74A.75.75 0 0 1 10.35 6c-.02 2.1.82 3.93 2.15 5.15.28-.72.5-1.56.5-2.4 0-.42-.04-.83-.13-1.23a.75.75 0 0 1 1.15-.76C16.21 8.47 20 12.07 20 15.5c0 4.47-3.03 7.5-8 7.5Z" /></svg>
                            High Protein
                          </div>
                          <div className="text-[10px] font-semibold text-lavender-text mt-2.5">Explore</div>
                        </div>
                        <div className="stat-card bg-honey-bg flex-1">
                          <div className="stat-accent bg-honey" />
                          <div className="text-[8px] text-honey-text font-medium flex items-center gap-1">
                            <svg className="w-2 h-2" fill="none" stroke="#7A4A21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M10 2h4" /><path d="M12 14V10" /><path d="M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" /></svg>
                            Quick Meals
                          </div>
                          <div className="text-[10px] font-semibold text-honey-text mt-2.5">Explore</div>
                        </div>
                      </div>

                      {/* Suggested recipes */}
                      <div className="text-[11px] font-display font-semibold text-text-dark mb-2">Suggested For You</div>
                      <div className="flex gap-2">
                        <div className="w-1/2 aspect-[4/5] rounded-2xl relative overflow-hidden">
                          <Image src="/food-pasta.jpg" alt="Spicy Vodka Rigatoni" fill className="object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2.5 right-2">
                            <div className="text-[9px] font-semibold text-white leading-tight">Spicy Vodka Rigatoni</div>
                          </div>
                        </div>
                        <div className="w-1/2 aspect-[4/5] rounded-2xl relative overflow-hidden">
                          <Image src="/food-grilled.jpg" alt="Honey Glazed Chicken" fill className="object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-2 left-2.5 right-2">
                            <div className="text-[9px] font-semibold text-white leading-tight">Honey Glazed Chicken</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating nav bar */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="relative">
                        <div className="bg-white/70 backdrop-blur-md rounded-full border border-white/80 shadow-soft px-2 py-1.5 flex items-center justify-between">
                          {/* Left group */}
                          <div className="flex items-center">
                            <div className="flex flex-col items-center px-2.5 py-0.5 bg-white/90 rounded-full">
                              <svg className="w-3 h-3 text-text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                              <span className="text-[5px] font-semibold text-text-dark mt-0.5">Home</span>
                            </div>
                            <div className="flex flex-col items-center px-2.5 py-0.5">
                              <svg className="w-3 h-3 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                              <span className="text-[5px] text-text-muted/40 mt-0.5">Recipes</span>
                            </div>
                          </div>

                          {/* Center plus button */}
                          <div className="absolute left-1/2 -translate-x-1/2 -top-2.5 w-8 h-8 rounded-full bg-gradient-to-b from-[#9EFF00] via-[#06B27A] to-[#039274] flex items-center justify-center shadow-md border border-white/30">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          </div>

                          {/* Right group */}
                          <div className="flex items-center">
                            <div className="flex flex-col items-center px-2.5 py-0.5">
                              <svg className="w-3 h-3 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                              <span className="text-[5px] text-text-muted/40 mt-0.5">Pantry</span>
                            </div>
                            <div className="flex flex-col items-center px-2.5 py-0.5">
                              <svg className="w-3 h-3 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                              <span className="text-[5px] text-text-muted/40 mt-0.5">Shopping</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating: recipe card */}
                <div className="absolute -left-20 top-[30%] bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-card border border-white/60 float hidden lg:block">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl relative overflow-hidden">
                      <Image src="/food-pancakes.jpg" alt="PB&J Pancakes" fill className="object-cover" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-dark">PB&amp;J Pancakes</div>
                      <div className="text-[10px] text-text-muted">20 min &middot; Easy</div>
                    </div>
                  </div>
                </div>

                {/* Floating: saved badge */}
                <div className="absolute -right-14 bottom-[28%] bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-card border border-white/60 float-delayed hidden lg:block">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-green-light rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-text-dark">Recipe saved!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ════════ Features ════════ */}
      <section id="features" className="bg-white py-24 sm:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 reveal">
            <div className="inline-flex items-center gap-2 bg-green-light/60 px-4 py-1.5 rounded-full mb-5">
              <span className="text-xs font-semibold text-green-primary tracking-wide uppercase">Features</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-display font-semibold text-text-dark mb-5 tracking-tight">
              Everything your kitchen needs
            </h2>
            <p className="text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
              From a viral TikTok to tonight&apos;s dinner on the table —
              Dlishe keeps your culinary life beautifully organized.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Capture */}
            <div className="feature-card bg-coral-bg group reveal reveal-delay-1">
              <div className="stat-accent bg-coral" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-soft group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-heart" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-display font-semibold text-coral-text mb-3">
                  Save any recipe
                </h3>
                <p className="text-coral-text/75 leading-relaxed">
                  See a dish you love on TikTok, YouTube, or a food blog? Share the link
                  and Dlishe saves the full recipe — ingredients, steps, and timing — in seconds.
                </p>
              </div>
            </div>

            {/* Pantry */}
            <div className="feature-card bg-lavender-bg group reveal reveal-delay-2">
              <div className="stat-accent bg-lavender" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-soft group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-lavender-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-display font-semibold text-lavender-text mb-3">
                  Know your pantry
                </h3>
                <p className="text-lavender-text/75 leading-relaxed">
                  Track what&apos;s in your kitchen. Scan items or add them manually.
                  Get recipe suggestions based on what you already have.
                </p>
              </div>
            </div>

            {/* Shopping */}
            <div className="feature-card bg-honey-bg group reveal reveal-delay-3">
              <div className="stat-accent bg-honey" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-soft group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-honey-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-display font-semibold text-honey-text mb-3">
                  Smart shopping lists
                </h3>
                <p className="text-honey-text/75 leading-relaxed">
                  Turn any recipe into a shopping list with one tap.
                  Items are grouped by category so your grocery run is effortless.
                </p>
              </div>
            </div>

            {/* Favorites */}
            <div className="feature-card bg-green-light group reveal reveal-delay-4">
              <div className="stat-accent bg-green-bright" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-soft group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-green-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-display font-semibold text-green-primary mb-3">
                  Your favorites, always ready
                </h3>
                <p className="text-green-primary/75 leading-relaxed">
                  Save your go-to recipes for quick access.
                  Get personalized suggestions based on what you love to cook.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ How It Works ════════ */}
      <section id="how" className="bg-bg-primary py-24 sm:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20 reveal">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full mb-5 shadow-soft">
              <span className="text-xs font-semibold text-green-primary tracking-wide uppercase">How it works</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-display font-semibold text-text-dark mb-5 tracking-tight">
              From inspiration to table
            </h2>
            <p className="text-lg text-text-muted">
              Three simple steps to transform how you cook.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 md:gap-6 relative">
            {/* Dashed connector line */}
            <div className="step-connector hidden md:block" />

            {/* Step 1 */}
            <div className="text-center reveal reveal-delay-1">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-primary text-white rounded-full flex items-center justify-center shadow-glow-green relative z-10">
                <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-display font-semibold text-text-dark mb-3">
                Snap, share, or paste
              </h3>
              <p className="text-text-muted leading-relaxed max-w-[260px] mx-auto">
                Share a TikTok, paste a YouTube link, snap a cookbook page — any recipe, any source.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center reveal reveal-delay-2">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-primary text-white rounded-full flex items-center justify-center shadow-glow-green relative z-10">
                <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-display font-semibold text-text-dark mb-3">
                Review & save
              </h3>
              <p className="text-text-muted leading-relaxed max-w-[260px] mx-auto">
                Ingredients, steps, and cook times appear like magic. Review and add to your collection.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center reveal reveal-delay-3">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-primary text-white rounded-full flex items-center justify-center shadow-glow-green relative z-10">
                <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h3 className="text-xl font-display font-semibold text-text-dark mb-3">
                Cook with joy
              </h3>
              <p className="text-text-muted leading-relaxed max-w-[260px] mx-auto">
                Follow each step, check off ingredients, and enjoy your creation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ CTA ════════ */}
      <section className="relative overflow-hidden py-24 sm:py-32 px-6">
        <div className="absolute inset-0 cta-gradient" />

        {/* Decorative shapes */}
        <div className="absolute top-12 right-[10%] w-32 h-32 bg-green-bright/10 rounded-full blur-2xl" />
        <div className="absolute bottom-12 left-[8%] w-40 h-40 bg-coral/10 rounded-full blur-2xl" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-display font-semibold text-white mb-6 tracking-tight reveal">
            Never lose a recipe again
          </h2>
          <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto reveal reveal-delay-1">
            Join home cooks who spend less time scrolling and more time savoring what they love.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 reveal reveal-delay-2">
            <button
              onClick={showComingSoon}
              className="inline-flex items-center gap-2.5 bg-white text-green-primary px-8 py-4 rounded-full font-semibold hover:shadow-float transition-all hover:scale-105 active:scale-[0.98] cursor-pointer"
            >
              Get early access
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-white/70 px-6 py-4 rounded-full font-medium hover:text-white transition-colors"
            >
              Learn more
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ════════ Footer ════════ */}
      <footer className="bg-text-dark py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            {/* Brand */}
            <div className="text-center md:text-left">
              <Image src="/logo-full.png" alt="Dlishe" width={140} height={45} className="h-10 w-auto mb-2 mx-auto md:mx-0 brightness-100" />
              <p className="text-white/40 text-sm">Your kitchen, simplified.</p>
            </div>

            {/* Social */}
            <div className="flex items-center gap-3">
              <a href="https://x.com/DlisheApp" target="_blank" rel="noopener noreferrer" className="w-11 h-11 bg-white/8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors" aria-label="X">
                <svg className="w-4.5 h-4.5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/dlisheapp/" target="_blank" rel="noopener noreferrer" className="w-11 h-11 bg-white/8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors" aria-label="Instagram">
                <svg className="w-4.5 h-4.5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a href="https://www.tiktok.com/@dlisheapp" target="_blank" rel="noopener noreferrer" className="w-11 h-11 bg-white/8 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors" aria-label="TikTok">
                <svg className="w-4.5 h-4.5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                </svg>
              </a>
            </div>

            {/* Legal links */}
            <div className="flex items-center gap-8 text-sm">
              <Link href="/privacy" className="text-white/50 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-white/50 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/8 text-center">
            <p className="text-white/25 text-sm">
              &copy; {new Date().getFullYear()} Dlishe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      {/* ════════ Coming Soon Toast ════════ */}
      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${
          comingSoon
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-elevated border border-white/60 flex items-center gap-4 max-w-sm">
          <div className="w-10 h-10 bg-green-light rounded-xl flex items-center justify-center flex-shrink-0">
            <Image src="/logo-mark.png" alt="" width={28} height={28} className="w-7 h-7" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-dark">Something delicious is cooking</div>
            <div className="text-xs text-text-muted mt-0.5">Dlishe is launching soon — stay hungry!</div>
          </div>
        </div>
      </div>
    </main>
  );
}
