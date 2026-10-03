import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sendflier.tech";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api-docs", "/privacy", "/tos"],
      disallow: [
        "/dashboard/",
        "/compose/",
        "/contacts/",
        "/templates/",
        "/insights/",
        "/settings/",
        "/auth/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
