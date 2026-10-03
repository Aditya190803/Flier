import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { requireSession, sendSingle, findSuppressedRecipients } = vi.hoisted(() => ({
  requireSession: vi.fn(),
  sendSingle: vi.fn(),
  findSuppressedRecipients: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({
  requireSession,
  isAuthed: (value: unknown) => !(value instanceof NextResponse),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(async () => null),
  RATE_LIMITS: { sendEmail: {} },
}));
vi.mock("@/lib/services/email-service", () => ({
  EmailService: class {
    sendSingle = sendSingle;
  },
}));
vi.mock("@/lib/services/unsubscribe-service", () => ({ findSuppressedRecipients }));

import { POST as review } from "@/app/api/campaign-preflight/route";
import { POST as sendTest } from "@/app/api/send-test-email/route";

const request = (body: unknown) =>
  new Request("http://localhost/api/test", { method: "POST", body: JSON.stringify(body) }) as never;

describe("sending confidence APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue({ email: "owner@example.com", accessToken: "test-token" });
    sendSingle.mockResolvedValue({ status: "success" });
    findSuppressedRecipients.mockResolvedValue([]);
  });
  it("sends a test only to the signed-in user, preserving sample personalization and excluding campaign tracking", async () => {
    const response = await sendTest(
      request({
        to: "other@example.com",
        subject: "Hello",
        message: "Welcome",
        originalRowData: { email: "sample@example.com", name: "Ada" },
        cc: ["external@example.com"],
        campaignId: "campaign-1",
        trackingEnabled: true,
      }),
    );
    expect(response.status).toBe(200);
    expect(sendSingle).toHaveBeenCalledWith(
      {
        email: "owner@example.com",
        customFields: { email: "sample@example.com", name: "Ada" },
        personalizedAttachment: undefined,
      },
      { subject: "Hello", body: "Welcome" },
      undefined,
      undefined,
      true,
    );
  });
  it("requires authentication before a test send", async () => {
    requireSession.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    expect((await sendTest(request({}))).status).toBe(401);
    expect(sendSingle).not.toHaveBeenCalled();
  });
  it("stops a marketing review when suppression data is unavailable", async () => {
    findSuppressedRecipients.mockRejectedValue(new Error("Unavailable"));
    const response = await review(
      request({
        subject: "Hello",
        content: "Welcome",
        recipients: ["a@example.com"],
        recipientFields: {},
        attachments: [],
        isMarketing: true,
      }),
    );
    expect(response.status).toBe(503);
    expect(findSuppressedRecipients).toHaveBeenCalledWith("owner@example.com", ["a@example.com"]);
  });
  it("does not consult marketing suppression for transactional campaigns", async () => {
    const response = await review(
      request({
        subject: "Hello",
        content: "Welcome",
        recipients: ["a@example.com"],
        recipientFields: {},
        attachments: [],
        isMarketing: false,
      }),
    );
    expect(response.status).toBe(200);
    expect(findSuppressedRecipients).not.toHaveBeenCalled();
  });
});
