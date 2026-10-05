import assert from "node:assert/strict";
import { get as httpGet } from "node:http";
import { JSDOM } from "jsdom";

const base = new URL(process.argv[2] || "http://localhost:3000");
const origin = new URL(process.argv[3] || "https://sendflier.tech").origin;
const paths = ["/", "/guides/gmail-mail-merge", "/api-docs", "/privacy", "/tos"];
const userAgents = ["Googlebot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot"];

async function get(path: string, headers?: Record<string, string>) {
  return fetch(new URL(path, base), {
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
}

function redirectProbe(host: string, protocol: string) {
  return new Promise<{ status: number; location: string | undefined }>((resolve, reject) => {
    // Node fetch does not reliably preserve a custom Host header; raw HTTP does.
    const request = httpGet(
      new URL("/privacy?source=test", base),
      {
        headers: { Host: host, "x-forwarded-proto": protocol },
      },
      (response) => {
        response.resume();
        resolve({ status: response.statusCode!, location: response.headers.location });
      },
    );
    request.on("error", reject);
    request.setTimeout(30_000, () => request.destroy(new Error("Redirect probe timed out")));
  });
}

async function main() {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const path of paths) {
    const response = await get(path);
    assert.equal(response.status, 200, `${path} status`);
    assert.doesNotMatch(response.headers.get("x-robots-tag") || "", /noindex/i);
    const policy = response.headers.get("content-security-policy") || "";
    assert.match(
      policy,
      /script-src[^;]*https:\/\/www\.googletagmanager\.com/,
      "Google tag script allowed",
    );
    assert.match(
      policy,
      /connect-src[^;]*https:\/\/\*\.google-analytics\.com/,
      "GA4 collection allowed",
    );
    const dom = new JSDOM(await response.text());
    const document = dom.window.document;
    assert.equal(document.querySelectorAll("h1").length, 1, `${path} heading`);
    assert.equal(document.querySelectorAll("main").length, 1, `${path} main landmark`);
    assert.equal(
      new URL(document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "").href,
      new URL(`${origin}${path}`).href,
    );
    assert.match(
      document.querySelector('meta[name="robots"]')?.getAttribute("content") || "",
      /^index, follow/,
    );
    assert.equal(
      new URL(document.querySelector('meta[property="og:url"]')?.getAttribute("content") || "")
        .href,
      new URL(`${origin}${path}`).href,
    );
    assert.equal(
      document.querySelector('meta[name="twitter:card"]')?.getAttribute("content"),
      "summary_large_image",
    );
    const title = document.title;
    const description = document.querySelector('meta[name="description"]')?.getAttribute("content");
    assert.ok(title && description, `${path} title/description`);
    assert.ok(!titles.has(title) && !descriptions.has(description), `${path} unique metadata`);
    titles.add(title);
    descriptions.add(description);
    for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')) {
      const target = new URL(link.getAttribute("href")!, base);
      const linkedResponse = await get(`${target.pathname}${target.search}`);
      assert.ok(linkedResponse.status < 400, `${path} broken link: ${target.pathname}`);
    }
    dom.window.close();
    console.log(`PASS ${path}: server content, metadata, canonical, and internal links`);
  }

  for (const agent of userAgents) {
    const response = await get("/", { "User-Agent": agent });
    const dom = new JSDOM(await response.text());
    assert.equal(response.status, 200, `${agent} status`);
    assert.match(
      dom.window.document.querySelector("#features")?.textContent || "",
      /CSV Personalization/,
    );
    const data = JSON.parse(
      dom.window.document.querySelector('script[type="application/ld+json"]')?.textContent ||
        "null",
    );
    assert.ok(
      data?.["@graph"].some(
        (entry: { "@type": string; url: string }) =>
          entry["@type"] === "WebSite" && entry.url === `${origin}/`,
      ),
    );
    dom.window.close();
    console.log(`PASS ${agent}: homepage content and structured data`);
  }

  for (const path of ["/dashboard", "/compose", "/settings", "/auth/signin"]) {
    const response = await get(path);
    const dom = new JSDOM(await response.text());
    assert.match(
      dom.window.document.querySelector('meta[name="robots"]')?.getAttribute("content") || "",
      /noindex/,
    );
    assert.equal(dom.window.document.querySelector('link[rel="canonical"]'), null);
    dom.window.close();
  }
  const api = await get("/api/auth/session");
  assert.match(api.headers.get("x-robots-tag") || "", /noindex/);
  const missing = await get("/this-page-does-not-exist");
  assert.equal(missing.status, 404, "missing URLs must not become soft 404s");

  const robots = await get("/robots.txt");
  assert.equal(robots.status, 200);
  const robotsText = await robots.text();
  assert.ok(robotsText.includes(`Sitemap: ${origin}/sitemap.xml`));
  assert.ok(robotsText.includes("Allow: /"));
  const sitemap = await get("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const sitemapXml = await sitemap.text();
  assert.deepEqual(
    [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]).sort(),
    paths.map((path) => `${origin}${path}`).sort(),
  );
  const image = await get("/og");
  assert.equal(image.status, 200);
  assert.match(image.headers.get("content-type") || "", /image\/png/);
  assert.ok((await image.arrayBuffer()).byteLength > 1000);

  // Probe Heroku's forwarded protocol without redirecting loopback development.
  if (["localhost", "127.0.0.1"].includes(base.hostname)) {
    for (const host of [
      "sendflier.tech",
      "www.sendflier.tech",
      "sendflier-971560a20530.herokuapp.com",
    ]) {
      const response = await redirectProbe(host, "http");
      assert.equal(response.status, 308, `${host} permanent redirect`);
      assert.equal(response.location, "https://sendflier.tech/privacy?source=test");
    }
    const https = await redirectProbe("sendflier.tech", "https");
    assert.equal(https.status, 200, "HTTPS must not redirect in a loop");
  }
  console.log(
    "PASS private/API noindex, 404, robots, sitemap, sharing image, and canonical redirects",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
