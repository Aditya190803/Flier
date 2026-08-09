/**
 * Scheduled Campaign Store
 *
 * Serialization and document helpers shared by the scheduled-campaign CRUD
 * route and the cron worker. Appwrite has no JSON column type, so arrays and
 * objects are stored as JSON strings and normalized back into real values
 * here — keeping every reader honest about the same shape.
 *
 * @module services/scheduled-campaign-store
 */

import { databases, config, Query } from "@/lib/appwrite-server";
import { SCHEDULED_STATUS, type ScheduledStatus } from "@/lib/constants";
import type { AttachmentData } from "@/lib/email/attachment-manager";

/** Attachment as persisted on the document (already uploaded to Appwrite). */
export interface StoredAttachment {
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  appwrite_file_id?: string;
}

/** A scheduled campaign with all JSON columns parsed. */
export interface ScheduledCampaignRecord {
  $id: string;
  subject: string;
  content: string;
  recipients: string[];
  scheduled_at: string;
  timezone?: string;
  status: ScheduledStatus;
  user_email: string;
  campaign_id: string;
  attachments: StoredAttachment[];
  csv_data: Record<string, string>[];
  cc: string[];
  bcc: string[];
  tracking_enabled: boolean;
  is_marketing: boolean;
  has_personalized_attachments: boolean;
  personalized_attachment_column?: string;
  sent: number;
  failed: number;
  attempts: number;
  locked_at?: string;
  last_error?: string;
  sent_at?: string;
  created_at?: string;
  updated_at?: string;
}

export function isScheduledSendingConfigured(): boolean {
  return Boolean(config.databaseId && config.scheduledCampaignsCollectionId);
}

function parseJsonArray(value: unknown): unknown[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseStringArray(value: unknown): string[] {
  return parseJsonArray(value).filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
}

/**
 * Cc and Bcc share one attribute (`cc`) as `{"cc":[],"bcc":[]}`, matching the
 * convention drafts already use to stay inside Appwrite's per-collection
 * attribute budget.
 */
export function parseCcBcc(value: unknown): { cc: string[]; bcc: string[] } {
  if (!value) {
    return { cc: [], bcc: [] };
  }
  if (Array.isArray(value)) {
    return { cc: parseStringArray(value), bcc: [] };
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return { cc: parseStringArray(parsed), bcc: [] };
      }
      if (parsed && typeof parsed === "object") {
        return {
          cc: parseStringArray((parsed as { cc?: unknown }).cc),
          bcc: parseStringArray((parsed as { bcc?: unknown }).bcc),
        };
      }
    } catch {
      return { cc: [], bcc: [] };
    }
  }
  return { cc: [], bcc: [] };
}

export function serializeCcBcc(cc?: string[], bcc?: string[]): string | null {
  const ccList = parseStringArray(cc);
  const bccList = parseStringArray(bcc);
  if (!ccList.length && !bccList.length) {
    return null;
  }
  return JSON.stringify({ cc: ccList, bcc: bccList });
}

/** Normalize a raw Appwrite document into a {@link ScheduledCampaignRecord}. */
export function mapScheduledCampaign(
  doc: Record<string, any>,
): ScheduledCampaignRecord {
  const { cc, bcc } = parseCcBcc(doc.cc);

  return {
    $id: doc.$id,
    subject: doc.subject || "",
    content: doc.content || "",
    recipients: parseStringArray(doc.recipients),
    scheduled_at: doc.scheduled_at,
    timezone: doc.timezone || undefined,
    status: (doc.status as ScheduledStatus) || SCHEDULED_STATUS.SCHEDULED,
    user_email: doc.user_email || "",
    campaign_id: doc.campaign_id || doc.$id,
    attachments: parseJsonArray(doc.attachments) as StoredAttachment[],
    csv_data: parseJsonArray(doc.csv_data) as Record<string, string>[],
    cc,
    bcc,
    tracking_enabled: doc.tracking_enabled !== false,
    is_marketing: doc.is_marketing === true,
    has_personalized_attachments: doc.has_personalized_attachments === true,
    personalized_attachment_column:
      doc.personalized_attachment_column || undefined,
    sent: doc.sent || 0,
    failed: doc.failed || 0,
    attempts: doc.attempts || 0,
    locked_at: doc.locked_at || undefined,
    last_error: doc.last_error || undefined,
    sent_at: doc.sent_at || undefined,
    created_at: doc.created_at || doc.$createdAt,
    updated_at: doc.updated_at || undefined,
  };
}

