import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { requireSession, createScheduledCampaign, hasUsableRefreshToken, assertEmailQuota } =
  vi.hoisted(() => ({
    requireSession: vi.fn(),
    createScheduledCampaign: vi.fn(),
    hasUsableRefreshToken: vi.fn(),
    assertEmailQuota: vi.fn(),
  }));

vi.mock("@/lib/billing", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  assertEmailQuota,
}));

vi.mock("@/lib/api-auth", () => ({
  requireSession,
  isAuthed: (value: unknown) => Boolean(value && typeof value === "object" && "email" in value),
}));

vi.mock("@/lib/services/oauth-token-store", () => ({
  hasUsableRefreshToken,
}));

vi.mock("@/lib/services/scheduled-campaign-store", () => ({
  createScheduledCampaign,
  deleteScheduledCampaign: vi.fn(),
  getScheduledCampaign: vi.fn(),
  isScheduledSendingConfigured: () => true,
  listScheduledCampaignsForUser: vi.fn(),
  updateScheduledCampaign: vi.fn(),
}));

vi.mock("@/lib/services/unsubscribe-service", () => ({
  findSuppressedRecipients: vi.fn().mockResolvedValue([]),
}));

import { POST } from "@/app/api/scheduled-campaigns/route";
import { PlanLimitError } from "@/lib/billing";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/scheduled-campaigns", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody() {
  return {
    subject: "Product update",
    content: "Hello",
    recipients: ["reader@example.com"],
    scheduled_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    timezone: "UTC",
  };
}

describe("POST /api/scheduled-campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue({ email: "owner@example.com" });
    hasUsableRefreshToken.mockResolvedValue(true);
    assertEmailQuota.mockResolvedValue({});
    createScheduledCampaign.mockImplementation((data) =>
      Promise.resolve({
        $id: "scheduled-1",
        campaign_id: "scheduled-1",
        status: "scheduled",
        sent: 0,
        failed: 0,
        attempts: 0,
        attachments: [],
        csv_data: [],
        cc: [],
        bcc: [],
        ...data,
        scheduled_at: data.scheduledAt.toISOString(),
        user_email: data.userEmail,
      }),
    );
  });

  it("requires a stored Google refresh token", async () => {
    hasUsableRefreshToken.mockResolvedValue(false);

    const response = await POST(request(validBody()) as never);

    expect(response.status).toBe(412);
    await expect(response.json()).resolves.toMatchObject({
      code: "REAUTH_REQUIRED",
    });
    expect(createScheduledCampaign).not.toHaveBeenCalled();
  });

  it("rejects a send time inside the lead window", async () => {
    const response = await POST(
      request({
        ...validBody(),
        scheduled_at: new Date(Date.now() + 10_000).toISOString(),
      }) as never,
    );

    expect(response.status).toBe(400);
    expect(createScheduledCampaign).not.toHaveBeenCalled();
  });

  it("stores a server-owned campaign snapshot", async () => {
    const response = await POST(request(validBody()) as never);

    expect(response.status).toBe(201);
    expect(createScheduledCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: "owner@example.com",
        recipients: ["reader@example.com"],
        trackingEnabled: true,
      }),
    );
  });
});

it("queues Send now without the future lead window", async () => {
  const response = await POST(
    request({
      ...validBody(),
      send_now: true,
      scheduled_at: new Date().toISOString(),
      request_id: "878f5034-e464-4df0-b38e-cecebc572e80",
    }) as never,
  );
  expect(response.status).toBe(201);
  expect(createScheduledCampaign).toHaveBeenCalledWith(
    expect.objectContaining({
      requestId: "878f5034-e464-4df0-b38e-cecebc572e80",
    }),
  );
});
it("rejects unresolved personalization at the queue boundary", async () => {
  const response = await POST(request({ ...validBody(), subject: "Hello {{name}}" }) as never);
  expect(response.status).toBe(400);
});
it("refuses Send now when the campaign exceeds today's plan quota", async () => {
  assertEmailQuota.mockRejectedValueOnce(new PlanLimitError("Daily email limit reached"));
  const response = await POST(
    request({ ...validBody(), send_now: true, scheduled_at: new Date().toISOString() }) as never,
  );
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ message: "Daily email limit reached" });
  expect(assertEmailQuota).toHaveBeenCalledWith("owner@example.com", 1);
  expect(createScheduledCampaign).not.toHaveBeenCalled();
});
