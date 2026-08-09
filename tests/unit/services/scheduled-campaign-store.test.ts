import { describe, expect, it } from "vitest";

import {
  mapScheduledCampaign,
  parseCcBcc,
  serializeCcBcc,
  toAttachmentData,
} from "@/lib/services/scheduled-campaign-store";

describe("scheduled campaign storage", () => {
  it("round-trips cc and bcc through the shared Appwrite field", () => {
    const stored = serializeCcBcc(["cc@example.com"], ["bcc@example.com"]);

    expect(parseCcBcc(stored)).toEqual({
      cc: ["cc@example.com"],
      bcc: ["bcc@example.com"],
    });
  });

  it("normalizes JSON fields from an Appwrite document", () => {
    const campaign = mapScheduledCampaign({
      $id: "scheduled-1",
      subject: "Hello",
      content: "Hi {{name}}",
      recipients: JSON.stringify(["reader@example.com"]),
      csv_data: JSON.stringify([
        { email: "reader@example.com", name: "Reader" },
      ]),
      attachments: JSON.stringify([
        { fileName: "report.pdf", appwrite_file_id: "file-1" },
      ]),
      cc: JSON.stringify({
        cc: ["cc@example.com"],
        bcc: ["bcc@example.com"],
      }),
      scheduled_at: "2030-01-01T09:00:00.000Z",
      status: "scheduled",
      user_email: "owner@example.com",
    });

    expect(campaign.recipients).toEqual(["reader@example.com"]);
    expect(campaign.csv_data[0]?.name).toBe("Reader");
    expect(campaign.attachments[0]?.appwrite_file_id).toBe("file-1");
    expect(campaign.cc).toEqual(["cc@example.com"]);
    expect(campaign.bcc).toEqual(["bcc@example.com"]);
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
