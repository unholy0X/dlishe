import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-display font-bold text-green-primary">
            DLISHE
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="#download"
              className="text-sm font-medium text-text-muted hover:text-green-primary transition-colors"
            >
              Download
            </a>
            <Link
              href="/privacy"
              className="text-sm font-medium text-text-muted hover:text-green-primary transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="gradient-hero pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-display font-semibold text-text-dark leading-tight mb-6">
              Your Kitchen,<br />Simplified
            </h1>
            <p className="text-lg md:text-xl text-text-muted leading-relaxed mb-10 max-w-xl mx-auto">
              Capture recipes from cookbooks, websites, or videos.
              Organize your pantry. Plan your meals.
              Cook with confidence.
            </p>

            {/* Store Badges */}
            <div id="download" className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <a
                href="#"
                className="inline-flex items-center gap-3 bg-black text-white px-6 py-3 rounded-xl hover:bg-black/90 transition-colors"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] opacity-80">Download on the</div>
                  <div className="text-lg font-semibold -mt-1">App Store</div>
                </div>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-3 bg-black text-white px-6 py-3 rounded-xl hover:bg-black/90 transition-colors"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] opacity-80">Get it on</div>
                  <div className="text-lg font-semibold -mt-1">Google Play</div>
                </div>
              </a>
            </div>

            {/* App Preview */}
            <div className="relative mx-auto" style={{ maxWidth: "320px" }}>
              <div className="bg-black rounded-[3rem] p-3 shadow-2xl">
                <div className="bg-bg-primary rounded-[2.5rem] overflow-hidden aspect-[9/19.5] flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 mx-auto mb-4 bg-green-light rounded-2xl flex items-center justify-center">
                      <span className="text-3xl font-display font-bold text-green-primary">D</span>
                    </div>
                    <p className="text-text-muted text-sm">App preview coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="gradient-features py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-text-dark mb-4">
              Everything you need in your kitchen
            </h2>
            <p className="text-text-muted max-w-xl mx-auto">
              From capturing recipes to planning meals, DLISHE keeps your culinary life organized.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="card p-8 hover:shadow-card transition-shadow">
              <div className="w-14 h-14 bg-green-light rounded-2xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-green-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-display font-semibold text-text-dark mb-2">
                Capture any recipe
              </h3>
              <p className="text-text-muted leading-relaxed">
                Snap a photo of a cookbook page, paste a link from any website,
                or share from social media. Your recipe is saved in seconds.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card p-8 hover:shadow-card transition-shadow">
              <div className="w-14 h-14 bg-lavender rounded-2xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-[#6B5B95]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-display font-semibold text-text-dark mb-2">
                Know your pantry
              </h3>
              <p className="text-text-muted leading-relaxed">
                Keep track of what you have at home. Scan items or add them manually.
                Never wonder whats in your fridge again.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card p-8 hover:shadow-card transition-shadow">
              <div className="w-14 h-14 bg-honey rounded-2xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-[#C19A6B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-display font-semibold text-text-dark mb-2">
                Smart shopping lists
              </h3>
              <p className="text-text-muted leading-relaxed">
                Turn any recipe into a shopping list with one tap.
                Items are grouped by category so your grocery run is a breeze.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card p-8 hover:shadow-card transition-shadow">
              <div className="w-14 h-14 bg-peach rounded-2xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-heart" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <h3 className="text-xl font-display font-semibold text-text-dark mb-2">
                Favorites at your fingertips
              </h3>
              <p className="text-text-muted leading-relaxed">
                Save your go-to recipes for quick access.
                Get personalized suggestions based on what you love to cook.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-bg-primary py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-text-dark mb-4">
              From inspiration to table
            </h2>
            <p className="text-text-muted">
              Three simple steps to transform how you cook.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 bg-green-primary text-white rounded-full flex items-center justify-center text-2xl font-display font-semibold">
                1
              </div>
              <h3 className="text-lg font-display font-semibold text-text-dark mb-2">
                Snap or paste
              </h3>
              <p className="text-text-muted text-sm">
                Take a photo of a recipe or paste a link. We handle the rest.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 bg-green-primary text-white rounded-full flex items-center justify-center text-2xl font-display font-semibold">
                2
              </div>
              <h3 className="text-lg font-display font-semibold text-text-dark mb-2">
                Review and save
              </h3>
              <p className="text-text-muted text-sm">
                Your recipe appears with ingredients and steps, ready to store.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 bg-green-primary text-white rounded-full flex items-center justify-center text-2xl font-display font-semibold">
                3
              </div>
              <h3 className="text-lg font-display font-semibold text-text-dark mb-2">
                Cook with joy
              </h3>
              <p className="text-text-muted text-sm">
                Follow along, check off ingredients, and enjoy your creation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-green-primary py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white mb-4">
            Ready to simplify your kitchen?
          </h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Join home cooks who are spending less time searching and more time cooking.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#download"
              className="inline-flex items-center gap-3 bg-white text-green-primary px-6 py-3 rounded-xl hover:bg-white/90 transition-colors font-medium"
            >
              Download for free
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-text-dark py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Logo & Social */}
            <div className="text-center md:text-left">
              <div className="text-2xl font-display font-bold text-white mb-4">
                DLISHE
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4">
                <a
                  href="https://x.com/DlisheApp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="Follow us on X"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/dlisheapp/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="Follow us on Instagram"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@dlisheapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="Follow us on TikTok"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-8 text-sm">
              <Link
                href="/privacy"
                className="text-white/60 hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-white/60 hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-center">
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} DLISHE. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
