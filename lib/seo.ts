import type { Metadata } from "next";

import { APP_DEFAULT_URL, APP_NAME } from "./brand";

// Share one origin across canonical tags, structured data, robots, and sitemap.
export const SITE_URL = new URL(process.env.NEXT_PUBLIC_APP_URL || APP_DEFAULT_URL).origin;

export const PUBLIC_PAGES = {
  "/": {
    title: "Gmail Mail Merge & Personalized Email Campaigns",
    description:
      "Send personalized email campaigns through Gmail with Flier. Import CSV contacts, preview mail merge messages, schedule delivery, and track opens and clicks.",
  },
  "/guides/gmail-mail-merge": {
    title: "How to Send a Gmail Mail Merge from a CSV",
    description:
      "Learn how to prepare a CSV, personalize emails, preview each recipient's message, and send a Gmail mail merge with Flier while respecting Gmail limits.",
  },
  "/api-docs": {
    title: "Email Campaign API & Webhooks Documentation",
    description:
      "Explore Flier's email campaign API and webhooks. Read the OpenAPI reference for contacts, templates, sending, analytics, and webhook integrations.",
  },
  "/privacy": {
    title: "Privacy Policy",
    description:
      "Read Flier's privacy policy, including how Google account access, contact data, email campaigns, security, and your data rights are handled.",
  },
  "/tos": {
    title: "Terms of Service",
    description:
      "Read the terms for using Flier's Gmail email campaign platform, including acceptable use, account responsibilities, and service conditions.",
  },
} as const;

export function publicPageMetadata(path: keyof typeof PUBLIC_PAGES): Metadata {
  const { title, description } = PUBLIC_PAGES[path];
  const socialTitle = `${title} | ${APP_NAME}`;
  const image = {
    url: `${SITE_URL}/og`,
    width: 1200,
    height: 630,
    alt: "Flier — personalized email campaigns through Gmail",
  };
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: APP_NAME,
      title: socialTitle,
      description,
      url: `${SITE_URL}${path}`,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: [image] },
  };
}

export const HOMEPAGE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: APP_NAME,
      url: `${SITE_URL}/`,
      description: PUBLIC_PAGES["/"].description,
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#application`,
      name: APP_NAME,
      url: `${SITE_URL}/`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      description: PUBLIC_PAGES["/"].description,
      featureList: [
        "CSV contact import",
        "Email personalization",
        "Gmail integration",
        "Campaign scheduling",
        "Open and click tracking",
      ],
    },
  ],
};
