# Search and AI crawler readiness

## What was wrong

The deployed homepage returned an authentication-loading spinner in its initial
HTML. The headline, features, and instructions appeared only after JavaScript
resolved the session. Scroll-reveal CSS also hid sections until JavaScript ran.
Direct Googlebot and OAI-SearchBot user-agent probes returned HTTP 200 but no H1
or product content. This is a rendering failure, not evidence of Heroku blocking
crawlers. User-agent probes do not prove access from the providers' actual IPs.

Live robots.txt and sitemap.xml were accessible. Heroku reported an always-on
Basic web dyno and issued certificates for both custom domains; independent TLS
verification passed. The web-reading service still failed on public URLs, so its
specific transport failure remains unconfirmed. Do not assume a hosting move
will solve that separate failure.

## Implemented

- Public landing, legal, guide, and API overview content renders on the server.
  Only authentication, the product demo, and interactive Swagger remain client
  components. Session loading never gates the public content.
- Each public page has a unique title and description, an absolute canonical,
  Open Graph metadata, and a Twitter summary image. `/og` serves a generated PNG
  without an external font or image dependency.
- Homepage WebSite and WebApplication JSON-LD describes the actual product.
  No invented ratings, reviews, prices, or rich-result eligibility claims.
- `lib/seo.ts` supplies the same origin and public page list to metadata and
  sitemap. No fabricated last-modified timestamps or meaningless priorities.
- HTTP requests forwarded by Heroku redirect permanently to HTTPS. Existing
  www and Heroku alias redirects preserve paths and query strings.
- Account and sign-in pages have noindex metadata. API responses carry
  `X-Robots-Tag: noindex, nofollow`. Robots permits public search/AI crawling and
  lets crawlers read account-page noindex directives; it excludes API crawling.
  These directives are not access controls.
- `/api-docs` no longer hits API rate limiting. Its server-rendered endpoint
  overview uses the checked-in OpenAPI specification. Broken documentation
  links have been replaced with working specification and guide links.
- Clear Gmail mail merge copy, visible FAQs, and a linked CSV guide explain the
  actual workflow, Gmail limits, consent, and tracking limitations. Legal pages
  have an H1 and public pages have one main landmark and a skip link.
- The existing GA4 loader was blocked by Content Security Policy. Script and
  connection directives now permit the Google tag and analytics collection
  origins so configured analytics can measure search traffic.

## Repeatable verification

Build with `NEXT_PUBLIC_APP_URL=https://sendflier.tech`, then start the built app:

```text
vp run build
vp run start --port 3200
vp run seo:verify http://localhost:3200 https://sendflier.tech
```

The two optional arguments are the reachable app URL and expected canonical
origin. They let the same check run against another deployment. The check reads
raw HTML without executing JavaScript; it validates public content, unique
metadata, canonical/sitemap agreement, internal links, structured data, five
crawler user agents, private/API noindex, real 404s, the sharing image, and
canonical redirects. The production check runs in CI after building. Playwright
also checks public pages with JavaScript disabled.

For a deployed check:

```text
vp run seo:verify https://sendflier.tech https://sendflier.tech
```

## After merging and deploying

1. Confirm `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` are the final HTTPS origin in
   Heroku. Public metadata is built into the static pages; rebuild/redeploy after
   changing the origin or verification tokens.
2. Verify ownership in Google Search Console and Bing Webmaster Tools. DNS
   verification is suitable for a domain property. For HTML-tag verification,
   set `GOOGLE_SITE_VERIFICATION` and/or `BING_SITE_VERIFICATION` before building.
   Tokens are public, optional metadata values; do not put account credentials
   in them.
3. Submit `https://sendflier.tech/sitemap.xml` in both services. In Search Console,
   inspect the homepage and guide, run the live test, check rendered content and
   the chosen canonical, and request indexing. Review Page Indexing and Crawl
   Stats for actual crawler errors instead of relying on a `site:` query.
4. Check the deployed homepage in Google's Rich Results Test / Schema.org
   validator. WebSite identifies the site name. Basic WebApplication markup
   does not meet Google's app rich-result requirements without genuine ratings
   or reviews; do not manufacture those fields.
5. Monitor impressions/clicks and real-user Core Web Vitals in Search Console.
   Server-rendered content removes the session wait from the landing page;
   measured field performance and rankings still depend on real traffic.
6. If an LLM URL fetch still fails, collect its exact error and timestamp and
   correlate with Heroku access/router logs. Check the requesting provider's
   crawler IP ranges and any upstream security rules. A spoofed user-agent test
   alone cannot confirm that a real provider can reach the site.

Search indexing, rankings, and inclusion in AI answers are not guaranteed. No
special AI file is required for Google; crawlable, useful content and ordinary
SEO foundations come first. Authority, original content, and links need ongoing
work based on actual users and Search Console data.

## Sources and audit checklist

- [SEO audit skill](https://github.com/coreyhaines31/marketingskills/tree/main/skills/seo-audit)
- [Google SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Site names](https://developers.google.com/search/docs/appearance/site-names)
- [Software application structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [AI search guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Heroku custom domains](https://devcenter.heroku.com/articles/custom-domains)
- [Google tag Content Security Policy](https://developers.google.com/tag-platform/security/guides/csp)
