"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";

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

  return (
    <main className="min-h-screen overflow-hidden">
      {/* ════════ Navigation ════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-mark.png" alt="Dlishe" width={36} height={36} className="w-9 h-9" />
            <span className="text-xl font-display font-bold text-green-primary tracking-tight">
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
            <a href="#download" className="bg-green-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:shadow-glow-green transition-all hover:scale-[1.03] active:scale-[0.98]">
              Get the app
            </a>
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
                Snap a photo of any cookbook page. Paste a link from any website.
                Dlishe extracts, organizes, and keeps every recipe at your fingertips.
              </p>

              {/* Store buttons */}
              <div id="download" className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                <a href="#" className="group inline-flex items-center gap-3 bg-text-dark text-white px-6 py-4 rounded-2xl hover:bg-black transition-all hover:shadow-float active:scale-[0.97]">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[11px] opacity-60 leading-tight">Download on the</div>
                    <div className="text-lg font-semibold leading-tight">App Store</div>
                  </div>
                </a>
                <a href="#" className="group inline-flex items-center gap-3 bg-text-dark text-white px-6 py-4 rounded-2xl hover:bg-black transition-all hover:shadow-float active:scale-[0.97]">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[11px] opacity-60 leading-tight">Get it on</div>
                    <div className="text-lg font-semibold leading-tight">Google Play</div>
                  </div>
                </a>
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
                          <div className="text-[8px] text-lavender-text font-medium">Lunch</div>
                          <div className="text-xl font-semibold text-lavender-text mt-1.5">8</div>
                        </div>
                        <div className="stat-card bg-honey-bg flex-1">
                          <div className="stat-accent bg-honey" />
                          <div className="text-[8px] text-honey-text font-medium">Dinner</div>
                          <div className="text-xl font-semibold text-honey-text mt-1.5">5</div>
                        </div>
                      </div>

                      {/* Suggested recipes */}
                      <div className="text-[11px] font-display font-semibold text-text-dark mb-2">Suggested For You</div>
                      <div className="flex gap-2">
                        <div className="w-1/2 aspect-[4/5] bg-gradient-to-br from-[#E8845C] to-[#F2A65A] rounded-2xl relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <div className="absolute bottom-2 left-2.5 right-2">
                            <div className="text-[9px] font-semibold text-white leading-tight">Pasta Carbonara</div>
                          </div>
                        </div>
                        <div className="w-1/2 aspect-[4/5] bg-gradient-to-br from-[#7A8A5A] to-[#A3B580] rounded-2xl relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <div className="absolute bottom-2 left-2.5 right-2">
                            <div className="text-[9px] font-semibold text-white leading-tight">Garden Salad</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating: recipe card */}
                <div className="absolute -left-20 top-[30%] bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-card border border-white/60 float hidden lg:block">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#D4775D] to-[#E8A87C] rounded-xl" />
                    <div>
                      <div className="text-xs font-semibold text-text-dark">Tikka Masala</div>
                      <div className="text-[10px] text-text-muted">35 min &middot; Medium</div>
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
              From snapping a cookbook page to putting dinner on the table,
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
                  Capture any recipe
                </h3>
                <p className="text-coral-text/75 leading-relaxed">
                  Snap a photo of a cookbook page, paste a URL, or share from social media.
                  Dlishe extracts ingredients, steps, and timing in seconds.
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
                Snap or paste
              </h3>
              <p className="text-text-muted leading-relaxed max-w-[260px] mx-auto">
                Take a photo of a cookbook page, paste a URL, or share from any app.
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
                Dlishe extracts ingredients, steps, and nutrition. Review and save to your collection.
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

      {/* ════════ Cookbook Feature Highlight ════════ */}
      <section className="bg-white py-24 sm:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="reveal">
              <div className="inline-flex items-center gap-2 bg-coral-bg px-4 py-1.5 rounded-full mb-5">
                <span className="text-xs font-semibold text-coral-text tracking-wide uppercase">New</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-display font-semibold text-text-dark mb-5 tracking-tight">
                Scan your cookbooks
              </h2>
              <p className="text-lg text-text-muted leading-relaxed mb-8">
                Point your camera at any cookbook page and Dlishe extracts
                the full recipe: title, ingredients, steps, and cooking times, all in seconds.
                Your favorite books, digitized and searchable.
              </p>
              <div className="flex flex-col gap-4">
                {[
                  { text: "Smart text extraction", icon: "sparkle" },
                  { text: "Works with any cookbook or magazine", icon: "book" },
                  { text: "Automatic ingredient parsing", icon: "list" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-light rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-green-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-text-dark font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="reveal reveal-delay-2 flex justify-center">
              <div className="relative">
                <div className="w-[260px] h-[360px] bg-gradient-to-br from-[#E8845C] to-[#F2A65A] rounded-3xl shadow-elevated flex items-center justify-center">
                  <svg width="80" height="80" viewBox="0 0 64 64" fill="none" opacity="0.2">
                    <path d="M22 8v18c0 3.3 2.7 6 6 6h0v24a2 2 0 004 0V32h0c3.3 0 6-2.7 6-6V8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M28 8v14M32 8v14M36 8v14" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                    <path d="M40 14c4-4 10-5 14-3-1 5-5 9-10 10-2 .5-4-.5-4-.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="#fff" fillOpacity="0.3"/>
                  </svg>
                </div>
                {/* Extracted recipe card overlay */}
                <div className="absolute -bottom-6 -left-6 right-6 bg-white rounded-2xl p-5 shadow-elevated">
                  <div className="text-xs text-green-primary font-semibold mb-1.5 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Recipe extracted
                  </div>
                  <div className="text-base font-semibold text-text-dark mb-1">Chicken Tikka Masala</div>
                  <div className="text-xs text-text-muted">12 ingredients &middot; 8 steps &middot; 45 min</div>
                </div>
              </div>
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
            Ready to simplify your kitchen?
          </h2>
          <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto reveal reveal-delay-1">
            Join home cooks who spend less time searching and more time cooking what they love.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 reveal reveal-delay-2">
            <a
              href="#download"
              className="inline-flex items-center gap-2.5 bg-white text-green-primary px-8 py-4 rounded-full font-semibold hover:shadow-float transition-all hover:scale-105 active:scale-[0.98]"
            >
              Download for free
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
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
    </main>
  );
}
