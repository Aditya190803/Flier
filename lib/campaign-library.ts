import type { DraftEmail, EmailCampaign } from "@/types/appwrite-client";
import type { ScheduledCampaign } from "@/types/scheduled-campaign";
import { parseRecipients } from "@/lib/utils/recipients";

export interface LibraryCampaign {
  id: string;
  source: "draft" | "queue" | "history";
  date: string;
  status: string;
  subject: string;
  content: string;
  recipients: string[];
  attachments: { fileName: string; fileUrl: string; fileSize: number; appwrite_file_id?: string }[];
  csv_data: Record<string, string>[];
  cc: string[];
  bcc: string[];
  has_personalized_attachments?: boolean;
  personalized_attachment_column?: string;
}

export function buildCampaignLibrary(
  drafts: DraftEmail[],
  queue: ScheduledCampaign[],
  history: EmailCampaign[],
): LibraryCampaign[] {
  const queuedIds = new Set(queue.map((item) => item.campaign_id));
  const sources = [
    ...drafts.map((item) => ({
      item,
      source: "draft" as const,
      date: item.saved_at,
      status: "draft",
    })),
    ...queue.map((item) => ({
      item,
      source: "queue" as const,
      date: item.created_at || item.scheduled_at,
      status: item.status,
    })),
    ...history
      .filter((item) => !queuedIds.has(item.$id))
      .map((item) => ({
        item,
        source: "history" as const,
        date: item.created_at,
        status:
          item.status === "completed"
            ? "sent"
            : item.status === "sending"
              ? "processing"
              : item.status,
      })),
  ];
  return sources
    .map(({ item, source, date, status }) => ({
      id: item.$id || "",
      source,
      date,
      status,
      subject: item.subject,
      content: item.content,
      recipients: parseRecipients(item.recipients),
      attachments: (item.attachments || []).map((attachment) => ({
        ...attachment,
        fileUrl: attachment.fileUrl || "",
        fileSize: attachment.fileSize || 0,
      })),
      csv_data: "csv_data" in item && Array.isArray(item.csv_data) ? item.csv_data : [],
      cc: "cc" in item ? item.cc || [] : [],
      bcc: "bcc" in item ? item.bcc || [] : [],
      has_personalized_attachments: item.has_personalized_attachments,
      personalized_attachment_column: item.personalized_attachment_column,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function filterCampaignLibrary(
  items: LibraryCampaign[],
  query: string,
  status: string,
  from: string,
  to: string,
) {
  const needle = query.trim().toLowerCase();
  const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
  const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
  return items.filter(
    (item) =>
      (status === "all" || item.status === status) &&
      (!needle || `${item.subject} ${item.recipients.join(" ")}`.toLowerCase().includes(needle)) &&
      new Date(item.date).getTime() >= start &&
      new Date(item.date).getTime() <= end,
  );
}
