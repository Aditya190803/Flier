import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireSession, createDocument, hasUsableRefreshToken } = vi.hoisted(
  () => ({
    requireSession: vi.fn(),
    createDocument: vi.fn(),
    hasUsableRefreshToken: vi.fn(),
  }),
);

vi.mock("@/lib/api-auth", () => ({
  requireSession,
  isAuthed: (value: unknown) =>
    Boolean(value && typeof value === "object" && "email" in value),
}));

vi.mock("@/lib/appwrite-server", () => ({
  databases: {
    createDocument,
    listDocuments: vi.fn(),
    deleteDocument: vi.fn(),
  },
  config: {
    databaseId: "test-db",
    scheduledCampaignsCollectionId: "scheduled_campaigns",
  },
  Query: {
    equal: vi.fn(),
    orderDesc: vi.fn(),
    limit: vi.fn(),
  },
  ID: { unique: () => "scheduled-1" },
}));

vi.mock("@/lib/services/oauth-token-store", () => ({
  hasUsableRefreshToken,
}));

vi.mock("@/lib/services/scheduled-campaign-store", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/services/scheduled-campaign-store")
  >("@/lib/services/scheduled-campaign-store");
  return {
    ...actual,
    getScheduledCampaign: vi.fn(),
    isScheduledSendingConfigured: () => true,
    updateScheduledCampaign: vi.fn(),
  };
});

import { POST } from "@/app/api/appwrite/scheduled-campaigns/route";

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/appwrite/scheduled-campaigns", {
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

describe("POST /api/appwrite/scheduled-campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue({ email: "owner@example.com" });
    hasUsableRefreshToken.mockResolvedValue(true);
    createDocument.mockImplementation((_databaseId, _collectionId, id, data) =>
      Promise.resolve({ $id: id, ...data }),
    );
  });

  it("requires a stored Google refresh token", async () => {
    hasUsableRefreshToken.mockResolvedValue(false);

    const response = await POST(request(validBody()) as never);

    expect(response.status).toBe(412);
    await expect(response.json()).resolves.toMatchObject({
      code: "REAUTH_REQUIRED",
    });
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("rejects a send time inside the lead window", async () => {
    const response = await POST(
      request({
        ...validBody(),
        scheduled_at: new Date(Date.now() + 10_000).toISOString(),
      }) as never,
    );

    expect(response.status).toBe(400);
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("stores a server-owned campaign snapshot", async () => {
    const response = await POST(request(validBody()) as never);

    expect(response.status).toBe(201);
    expect(createDocument).toHaveBeenCalledWith(
      "test-db",
      "scheduled_campaigns",
      "scheduled-1",
      expect.objectContaining({
        user_email: "owner@example.com",
        status: "scheduled",
        recipients: JSON.stringify(["reader@example.com"]),
      }),
    );
  });
});
