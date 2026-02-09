import Link from "next/link";
import Image from "next/image";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-text-muted">Effective date: February 9, 2026</p>
        </div>

        <div className="space-y-12">
          {/* Introduction */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Introduction
            </h2>
            <p className="text-text-muted leading-relaxed">
              Dlishe (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and related services.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              By using Dlishe, you agree to the collection and use of information as described in this policy. We will not use or share your information with anyone except as described here.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Information We Collect
            </h2>

            <h3 className="text-base font-semibold text-text-dark mt-6 mb-2">Account Information</h3>
            <p className="text-text-muted leading-relaxed">
              When you create an account, we collect your email address and name through our authentication provider (Clerk). We use this to identify you and personalize your experience.
            </p>

            <h3 className="text-base font-semibold text-text-dark mt-6 mb-2">Recipe Data</h3>
            <p className="text-text-muted leading-relaxed">
              We store recipes you save or create, including titles, ingredients, instructions, cooking times, and nutritional information. This data is stored securely and is only accessible to you.
            </p>

            <h3 className="text-base font-semibold text-text-dark mt-6 mb-2">Pantry and Shopping Lists</h3>
            <p className="text-text-muted leading-relaxed">
              We store your pantry inventory items and shopping lists to provide core app functionality. This data is private to your account.
            </p>

            <h3 className="text-base font-semibold text-text-dark mt-6 mb-2">Camera and Photos</h3>
            <p className="text-text-muted leading-relaxed">
              Dlishe requests access to your device camera and photo library to enable recipe capture from cookbook pages and food photos. Images are processed to extract recipe information and are not permanently stored on our servers.
            </p>

            <h3 className="text-base font-semibold text-text-dark mt-6 mb-2">Usage Data</h3>
            <p className="text-text-muted leading-relaxed">
              We may collect anonymous usage data such as app interactions, feature usage frequency, and crash reports to improve the quality of our service.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              How We Use Your Information
            </h2>
            <p className="text-text-muted leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>
            <ul className="space-y-3">
              {[
                "To provide, maintain, and improve the Dlishe service",
                "To personalize your experience and provide recipe suggestions",
                "To process recipe extraction from images you capture",
                "To communicate with you about service updates and new features",
                "To detect, prevent, and address technical issues",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-text-muted">
                  <span className="w-1.5 h-1.5 bg-green-bright rounded-full mt-2 flex-shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Third-Party Services */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Third-Party Services
            </h2>
            <p className="text-text-muted leading-relaxed mb-4">
              We use the following third-party services to operate Dlishe. Each service has its own privacy policy governing the use of your information:
            </p>
            <div className="space-y-3">
              {[
                { name: "Clerk", desc: "Authentication and user account management" },
                { name: "Google Cloud", desc: "Recipe extraction and image processing" },
                { name: "RevenueCat", desc: "Subscription management for unlimited recipe extractions" },
                { name: "Apple App Store & Google Play", desc: "App distribution and payment processing" },
              ].map((service) => (
                <div key={service.name} className="flex items-start gap-3 text-text-muted">
                  <span className="w-1.5 h-1.5 bg-green-bright rounded-full mt-2 flex-shrink-0" />
                  <span className="leading-relaxed">
                    <strong className="text-text-dark">{service.name}:</strong> {service.desc}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Data Security */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Data Security
            </h2>
            <p className="text-text-muted leading-relaxed">
              We implement strong security measures to protect your data. All data is transmitted over HTTPS and stored in encrypted databases.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              While we strive to use commercially acceptable means to protect your personal information, no method of transmission over the Internet or method of electronic storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Data Retention
            </h2>
            <p className="text-text-muted leading-relaxed">
              We retain your personal data for as long as your account is active or as needed to provide you with the service. You may delete your account at any time, which will permanently remove all your personal data from our systems.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              We may retain certain anonymized, aggregated data that cannot be used to identify you for analytics and service improvement purposes.
            </p>
          </section>

          {/* Your Rights */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Your Rights
            </h2>
            <p className="text-text-muted leading-relaxed mb-4">
              Depending on your location, you may have the following rights regarding your personal data:
            </p>
            <ul className="space-y-3">
              {[
                "Access and receive a copy of your personal data",
                "Correct any inaccurate or incomplete data",
                "Request deletion of your account and associated data",
                "Export your recipes and data in a portable format",
                "Opt out of non-essential communications",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-text-muted">
                  <span className="w-1.5 h-1.5 bg-green-bright rounded-full mt-2 flex-shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-text-muted leading-relaxed mt-4">
              To exercise any of these rights, please contact us using the information provided below.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Children&apos;s Privacy
            </h2>
            <p className="text-text-muted leading-relaxed">
              Dlishe is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will promptly delete it.
            </p>
          </section>

          {/* Changes */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Changes to This Policy
            </h2>
            <p className="text-text-muted leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy within the app or on our website.
            </p>
            <p className="text-text-muted leading-relaxed mt-4">
              Your continued use of Dlishe after changes are posted constitutes your acceptance of the revised policy.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-white rounded-[20px] p-8 shadow-soft">
            <h2 className="text-xl font-display font-semibold text-text-dark mb-4">
              Contact Us
            </h2>
            <p className="text-text-muted leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out to us at:
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
            <Link href="/terms" className="hover:text-green-primary transition-colors">Terms of Service</Link>
            <Link href="/" className="hover:text-green-primary transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
