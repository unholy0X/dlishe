import Link from "next/link";

export default function TermsPage() {
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
                    Terms of Service
                </h1>
                <p className="text-text-muted mb-8">Last updated: February 9, 2025</p>

                <div className="prose prose-gray max-w-none space-y-6">
                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            1. Acceptance of Terms
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            By downloading, installing, or using the DLISHE mobile application,
                            you agree to be bound by these Terms of Service. If you do not agree
                            to these terms, please do not use our service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            2. Description of Service
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            DLISHE is a recipe management application that allows you to capture,
                            organize, and store recipes. The service includes features for pantry
                            management, shopping lists, and meal planning.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            3. User Accounts
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            You must create an account to use certain features of DLISHE. You are
                            responsible for maintaining the confidentiality of your account
                            credentials and for all activities under your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            4. User Content
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            You retain ownership of any recipes, images, or other content you
                            create or upload to DLISHE. By using our service, you grant us a
                            limited license to store and display your content for the purpose
                            of providing the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            5. Acceptable Use
                        </h2>
                        <p className="text-text-muted leading-relaxed mb-3">
                            You agree not to:
                        </p>
                        <ul className="list-disc list-inside text-text-muted space-y-2">
                            <li>Use the service for any unlawful purpose</li>
                            <li>Upload content that infringes on intellectual property rights</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Interfere with or disrupt the service</li>
                            <li>Use automated means to access the service without permission</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            6. Subscriptions and Payments
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            Some features of DLISHE require a paid subscription. Subscriptions
                            are billed through the Apple App Store or Google Play Store.
                            Refunds are handled according to the respective store&apos;s policies.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            7. Intellectual Property
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            The DLISHE name, logo, and all related trademarks, service marks,
                            and trade names are the property of DLISHE. The application and
                            its original content (excluding user content) are protected by
                            copyright and other intellectual property laws.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            8. Disclaimer of Warranties
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            DLISHE is provided &quot;as is&quot; without warranties of any kind,
                            either express or implied. We do not guarantee that the service
                            will be uninterrupted, secure, or error-free.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            9. Limitation of Liability
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            To the maximum extent permitted by law, DLISHE shall not be liable
                            for any indirect, incidental, special, consequential, or punitive
                            damages arising from your use of the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            10. Changes to Terms
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            We reserve the right to modify these Terms of Service at any time.
                            We will notify users of significant changes through the app or by
                            email. Continued use of the service after changes constitutes
                            acceptance of the new terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-display font-semibold text-text-dark mt-8 mb-3">
                            11. Contact
                        </h2>
                        <p className="text-text-muted leading-relaxed">
                            For questions about these Terms of Service, please contact us at:
                            <br />
                            <a
                                href="mailto:legal@dlishe.com"
                                className="text-green-primary hover:underline"
                            >
                                legal@dlishe.com
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </main>
    );
}
