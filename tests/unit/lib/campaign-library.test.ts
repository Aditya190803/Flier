import { expect, it } from "vite-plus/test";
import { buildCampaignLibrary, filterCampaignLibrary } from "@/lib/campaign-library";

it("deduplicates queue history and preserves snapshot fields when copying", () => {
  const queue = {
    $id: "job",
    campaign_id: "job",
    subject: "Queued",
    content: "Message",
    status: "sent",
    scheduled_at: "2026-10-03T00:00:00Z",
    recipients: ["ada@example.com"],
    csv_data: [{ email: "ada@example.com", name: "Ada" }],
    attachments: [{ fileName: "file.pdf", appwrite_file_id: "file" }],
    cc: [],
    bcc: [],
  };
  const library = buildCampaignLibrary(
    [],
    [queue as never],
    [{ ...queue, created_at: queue.scheduled_at } as never],
  );
  expect(library).toHaveLength(1);
  expect(library[0]).toMatchObject({
    csv_data: queue.csv_data,
    attachments: [{ appwrite_file_id: "file" }],
  });
  expect(filterCampaignLibrary(library, "ADA", "sent", "2026-10-02", "2026-10-04")).toHaveLength(1);
  expect(filterCampaignLibrary(library, "", "draft", "", "")).toHaveLength(0);
});
