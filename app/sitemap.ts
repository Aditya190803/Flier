import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sendflier.tech";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/`,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/api-docs`,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/privacy`,
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/tos`,
      priority: 0.3,
    },
  ];
}
