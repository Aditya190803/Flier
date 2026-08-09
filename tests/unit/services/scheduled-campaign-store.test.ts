import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbQuery } = vi.hoisted(() => ({ dbQuery: vi.fn() }));

vi.mock("@/lib/db", () => ({
  dbQuery,
  isDatabaseConfigured: () => true,
}));

import {
  claimNextDueCampaign,
  mapScheduledCampaignRow,
  toAttachmentData,
  updateScheduledCampaign,
} from "@/lib/services/scheduled-campaign-store";

function row() {
  return {
    id: "scheduled-1",
    subject: "Hello",
    content: "Hi {{name}}",
    recipients: ["reader@example.com"],
    csv_data: [{ email: "reader@example.com", name: "Reader" }],
    attachments: [{ fileName: "report.pdf", appwrite_file_id: "file-1" }],
    cc: ["cc@example.com"],
    bcc: ["bcc@example.com"],
    scheduled_at: new Date("2030-01-01T09:00:00.000Z"),
    timezone: "UTC",
    status: "scheduled" as const,
    user_email: "owner@example.com",
    campaign_id: "scheduled-1",
    tracking_enabled: true,
    is_marketing: false,
    has_personalized_attachments: false,
    personalized_attachment_column: null,
    sent: 0,
    failed: 0,
    attempts: 1,
    locked_at: null,
    last_error: null,
    sent_at: null,
    created_at: new Date("2029-12-01T09:00:00.000Z"),
    updated_at: new Date("2029-12-01T09:00:00.000Z"),
  };
}

describe("scheduled campaign storage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes Postgres JSON and timestamp fields", () => {
    const campaign = mapScheduledCampaignRow(row());

    expect(campaign.$id).toBe("scheduled-1");
    expect(campaign.scheduled_at).toBe("2030-01-01T09:00:00.000Z");
    expect(campaign.csv_data[0]?.name).toBe("Reader");
    expect(campaign.attachments[0]?.appwrite_file_id).toBe("file-1");
    expect(campaign.cc).toEqual(["cc@example.com"]);
    expect(campaign.bcc).toEqual(["bcc@example.com"]);
  });

  it("claims due work with a row lock", async () => {
    dbQuery.mockResolvedValue({ rows: [row()], rowCount: 1 });

    const campaign = await claimNextDueCampaign(
      new Date("2030-01-01T09:00:00.000Z"),
    );

    expect(campaign?.$id).toBe("scheduled-1");
    expect(dbQuery.mock.calls[0]?.[0]).toContain("FOR UPDATE SKIP LOCKED");
    expect(dbQuery.mock.calls[0]?.[0]).toContain("attempts + 1");
  });

  it("guards user edits against a concurrent worker claim", async () => {
    dbQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await expect(
      updateScheduledCampaign(
        "scheduled-1",
        { status: "cancelled" },
        "scheduled",
      ),
    ).resolves.toBe(false);

    expect(dbQuery.mock.calls[0]?.[0]).toContain("AND status = $3");
    expect(dbQuery.mock.calls[0]?.[1]).toEqual([
      "scheduled-1",
      "cancelled",
      "scheduled",
    ]);
  });

  it("maps stored attachments to deferred Appwrite downloads", () => {
    expect(
      toAttachmentData([
        { fileName: "report.pdf", appwrite_file_id: "file-1" },
        { fileName: "missing.pdf" },
      ]),
    ).toEqual([
      {
        name: "report.pdf",
        type: "application/octet-stream",
        data: "appwrite",
        appwriteUrl: undefined,
        appwriteFileId: "file-1",
      },
    ]);
  });
});
