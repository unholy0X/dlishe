import Link from "next/link";

export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-[#F4F5F7] py-16 px-6">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow-sm">
                <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-8 block">
                    ← Back
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                <p className="text-gray-500 mb-8">Last updated: February 9, 2025</p>

                <div className="prose prose-gray max-w-none">
                    <h2>Introduction</h2>
                    <p>
                        DLISHE ("we", "our", or "us") is committed to protecting your privacy.
                        This Privacy Policy explains how we collect, use, and safeguard your information
                        when you use our mobile application and related services.
                    </p>

                    <h2>Information We Collect</h2>
                    <h3>Account Information</h3>
                    <p>
                        When you create an account, we collect your email address and name through our
                        authentication provider (Clerk). We use this to identify you and personalize your experience.
                    </p>

                    <h3>Recipe Data</h3>
                    <p>
                        We store recipes you extract, save, or create, including ingredients, instructions,
                        and images. This data is stored securely and only accessible to you.
                    </p>

                    <h3>Pantry and Shopping Lists</h3>
                    <p>
                        We store your pantry items and shopping lists to provide app functionality.
                        This data is private to your account.
                    </p>

                    <h3>Images</h3>
                    <p>
                        When you use our AI scanning features, images are processed to extract recipe or
                        pantry information. Images are processed in real-time and not permanently stored
                        by our AI providers.
                    </p>

                    <h2>How We Use Your Information</h2>
                    <ul>
                        <li>To provide and maintain our service</li>
                        <li>To personalize your experience</li>
                        <li>To process your subscription and payments</li>
                        <li>To communicate with you about service updates</li>
                        <li>To improve our AI extraction features</li>
                    </ul>

                    <h2>Third-Party Services</h2>
                    <p>We use the following third-party services:</p>
                    <ul>
                        <li><strong>Clerk</strong> — Authentication and user management</li>
                        <li><strong>Google Gemini</strong> — AI-powered recipe and image analysis</li>
                        <li><strong>RevenueCat</strong> — Subscription management</li>
                        <li><strong>Apple App Store / Google Play</strong> — Payment processing</li>
                    </ul>

                    <h2>Data Security</h2>
                    <p>
                        We implement industry-standard security measures to protect your data.
                        All data is transmitted over HTTPS and stored in encrypted databases.
                    </p>

                    <h2>Data Retention</h2>
                    <p>
                        We retain your data as long as your account is active. You can delete your
                        account at any time, which will remove all your personal data from our systems.
                    </p>

                    <h2>Your Rights</h2>
                    <p>You have the right to:</p>
                    <ul>
                        <li>Access your personal data</li>
                        <li>Correct inaccurate data</li>
                        <li>Delete your account and data</li>
                        <li>Export your data</li>
                        <li>Opt out of marketing communications</li>
                    </ul>

                    <h2>Children's Privacy</h2>
                    <p>
                        DLISHE is not intended for children under 13. We do not knowingly
                        collect information from children under 13.
                    </p>

                    <h2>Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you
                        of any changes by posting the new policy on this page.
                    </p>

                    <h2>Contact Us</h2>
                    <p>
                        If you have questions about this Privacy Policy, please contact us at:
                        <br />
                        <a href="mailto:privacy@dlishe.com" className="text-green-600 hover:underline">
                            privacy@dlishe.com
                        </a>
                    </p>
                </div>
            </div>
        </main>
    );
}
