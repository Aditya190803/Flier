import type React from "react";

import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { APP_NAME } from "@/lib/brand";
import { SITE_URL } from "@/lib/seo";

import { Providers } from "./providers";

import type { Metadata, Viewport } from "next";

// System font stack (see --font-sans in globals.css) - no external network dependency
const fontClassName = "font-sans";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  robots: { index: false, follow: false },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
  description:
    "Send personalized updates through Gmail. Upload contacts, compose rich messages, and reach your whole list with Flier.",
  generator: "Next.js",
  keywords: [
    "email",
    "gmail",
    "bulk email",
    "personalization",
    "csv",
    "flier",
    "flyer",
    "email campaigns",
    "notices",
  ],
  authors: [{ name: APP_NAME }],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // CSRF token is ensured by proxy.ts (middleware)

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${fontClassName} antialiased`} suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
