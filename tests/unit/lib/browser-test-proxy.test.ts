import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { rateLimit, validateCSRFToken } = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  validateCSRFToken: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit, RATE_LIMITS: { api: {} } }));
vi.mock("@/lib/csrf", () => ({ validateCSRFToken, setCSRFToken: vi.fn() }));

import { proxy } from "@/proxy";

describe("browser test isolation", () => {
  beforeEach(() => {
    vi.stubEnv("E2E_TEST", "true");
    vi.stubEnv("NODE_ENV", "development");
    rateLimit.mockReturnValue(NextResponse.json({ error: "Rate limited" }, { status: 429 }));
    validateCSRFToken.mockResolvedValue(false);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("allows isolated loopback tests to read an empty collection", async () => {
    const response = await proxy(new NextRequest("http://localhost:3100/api/appwrite/contacts"));
    expect(await response.json()).toEqual({ total: 0, documents: [] });
  });

  it.each([
    ["production", "http://localhost:3100"],
    ["development", "https://sendflier.tech"],
  ])("keeps rate limiting and real data active in %s at %s", async (environment, origin) => {
    vi.stubEnv("NODE_ENV", environment);
    const response = await proxy(new NextRequest(`${origin}/api/appwrite/contacts`));
    expect(response.status).toBe(429);
  });

  it("still rejects mutations without a CSRF token in browser tests", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3100/api/appwrite/contacts", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(403);
  });

  it("does not rate limit the public API documentation as an API endpoint", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await proxy(new NextRequest("https://sendflier.tech/api-docs"));
    expect(response.status).toBe(200);
    expect(rateLimit).not.toHaveBeenCalled();
  });
});
