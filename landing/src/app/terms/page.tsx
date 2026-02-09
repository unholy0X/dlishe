import Link from "next/link";
import Image from "next/image";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-white border-b border-black/[0.04]">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-mark.png" alt="Dlishe" width={32} height={32} className="w-8 h-8" />
            <span className="text-lg font-display font-bold text-green-primary tracking-tight">
              Dlishe
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-text-muted hover:text-green-primary transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-green-light/60 px-4 py-1.5 rounded-full mb-5">
            <span className="text-xs font-semibold text-green-primary tracking-wide uppercase">Legal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-semibold text-text-dark tracking-tight mb-3">
            Terms of Service
          </h1>
          <p className="text-text-muted">Effective date: February 9, 2026</p>
        </div>

        <div className="space-y-12">
          {/* Acceptance of Terms */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Acceptance of Terms
            </h2>
            <p className="text-text-muted leading-relaxed">
              By downloading, installing, or using the Dlishe mobile application (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). These Terms constitute a legally binding agreement between you and Dlishe.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              If you do not agree to these Terms, please do not download, install, or use our Service. Your continued use of Dlishe constitutes your acceptance of these Terms and any future modifications.
            </p>
          </section>

          {/* Description of Service */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Description of Service
            </h2>
            <p className="text-text-muted leading-relaxed">
              Dlishe is a recipe management application that allows you to capture, organize, and store recipes from multiple sources. The Service includes features for:
            </p>
            <ul className="space-y-3 mt-4">
              {[
                "Extracting recipes from videos, photos, and cookbook pages using AI",
                "Organizing and managing your personal recipe collection",
                "Pantry inventory tracking and management",
                "Shopping list creation and management",
                "Recipe discovery and meal planning",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-text-muted">
                  <span className="w-1.5 h-1.5 bg-green-bright rounded-full mt-2 flex-shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* User Accounts */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              User Accounts
            </h2>
            <p className="text-text-muted leading-relaxed">
              You must create an account to access certain features of Dlishe. When creating an account, you agree to provide accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              You are solely responsible for all activities that occur under your account. If you suspect any unauthorized use of your account, you must notify us immediately at the contact information provided below.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              We reserve the right to suspend or terminate your account if we reasonably believe that your account has been used in violation of these Terms.
            </p>
          </section>

          {/* User Content */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              User Content
            </h2>
            <p className="text-text-muted leading-relaxed">
              You retain full ownership of any recipes, images, notes, or other content you create or upload to Dlishe (&quot;User Content&quot;). We do not claim any ownership rights over your User Content.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              By using our Service, you grant Dlishe a limited license to store, process, and display your User Content solely for the purpose of providing and improving the Service. This license terminates when you delete your content or your account.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              You represent and warrant that you have the necessary rights to any content you upload, and that your content does not infringe upon the intellectual property rights of any third party.
            </p>
          </section>

          {/* Acceptable Use */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Acceptable Use
            </h2>
            <p className="text-text-muted leading-relaxed mb-4">
              You agree to use Dlishe only for lawful purposes and in accordance with these Terms. You agree not to:
            </p>
            <ul className="space-y-3">
              {[
                "Use the Service for any unlawful or fraudulent purpose",
                "Upload content that infringes on intellectual property rights of others",
                "Attempt to gain unauthorized access to our systems or other users' accounts",
                "Interfere with or disrupt the integrity or performance of the Service",
                "Use automated means, bots, or scrapers to access the Service without our prior written consent",
                "Reverse engineer, decompile, or disassemble any part of the Service",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-text-muted">
                  <span className="w-1.5 h-1.5 bg-green-bright rounded-full mt-2 flex-shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-text-muted leading-relaxed mt-4">
              Violation of these acceptable use guidelines may result in the suspension or termination of your account.
            </p>
          </section>

          {/* Subscriptions and Payments */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Subscriptions and Payments
            </h2>
            <p className="text-text-muted leading-relaxed">
              Some features of Dlishe may require a paid subscription. Subscriptions are billed through the Apple App Store or Google Play Store, and are subject to the terms and conditions of the respective platform.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              Subscription fees are charged at the beginning of each billing cycle. You may cancel your subscription at any time through your device&apos;s app store settings. Cancellation takes effect at the end of the current billing period.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              Refunds are handled according to the policies of the Apple App Store or Google Play Store. We do not process refunds directly.
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Intellectual Property
            </h2>
            <p className="text-text-muted leading-relaxed">
              The Dlishe name, logo, and all related trademarks, service marks, and trade names are the exclusive property of Dlishe. The application and its original content, features, and functionality (excluding User Content) are protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              You may not reproduce, distribute, modify, create derivative works of, publicly display, or otherwise exploit any of our intellectual property without our prior written consent.
            </p>
          </section>

          {/* Disclaimer of Warranties */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Disclaimer of Warranties
            </h2>
            <p className="text-text-muted leading-relaxed">
              Dlishe is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and noninfringement.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              We do not guarantee that the Service will be uninterrupted, timely, secure, or free of errors. We do not warrant the accuracy or completeness of any recipe information extracted through our features. You should always verify recipe details, including allergen information and cooking temperatures, before preparation.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Limitation of Liability
            </h2>
            <p className="text-text-muted leading-relaxed">
              To the maximum extent permitted by applicable law, Dlishe and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss of profits, or business interruption, arising from your use of or inability to use the Service.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              In no event shall our total liability to you for all claims arising from the use of the Service exceed the amount you have paid to us in the twelve (12) months preceding the event giving rise to such liability.
            </p>
          </section>

          {/* Termination */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Termination
            </h2>
            <p className="text-text-muted leading-relaxed">
              You may terminate your account at any time by deleting it through the app settings. Upon termination, your right to use the Service will immediately cease, and all your personal data will be permanently deleted from our systems.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. All provisions of the Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Changes to These Terms
            </h2>
            <p className="text-text-muted leading-relaxed">
              We reserve the right to modify these Terms of Service at any time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify users of significant changes through the app or by posting the updated terms on our website.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              Your continued use of Dlishe after changes are posted constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically for any updates.
            </p>
          </section>

          {/* Governing Law */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Governing Law
            </h2>
            <p className="text-text-muted leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved through negotiation in good faith before pursuing any legal action.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Contact Us
            </h2>
            <p className="text-text-muted leading-relaxed">
              If you have any questions, concerns, or requests regarding these Terms of Service, please reach out to us at:
            </p>
            <p className="mt-4">
              <a
                href="mailto:contact@dlishe.com"
                className="inline-flex items-center gap-2 text-green-primary font-semibold hover:underline"
              >
                contact@dlishe.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-black/[0.06] flex items-center justify-between text-sm text-text-muted">
          <p>&copy; {new Date().getFullYear()} Dlishe. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-green-primary transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-green-primary transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
