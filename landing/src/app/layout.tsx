import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = "https://dlishe.com";
const TITLE = "Dlishe — Your Recipes, All in One Place";
const DESCRIPTION =
  "Save recipes from TikTok, YouTube, any website, or snap a cookbook page. Dlishe organizes your favorites, builds shopping lists, and helps you cook with confidence.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Dlishe",
  },
  description: DESCRIPTION,
  keywords: [
    "recipe app",
    "save tiktok recipes",
    "save youtube recipes",
    "recipe organizer",
    "cookbook app",
    "meal planning",
    "pantry management",
    "shopping list",
    "cooking app",
    "recipe saver",
    "home cooking",
  ],
  authors: [{ name: "Dlishe" }],
  creator: "Dlishe",
  publisher: "Dlishe",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Dlishe",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Dlishe — Your Recipes, All in One Place",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    site: "@DlisheApp",
    creator: "@DlisheApp",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/logo-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#385225",
  width: "device-width",
  initialScale: 1,
};

/* ── JSON-LD structured data ────────────────────────────── */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "Dlishe",
  operatingSystem: "iOS, Android",
  applicationCategory: "LifestyleApplication",
  description: DESCRIPTION,
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image`,
  author: {
    "@type": "Organization",
    name: "Dlishe",
    url: SITE_URL,
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  sameAs: [
    "https://x.com/DlisheApp",
    "https://www.instagram.com/dlisheapp/",
    "https://www.tiktok.com/@dlisheapp",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${cormorant.variable}`}>
        {children}
      </body>
    </html>
  );
}
