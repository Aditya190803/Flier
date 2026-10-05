import Link from "next/link";
import { ApiReference } from "@/components/api-reference";
import { publicPageMetadata } from "@/lib/seo";
import specification from "@/public/openapi.json";

export const metadata = publicPageMetadata("/api-docs");

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">API &amp; Webhooks Documentation</h1>
        <p className="text-muted-foreground">
          Flier's API manages contacts, campaigns, templates, and email sending through Gmail.
          Protected endpoints require an authenticated session; mutations also require a CSRF token.
          Configure webhooks in your account settings to receive campaign event notifications.
        </p>
      </header>
      <section aria-labelledby="api-overview" className="mb-8 space-y-4">
        <h2 id="api-overview" className="text-xl font-semibold">
          API reference overview
        </h2>
        <p className="text-muted-foreground">
          The reference below lists the documented endpoints. Expand the interactive reference for
          request parameters and responses, or{" "}
          <Link href="/openapi.json" className="text-primary underline">
            download the OpenAPI specification
          </Link>
          .
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm text-left">
            <caption className="sr-only">Documented Flier API methods and endpoints</caption>
            <thead className="bg-muted">
              <tr>
                <th className="p-3">Method</th>
                <th className="p-3">Endpoint</th>
                <th className="p-3">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(specification.paths).flatMap(([path, operations]) =>
                Object.entries(operations).map(([method, operation]) => (
                  <tr key={`${method}:${path}`} className="border-t">
                    <td className="p-3 font-mono">{method.toUpperCase()}</td>
                    <td className="p-3 font-mono">{path}</td>
                    <td className="p-3">{operation.summary}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section
        aria-labelledby="interactive-reference"
        className="bg-card rounded-lg border shadow-sm overflow-hidden"
      >
        <h2 id="interactive-reference" className="text-xl font-semibold p-4">
          Interactive API reference
        </h2>
        <ApiReference />
      </section>
      <p className="mt-8 text-sm text-muted-foreground">
        New to Flier?{" "}
        <Link href="/guides/gmail-mail-merge" className="text-primary underline">
          Learn how to send a Gmail mail merge
        </Link>{" "}
        or{" "}
        <Link href="/" className="text-primary underline">
          explore the campaign features
        </Link>
        .
      </p>
    </div>
  );
}
