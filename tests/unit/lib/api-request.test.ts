import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { apiRequest } from "@/lib/appwrite/api-request";
import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "@/lib/constants";

describe("apiRequest headers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = `${CSRF_TOKEN_NAME}=; Max-Age=0; path=/`;
  });

  const headerInputs: [string, HeadersInit][] = [
    ["object", { "X-Custom": "value", "content-type": "text/plain" }],
    ["Headers", new Headers({ "X-Custom": "value", "content-type": "text/plain" })],
    [
      "tuples",
      [
        ["X-Custom", "value"],
        ["content-type", "text/plain"],
      ],
    ],
  ];

  it.each(headerInputs)("preserves caller headers supplied as %s", async (_, headers) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = `${CSRF_TOKEN_NAME}=cookie-token; path=/`;

    await expect(apiRequest("/api/example", { headers })).resolves.toEqual({ success: true });

    const sentHeaders = fetchMock.mock.calls[0][1].headers as Headers;
    expect(sentHeaders.get("X-Custom")).toBe("value");
    expect(sentHeaders.get("Content-Type")).toBe("text/plain");
    expect(sentHeaders.get(CSRF_HEADER_NAME)).toBe("cookie-token");
  });

  it("defaults to JSON and respects an explicit CSRF header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = `${CSRF_TOKEN_NAME}=cookie-token; path=/`;

    await apiRequest("/api/example", { headers: { [CSRF_HEADER_NAME]: "caller-token" } });

    const sentHeaders = fetchMock.mock.calls[0][1].headers as Headers;
    expect(sentHeaders.get("Content-Type")).toBe("application/json");
    expect(sentHeaders.get(CSRF_HEADER_NAME)).toBe("caller-token");
  });

  it("shows the readable reason for plan limit responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: "PLAN_LIMIT", message: "Daily email limit reached" }),
      }),
    );

    await expect(apiRequest("/api/example")).rejects.toThrow("Daily email limit reached");
  });
});
