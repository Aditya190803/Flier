import type { z } from "zod";
import { reviewCampaign } from "@/lib/email/preflight";
import type { scheduledCampaignSchema } from "@/lib/validation";
import { findSuppressedRecipients } from "@/lib/services/unsubscribe-service";

export type CampaignSnapshot = z.infer<typeof scheduledCampaignSchema>;
export async function checkCampaignEligibility(data: CampaignSnapshot, userEmail: string) {
  const suppressed = data.is_marketing
    ? await findSuppressedRecipients(userEmail, data.recipients)
    : [];
  return reviewCampaign(
    {
      subject: data.subject,
      content: data.content,
      recipients: data.recipients,
      recipientFields: Object.fromEntries(
        (data.csv_data || []).map((row) => [
          (
            Object.entries(row).find(([key]) => key.toLowerCase() === "email")?.[1] || ""
          ).toLowerCase(),
          row,
        ]),
      ),
      attachments: (data.attachments || []).map((attachment) => ({
        name: attachment.fileName,
        data: "appwrite",
        appwriteFileId: attachment.appwrite_file_id || attachment.fileUrl,
        fileSize: attachment.fileSize,
      })),
      personalizedAttachmentColumn: data.has_personalized_attachments
        ? data.personalized_attachment_column
        : undefined,
    },
    suppressed,
  );
}
