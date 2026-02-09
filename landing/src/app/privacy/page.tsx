import Link from "next/link";

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-bg-primary py-16 px-6">
            <div className="max-w-3xl mx-auto bg-bg-card rounded-[20px] p-8 shadow-soft">
                <Link
                    href="/"
                    className="text-sm text-text-muted hover:text-green-primary transition-colors mb-8 block"
                >
                    ← Back to home
                </Link>

                <h1 className="text-3xl font-display font-bold text-text-dark mb-2">
                    Privacy Policy
                </h1>
                <p className="text-text-muted mb-8">Last updated: February 9, 2025</p>

                <div className="prose prose-gray max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            Introduction
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            DLISHE (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
                            This Privacy Policy explains how we collect, use, and safeguard your information
                            when you use our mobile application and related services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            Information We Collect
                        </h2>

                        <h3 className="text-lg font-display font-medium text-text-dark mt-6 mb-2">
                            Account Information
                        </h3>
                        <p className="text-text-muted leading-relaxed">
                            When you create an account, we collect your email address and name through our
                            authentication provider (Clerk). We use this to identify you and personalize your experience.
                        </p>

                        <h3 className="text-lg font-display font-medium text-text-dark mt-6 mb-2">
                            Recipe Data
                        </h3>
                        <p className="text-text-muted leading-relaxed">
                            We store recipes you save or create, including ingredients, instructions,
                            and images. This data is stored securely and only accessible to you.
                        </p>

                        <h3 className="text-lg font-display font-medium text-text-dark mt-6 mb-2">
                            Pantry and Shopping Lists
                        </h3>
                        <p className="text-text-muted leading-relaxed">
                            We store your pantry items and shopping lists to provide app functionality.
                            This data is private to your account.
                        </p>

                        <h3 className="text-lg font-display font-medium text-text-dark mt-6 mb-2">
                            Images
                        </h3>
                        <p className="text-text-muted leading-relaxed">
                            When you use our recipe capture features, images are processed to read recipe
                            information. Images are processed in real-time and not permanently stored
                            on our servers.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            How We Use Your Information
                        </h2>
                        <ul className="list-disc list-inside text-text-muted space-y-2">
                            <li>To provide and maintain our service</li>
                            <li>To personalize your experience</li>
                            <li>To process your subscription and payments</li>
                            <li>To communicate with you about service updates</li>
                            <li>To improve our recipe capture features</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            Third-Party Services
                        </h2>
                        <p className="text-text-muted leading-relaxed mb-3">
                            We use the following third-party services:
                        </p>
                        <ul className="list-disc list-inside text-text-muted space-y-2">
                            <li><strong>Clerk</strong> — Authentication and user management</li>
                            <li><strong>Google Cloud</strong> — Recipe and image reading</li>
                            <li><strong>RevenueCat</strong> — Subscription management</li>
                            <li><strong>Apple App Store / Google Play</strong> — Payment processing</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            Data Security
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            We implement industry-standard security measures to protect your data.
                            All data is transmitted over HTTPS and stored in encrypted databases.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            Data Retention
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            We retain your data as long as your account is active. You can delete your
                            account at any time, which will remove all your personal data from our systems.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            Your Rights
                        </h2>
                        <p className="text-text-muted leading-relaxed mb-3">You have the right to:</p>
                        <ul className="list-disc list-inside text-text-muted space-y-2">
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Delete your account and data</li>
                            <li>Export your data</li>
                            <li>Opt out of marketing communications</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            Children&apos;s Privacy
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            DLISHE is not intended for children under 13. We do not knowingly
                            collect information from children under 13.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            Changes to This Policy
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you
                            of any changes by posting the new policy on this page.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            Contact Us
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            If you have questions about this Privacy Policy, please contact us at:
                            <br />
                            <a
                                href="mailto:privacy@dlishe.com"
                                className="text-green-primary hover:underline"
                            >
                                privacy@dlishe.com
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
