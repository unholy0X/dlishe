import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Dlishe | Your Kitchen, Simplified",
  description: "Capture recipes from anywhere. Manage your pantry. Cook with confidence. The companion app for home cooks who love great food.",
  keywords: ["recipe app", "cooking", "meal planning", "pantry management", "recipe saver"],
  openGraph: {
    title: "Dlishe | Your Kitchen, Simplified",
    description: "Capture recipes from anywhere. Manage your pantry. Cook with confidence.",
    url: "https://dlishe.com",
    siteName: "Dlishe",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dlishe | Your Kitchen, Simplified",
    description: "Capture recipes from anywhere. Manage your pantry. Cook with confidence.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cormorant.variable}`}>
        {children}
      </body>
    </html>
  );
}
