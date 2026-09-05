import { describe, it, expect, beforeAll } from "vite-plus/test";

import { verifyTrackingToken } from "@/lib/tracking-token";

import { injectTracking } from "../tracking";

beforeAll(() => {
  process.env.NEXTAUTH_SECRET =
    process.env.NEXTAUTH_SECRET || "test-auth-secret";
  process.env.TRACKING_TOKEN_SECRET =
    process.env.TRACKING_TOKEN_SECRET || "test-tracking-secret";
});

describe("injectTracking", () => {
  it("embeds signed open pixel and unsubscribe links", () => {
    const html =
      '<html><body><p>Hi</p><a href="https://example.com">x</a></body></html>';
    const out = injectTracking(
      html,
      {
        campaignId: "camp-1",
        recipientEmail: "user@example.com",
        userEmail: "me@example.com",
        trackingEnabled: true,
      },
      "https://app.example",
    );

    expect(out).toContain("/api/track/open?t=");
    expect(out).toContain("/api/track/click?t=");
    expect(out).toContain("/api/unsubscribe?t=");
    expect(out).not.toContain("e=user%40example.com");

    const openMatch = out.match(/\/api\/track\/open\?t=([^"&]+)/);
    expect(openMatch).toBeTruthy();
    const openPayload = verifyTrackingToken(
      decodeURIComponent(openMatch![1]),
      "open",
    );
    expect(openPayload?.campaignId).toBe("camp-1");
    expect(openPayload?.recipientEmail).toBe("user@example.com");
  });

  it("skips marketing unsubscribe footer for transactional", () => {
    const html = "<p>Receipt</p>";
    const out = injectTracking(
      html,
      {
        campaignId: "c",
        recipientEmail: "a@b.com",
        userEmail: "me@example.com",
        isTransactional: true,
        trackingEnabled: false,
      },
      "https://app.example",
    );
    expect(out).not.toContain("/api/unsubscribe");
    expect(out).not.toContain("/api/track/open");
  });
});
