"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import "swagger-ui-react/swagger-ui.css";

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

/**
 * API Documentation Page
 *
 * This page provides interactive cumentation using Swagger UI.
 * It loads the OpenAPI specification from /public/openapi.json
 */
export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">API & Webhooks Documentation</h1>
          <p className="text-muted-foreground">
            Interactive API and Webhooks documentation for the Flier email campaign platform. API
            endpoints require authentication via active session or API keys. Webhooks can be
            configured in your account settings.
          </p>
        </header>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <SwaggerUI
            url="/openapi.json"
            docExpansion="list"
            defaultModelsExpandDepth={-1}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
          />
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            For more information, see the{" "}
            <Link href="/docs/API.md" className="text-primary hover:underline">
              API Markdown Documentation
            </Link>{" "}
            or the{" "}
            <Link href="/docs/DEVELOPER_GUIDE.md" className="text-primary hover:underline">
              Developer Guide
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
