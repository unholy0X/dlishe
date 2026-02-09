import Link from "next/link";

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-[#F4F5F7] py-16 px-6">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow-sm">
                <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-8 block">
                    ← Back
                </Link>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
                <p className="text-gray-500 mb-8">Last updated: February 9, 2025</p>

                <div className="prose prose-gray max-w-none">
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By using DLISHE ("the App"), you agree to these Terms of Service.
                        If you do not agree, please do not use the App.
                    </p>

                    <h2>2. Description of Service</h2>
                    <p>
                        DLISHE is a recipe management application that helps you:
                    </p>
                    <ul>
                        <li>Extract and save recipes from videos, photos, and websites</li>
                        <li>Manage your pantry inventory</li>
                        <li>Create and manage shopping lists</li>
                        <li>Organize your cooking inspiration</li>
                    </ul>

                    <h2>3. User Accounts</h2>
                    <p>
                        You must create an account to use the App. You are responsible for
                        maintaining the security of your account credentials.
                    </p>

                    <h2>4. Subscription and Payments</h2>
                    <h3>Free Tier</h3>
                    <ul>
                        <li>3 recipe extractions per month</li>
                        <li>3 pantry scans per month</li>
                        <li>Up to 10 saved recipes</li>
                        <li>Unlimited shopping lists</li>
                    </ul>

                    <h3>Pro Subscription ($2.99/month or $19.99/year)</h3>
                    <ul>
                        <li>Unlimited recipe extractions</li>
                        <li>Unlimited pantry scans</li>
                        <li>Unlimited saved recipes</li>
                        <li>Multi-device sync</li>
                        <li>Recipe sharing</li>
                    </ul>

                    <p>
                        Subscriptions are billed through Apple App Store or Google Play Store.
                        Subscriptions auto-renew unless cancelled at least 24 hours before the
                        end of the current period.
                    </p>

                    <h2>5. User Content</h2>
                    <p>
                        You retain ownership of recipes and content you create or save in the App.
                        By using the App, you grant us a license to store and process this content
                        to provide the service.
                    </p>

                    <h2>6. Acceptable Use</h2>
                    <p>You agree not to:</p>
                    <ul>
                        <li>Use the App for any illegal purpose</li>
                        <li>Attempt to reverse engineer or hack the App</li>
                        <li>Share your account with others</li>
                        <li>Upload malicious content</li>
                    </ul>

                    <h2>7. AI-Generated Content</h2>
                    <p>
                        Our AI features extract and analyze recipes from various sources.
                        We do not guarantee the accuracy of AI-extracted content.
                        Always verify recipes before cooking.
                    </p>

                    <h2>8. Intellectual Property</h2>
                    <p>
                        The App, its design, features, and functionality are owned by DLISHE
                        and protected by intellectual property laws.
                    </p>

                    <h2>9. Disclaimer of Warranties</h2>
                    <p>
                        The App is provided "as is" without warranties of any kind.
                        We do not guarantee uninterrupted or error-free service.
                    </p>

                    <h2>10. Limitation of Liability</h2>
                    <p>
                        We are not liable for any indirect, incidental, or consequential damages
                        arising from your use of the App.
                    </p>

                    <h2>11. Termination</h2>
                    <p>
                        We may terminate or suspend your account at any time for violations of
                        these terms. You may delete your account at any time.
                    </p>

                    <h2>12. Changes to Terms</h2>
                    <p>
                        We may update these terms from time to time. Continued use of the App
                        after changes constitutes acceptance of the new terms.
                    </p>

                    <h2>13. Contact</h2>
                    <p>
                        For questions about these Terms, contact us at:
                        <br />
                        <a href="mailto:support@dlishe.com" className="text-green-600 hover:underline">
                            support@dlishe.com
                        </a>
                    </p>
                </div>
            </div>
        </main>
    );
}
