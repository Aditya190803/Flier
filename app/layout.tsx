import type React from "react";

import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { APP_NAME } from "@/lib/brand";

import { Providers } from "./providers";

import type { Metadata, Viewport } from "next";

// System font stack - no external network dependency
const fontClassName = "font-sans";

export const metadata: Metadata = {
  title: `${APP_NAME} - Professional email for your list`,
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
