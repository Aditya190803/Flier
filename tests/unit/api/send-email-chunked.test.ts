/**
 * Unit tests for chunked/resumable sending in the Send Email API route
 * (app/api/send-email/route.ts). Complements tests/unit/api/send-email.test.ts
 * which covers lower-level pieces; these exercise the route handler itself
 * with the Appwrite/EmailService layers mocked.
 */
import { NextRequest } from "next/server";

import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

import { POST } from "@/app/api/send-email/route";

vi.mock("@/lib/api-auth", () => ({
  requireSession: vi.fn(async () => ({
    email: "sender@example.com",
    accessToken: "valid-token",
  })),
  isAuthed: (result: unknown) => !(result as any)?.status,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(async () => null),
  rateLimitUserEmailAsync: vi.fn(async () => null),
  RATE_LIMITS: { sendEmail: { windowMs: 60000, maxRequests: 10 } },
}));

vi.mock("@/lib/services/unsubscribe-service", () => ({
  checkUserUnsubscribed: vi.fn(async () => false),
}));

const sendPersonalizedBatch = vi.fn();
vi.mock("@/lib/services/email-service", () => ({
  // Must be constructible (route does `new EmailService(...)`) — an arrow
  // function passed to vi.fn().mockImplementation() cannot be `new`'d.
  EmailService: vi.fn().mockImplementation(function (this: any) {
    this.sendPersonalizedBatch = sendPersonalizedBatch;
  }),
}));

const loadCampaignSendState = vi.fn();
const persistCampaignSendState = vi.fn();
vi.mock("@/lib/services/campaign-send-state", () => ({
  loadCampaignSendState: (...args: unknown[]) => loadCampaignSendState(...args),
  persistCampaignSendState: (...args: unknown[]) =>
    persistCampaignSendState(...args),
}));

vi.mock("@/lib/logger", async () => {
  const { createMockLoggerModule, createSpyLogger } =
    await import("@/tests/helpers/mockLoggerModule");
  return createMockLoggerModule({
    apiLogger: createSpyLogger(),
  });
});

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/send-email", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const basePayload = {
  campaignId: "campaign_test_123",
  trackingEnabled: true,
  personalizedEmails: [
    {
      to: "a@example.com",
      subject: "Hi",
      message: "Body",
      originalRowData: {},
    },
    {
      to: "b@example.com",
      subject: "Hi",
      message: "Body",
      originalRowData: {},
    },
    {
      to: "c@example.com",
      subject: "Hi",
      message: "Body",
      originalRowData: {},
    },
  ],
};

describe("POST /api/send-email — chunked sending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistCampaignSendState.mockResolvedValue(undefined);
  });

  it("reports done: true and includes all results when the whole campaign fits in one chunk", async () => {
    loadCampaignSendState.mockResolvedValue({
      docId: "campaign_test_123",
      exists: false,
      processedEmails: new Set(),
      results: [],
      sent: 0,
      failed: 0,
      status: "sending",
    });

    sendPersonalizedBatch.mockResolvedValue({
      total: 3,
      sent: 3,
      failed: 0,
      skipped: 0,
      results: [
        { email: "a@example.com", status: "success" },
        { email: "b@example.com", status: "success" },
        { email: "c@example.com", status: "success" },
      ],
      done: true,
    });

    const response = await POST(makeRequest(basePayload));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.done).toBe(true);
    expect(data.remaining).toBe(0);
    expect(data.summary.sent).toBe(3);
    expect(data.results).toHaveLength(3);
    expect(persistCampaignSendState).toHaveBeenCalledWith(
      expect.objectContaining({ done: true, sentDelta: 3, failedDelta: 0 }),
    );
  });

  it("reports done: false with the remaining count when the service times out mid-chunk", async () => {
    loadCampaignSendState.mockResolvedValue({
      docId: "campaign_test_123",
      exists: false,
      processedEmails: new Set(),
      results: [],
      sent: 0,
      failed: 0,
      status: "sending",
    });

    sendPersonalizedBatch.mockResolvedValue({
      total: 3,
      sent: 1,
      failed: 0,
      skipped: 0,
      results: [{ email: "a@example.com", status: "success" }],
      done: false,
    });

    const response = await POST(makeRequest(basePayload));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.done).toBe(false);
    expect(data.remaining).toBe(2);
    expect(data.summary.sent).toBe(1);
    expect(persistCampaignSendState).toHaveBeenCalledWith(
      expect.objectContaining({ done: false }),
    );
  });

  it("skips already-processed recipients on resume (idempotency)", async () => {
    loadCampaignSendState.mockResolvedValue({
      docId: "campaign_test_123",
      exists: true,
      processedEmails: new Set(["a@example.com"]),
      results: [{ email: "a@example.com", status: "success" }],
      sent: 1,
      failed: 0,
      status: "partial",
    });

    sendPersonalizedBatch.mockResolvedValue({
      total: 2,
      sent: 2,
      failed: 0,
      skipped: 0,
      results: [
        { email: "b@example.com", status: "success" },
        { email: "c@example.com", status: "success" },
      ],
      done: true,
    });

    const response = await POST(makeRequest(basePayload));
    const data = await response.json();

    // Only the two not-yet-processed recipients should have been handed to
    // the email service.
    const [sentEmails] = sendPersonalizedBatch.mock.calls[0];
    expect(sentEmails.map((e: { to: string }) => e.to)).toEqual([
      "b@example.com",
      "c@example.com",
    ]);

    expect(data.done).toBe(true);
    expect(data.summary.sent).toBe(3); // 1 previously + 2 this chunk
    expect(data.summary.total).toBe(3);
  });

  it("short-circuits with a cached completed summary when everything was already processed", async () => {
    loadCampaignSendState.mockResolvedValue({
      docId: "campaign_test_123",
      exists: true,
      processedEmails: new Set([
        "a@example.com",
        "b@example.com",
        "c@example.com",
      ]),
      results: [
        { email: "a@example.com", status: "success" },
        { email: "b@example.com", status: "success" },
        { email: "c@example.com", status: "success" },
      ],
      sent: 3,
      failed: 0,
      status: "completed",
    });

    const response = await POST(makeRequest(basePayload));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.done).toBe(true);
    expect(data.remaining).toBe(0);
    expect(sendPersonalizedBatch).not.toHaveBeenCalled();
    expect(persistCampaignSendState).not.toHaveBeenCalled();
  });
});
