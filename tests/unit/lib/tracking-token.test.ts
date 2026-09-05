import { describe, it, expect, beforeAll } from "vite-plus/test";

import { signTrackingToken, verifyTrackingToken } from "@/lib/tracking-token";

beforeAll(() => {
  process.env.NEXTAUTH_SECRET =
    process.env.NEXTAUTH_SECRET || "test-auth-secret";
  process.env.TRACKING_TOKEN_SECRET =
    process.env.TRACKING_TOKEN_SECRET || "test-tracking-secret";
});

describe("tracking tokens", () => {
  it("round-trips a signed payload", () => {
    const token = signTrackingToken({
      campaignId: "c1",
      recipientEmail: "r@example.com",
      userEmail: "sender@example.com",
      purpose: "open",
    });

    const payload = verifyTrackingToken(token, "open");
    expect(payload).not.toBeNull();
    expect(payload?.campaignId).toBe("c1");
    expect(payload?.recipientEmail).toBe("r@example.com");
    expect(payload?.userEmail).toBe("sender@example.com");
  });

  it("rejects tampered tokens", () => {
    const token = signTrackingToken({
      campaignId: "c1",
      recipientEmail: "r@example.com",
      userEmail: "sender@example.com",
      purpose: "click",
      targetUrl: "https://example.com",
    });
    const [body] = token.split(".");
    expect(verifyTrackingToken(`${body}.not-a-real-sig`, "click")).toBeNull();
  });

  it("rejects wrong purpose", () => {
    const token = signTrackingToken({
      campaignId: "c1",
      recipientEmail: "r@example.com",
      userEmail: "sender@example.com",
      purpose: "open",
    });
    expect(verifyTrackingToken(token, "unsubscribe")).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = signTrackingToken({
      campaignId: "c1",
      recipientEmail: "r@example.com",
      userEmail: "sender@example.com",
      purpose: "unsubscribe",
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect(verifyTrackingToken(token, "unsubscribe")).toBeNull();
  });
});
