import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { requireSession, createScheduledCampaign, hasUsableRefreshToken } =
  vi.hoisted(() => ({
    requireSession: vi.fn(),
    createScheduledCampaign: vi.fn(),
    hasUsableRefreshToken: vi.fn(),
  }));

vi.mock("@/lib/api-auth", () => ({
  requireSession,
  isAuthed: (value: unknown) =>
    Boolean(value && typeof value === "object" && "email" in value),
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

import { POST } from "@/app/api/scheduled-campaigns/route";

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
