import { describe, expect, it } from "vite-plus/test";

import sitemap from "@/app/sitemap";
import { PUBLIC_PAGES, SITE_URL, publicPageMetadata } from "@/lib/seo";

describe("public search metadata", () => {
  it("uses unique titles and descriptions with matching canonical and sitemap URLs", () => {
    const pages = Object.keys(PUBLIC_PAGES) as (keyof typeof PUBLIC_PAGES)[];
    const metadata = pages.map(publicPageMetadata);
    expect(new Set(metadata.map((page) => page.title)).size).toBe(pages.length);
    expect(new Set(metadata.map((page) => page.description)).size).toBe(pages.length);
    expect(sitemap().map((page) => page.url)).toEqual(pages.map((path) => `${SITE_URL}${path}`));
    for (const [index, page] of metadata.entries()) {
      expect(page.alternates?.canonical).toBe(`${SITE_URL}${pages[index]}`);
      expect(page.robots).toMatchObject({ index: true, follow: true });
      expect(page.openGraph).toMatchObject({ url: page.alternates?.canonical });
    }
  });
});