/**
 * Convert stored attachment references into the shape
 * `preResolveAttachments` expects. The `data: "appwrite"` sentinel tells the
 * resolver to fetch bytes from storage rather than decode an inline payload —
 * the same mapping `/api/send-draft` uses.
 */
export function toAttachmentData(
  attachments: StoredAttachment[],
): AttachmentData[] {
  return attachments
    .filter((a) => a.appwrite_file_id || a.fileUrl)
    .map((a) => ({
      name: a.fileName,
      type: "application/octet-stream",
      data: "appwrite",
      appwriteUrl: a.fileUrl,
      appwriteFileId: a.appwrite_file_id,
    }));
}

/** Fetch one scheduled campaign by document id. */
export async function getScheduledCampaign(
  id: string,
): Promise<ScheduledCampaignRecord | null> {
  if (!isScheduledSendingConfigured()) {
    return null;
  }
  try {
    const doc = await databases.getDocument(
      config.databaseId,
      config.scheduledCampaignsCollectionId,
      id,
    );
    return mapScheduledCampaign(doc as unknown as Record<string, any>);
  } catch {
    return null;
  }
}

/** Patch a scheduled campaign, always refreshing `updated_at`. */
export async function updateScheduledCampaign(
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!isScheduledSendingConfigured()) {
    return;
  }
  await databases.updateDocument(
    config.databaseId,
    config.scheduledCampaignsCollectionId,
    id,
    { ...data, updated_at: new Date().toISOString() },
  );
}

/**
 * Campaigns whose send time has arrived and that no worker currently holds.
 *
 * Ordered oldest-first so a backlog drains in the order users asked for,
 * rather than newest-wins.
 */
export async function listDueCampaigns(
  now: Date,
  limit: number,
): Promise<ScheduledCampaignRecord[]> {
  if (!isScheduledSendingConfigured()) {
    return [];
  }

  const response = await databases.listDocuments(
    config.databaseId,
    config.scheduledCampaignsCollectionId,
    [
      Query.equal("status", SCHEDULED_STATUS.SCHEDULED),
      Query.lessThanEqual("scheduled_at", now.toISOString()),
      Query.orderAsc("scheduled_at"),
      Query.limit(limit),
    ],
  );

  return (response.documents as unknown as Record<string, any>[]).map(
    mapScheduledCampaign,
  );
}

/**
 * Campaigns stuck in `processing` past their lease.
 *
 * A worker that dies mid-send (deploy, OOM, function timeout) leaves its row
 * claimed forever otherwise. Persisted recipient progress is skipped when the
 * campaign resumes.
 */
export async function reclaimStaleCampaigns(
  staleBefore: Date,
  limit: number,
): Promise<number> {
  if (!isScheduledSendingConfigured()) {
    return 0;
  }

  const response = await databases.listDocuments(
    config.databaseId,
    config.scheduledCampaignsCollectionId,
    [
      Query.equal("status", SCHEDULED_STATUS.PROCESSING),
      Query.lessThan("locked_at", staleBefore.toISOString()),
      Query.limit(limit),
    ],
  );

  let reclaimed = 0;
  for (const doc of response.documents) {
    try {
      await updateScheduledCampaign(doc.$id, {
        status: SCHEDULED_STATUS.SCHEDULED,
        locked_at: null,
      });
      reclaimed++;
    } catch {
      // Another worker got there first — nothing to do.
    }
  }

  return reclaimed;
}
