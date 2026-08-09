import { randomUUID } from "node:crypto";

import { SCHEDULED_STATUS, type ScheduledStatus } from "@/lib/constants";
import { dbQuery, isDatabaseConfigured } from "@/lib/db";
import type { AttachmentData } from "@/lib/email/attachment-manager";
import type {
  ScheduledCampaign,
  StoredScheduledAttachment,
} from "@/types/scheduled-campaign";

import type { QueryResultRow } from "pg";

export type ScheduledCampaignRecord = ScheduledCampaign;
export type StoredAttachment = StoredScheduledAttachment;

type ScheduledCampaignRow = QueryResultRow & {
  id: string;
  subject: string;
  content: string;
  recipients: unknown;
  scheduled_at: Date | string;
  timezone: string | null;
  status: ScheduledStatus;
  user_email: string;
  campaign_id: string;
  attachments: unknown;
  csv_data: unknown;
  cc: unknown;
  bcc: unknown;
  tracking_enabled: boolean;
  is_marketing: boolean;
  has_personalized_attachments: boolean;
  personalized_attachment_column: string | null;
  sent: number;
  failed: number;
  attempts: number;
  locked_at: Date | string | null;
  last_error: string | null;
  sent_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export interface CreateScheduledCampaignInput {
  subject: string;
  content: string;
  recipients: string[];
  scheduledAt: Date;
  timezone?: string;
  userEmail: string;
  attachments?: StoredAttachment[];
  csvData?: Record<string, string>[];
  cc?: string[];
  bcc?: string[];
  trackingEnabled: boolean;
  isMarketing: boolean;
  hasPersonalizedAttachments: boolean;
  personalizedAttachmentColumn?: string;
}

export function isScheduledSendingConfigured(): boolean {
  return isDatabaseConfigured();
}

function arrayValue<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function iso(value: Date | string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

export function mapScheduledCampaignRow(
  row: ScheduledCampaignRow,
): ScheduledCampaignRecord {
  return {
    $id: row.id,
    subject: row.subject,
    content: row.content,
    recipients: arrayValue<string>(row.recipients),
    scheduled_at: iso(row.scheduled_at)!,
    timezone: row.timezone || undefined,
    status: row.status,
    user_email: row.user_email,
    campaign_id: row.campaign_id,
    attachments: arrayValue<StoredAttachment>(row.attachments),
    csv_data: arrayValue<Record<string, string>>(row.csv_data),
    cc: arrayValue<string>(row.cc),
    bcc: arrayValue<string>(row.bcc),
    tracking_enabled: row.tracking_enabled,
    is_marketing: row.is_marketing,
    has_personalized_attachments: row.has_personalized_attachments,
    personalized_attachment_column:
      row.personalized_attachment_column || undefined,
    sent: row.sent,
    failed: row.failed,
    attempts: row.attempts,
    locked_at: iso(row.locked_at),
    last_error: row.last_error || undefined,
    sent_at: iso(row.sent_at),
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
}

export function toAttachmentData(
  attachments: StoredAttachment[],
): AttachmentData[] {
  return attachments
    .filter((attachment) => attachment.appwrite_file_id || attachment.fileUrl)
    .map((attachment) => ({
      name: attachment.fileName,
      type: "application/octet-stream",
      data: "appwrite",
      appwriteUrl: attachment.fileUrl,
      appwriteFileId: attachment.appwrite_file_id,
    }));
}

export async function createScheduledCampaign(
  input: CreateScheduledCampaignInput,
): Promise<ScheduledCampaignRecord> {
  const id = randomUUID();
  const result = await dbQuery<ScheduledCampaignRow>(
    `INSERT INTO scheduled_campaigns (
      id, subject, content, recipients, scheduled_at, timezone, status,
      user_email, campaign_id, attachments, csv_data, cc, bcc,
      tracking_enabled, is_marketing, has_personalized_attachments,
      personalized_attachment_column
    ) VALUES (
      $1, $2, $3, $4::jsonb, $5, $6, $7, $8, $1, $9::jsonb,
      $10::jsonb, $11::jsonb, $12::jsonb, $13, $14, $15, $16
    ) RETURNING *`,
    [
      id,
      input.subject,
      input.content,
      JSON.stringify(input.recipients),
      input.scheduledAt,
      input.timezone || null,
      SCHEDULED_STATUS.SCHEDULED,
      input.userEmail,
      JSON.stringify(input.attachments || []),
      JSON.stringify(input.csvData || []),
      JSON.stringify(input.cc || []),
      JSON.stringify(input.bcc || []),
      input.trackingEnabled,
      input.isMarketing,
      input.hasPersonalizedAttachments,
      input.personalizedAttachmentColumn || null,
    ],
  );
  return mapScheduledCampaignRow(result.rows[0]);
}

export async function listScheduledCampaignsForUser(
  userEmail: string,
  limit = 100,
): Promise<ScheduledCampaignRecord[]> {
  const result = await dbQuery<ScheduledCampaignRow>(
    `SELECT * FROM scheduled_campaigns
     WHERE user_email = $1
     ORDER BY scheduled_at DESC
     LIMIT $2`,
    [userEmail, limit],
  );
  return result.rows.map(mapScheduledCampaignRow);
}

export async function getScheduledCampaign(
  id: string,
): Promise<ScheduledCampaignRecord | null> {
  if (!isScheduledSendingConfigured()) {
    return null;
  }
  const result = await dbQuery<ScheduledCampaignRow>(
    "SELECT * FROM scheduled_campaigns WHERE id = $1 LIMIT 1",
    [id],
  );
  return result.rows[0] ? mapScheduledCampaignRow(result.rows[0]) : null;
}

const UPDATE_COLUMNS = new Set([
  "scheduled_at",
  "timezone",
  "status",
  "sent",
  "failed",
  "attempts",
  "locked_at",
  "last_error",
  "sent_at",
]);

export async function updateScheduledCampaign(
  id: string,
  data: Record<string, unknown>,
  expectedStatus?: ScheduledStatus,
): Promise<boolean> {
  const entries = Object.entries(data).filter(([key]) =>
    UPDATE_COLUMNS.has(key),
  );
  if (!entries.length) {
    return false;
  }

  const assignments = entries.map(([key], index) => `${key} = $${index + 2}`);
  const values = [id, ...entries.map(([, value]) => value)];
  const statusGuard = expectedStatus
    ? ` AND status = $${values.push(expectedStatus)}`
    : "";
  const result = await dbQuery(
    `UPDATE scheduled_campaigns
     SET ${assignments.join(", ")}, updated_at = now()
     WHERE id = $1${statusGuard}
     RETURNING id`,
    values,
  );
  return result.rowCount === 1;
}

export async function deleteScheduledCampaign(id: string): Promise<boolean> {
  const result = await dbQuery(
    "DELETE FROM scheduled_campaigns WHERE id = $1 AND status <> $2 RETURNING id",
    [id, SCHEDULED_STATUS.PROCESSING],
  );
  return result.rowCount === 1;
}

/** Atomically claim the oldest due campaign across all worker dynos. */
export async function claimNextDueCampaign(
  now: Date,
): Promise<ScheduledCampaignRecord | null> {
  if (!isScheduledSendingConfigured()) {
    return null;
  }

  const result = await dbQuery<ScheduledCampaignRow>(
    `WITH due AS (
       SELECT id
       FROM scheduled_campaigns
       WHERE status = $1 AND scheduled_at <= $2
       ORDER BY scheduled_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE scheduled_campaigns AS campaign
     SET status = $3,
         locked_at = now(),
         attempts = campaign.attempts + 1,
         updated_at = now()
     FROM due
     WHERE campaign.id = due.id
     RETURNING campaign.*`,
    [SCHEDULED_STATUS.SCHEDULED, now, SCHEDULED_STATUS.PROCESSING],
  );

  return result.rows[0] ? mapScheduledCampaignRow(result.rows[0]) : null;
}

export async function reclaimStaleCampaigns(
  staleBefore: Date,
  limit: number,
): Promise<number> {
  if (!isScheduledSendingConfigured()) {
    return 0;
  }

  const result = await dbQuery(
    `WITH stale AS (
       SELECT id
       FROM scheduled_campaigns
       WHERE status = $1 AND locked_at < $2
       ORDER BY locked_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $3
     )
     UPDATE scheduled_campaigns AS campaign
     SET status = $4, locked_at = NULL, updated_at = now()
     FROM stale
     WHERE campaign.id = stale.id
     RETURNING campaign.id`,
    [
      SCHEDULED_STATUS.PROCESSING,
      staleBefore,
      limit,
      SCHEDULED_STATUS.SCHEDULED,
    ],
  );

  return result.rowCount || 0;
}

export async function deleteScheduledDataForUser(userEmail: string): Promise<{
  scheduledCampaigns: number;
  oauthTokens: number;
}> {
  if (!isScheduledSendingConfigured()) {
    return { scheduledCampaigns: 0, oauthTokens: 0 };
  }

  const result = await dbQuery<
    QueryResultRow & { scheduled_campaigns: string; oauth_tokens: string }
  >(
    `WITH deleted_campaigns AS (
       DELETE FROM scheduled_campaigns WHERE user_email = $1 RETURNING 1
     ), deleted_tokens AS (
       DELETE FROM oauth_tokens WHERE user_email = $1 RETURNING 1
     )
     SELECT
       (SELECT count(*) FROM deleted_campaigns) AS scheduled_campaigns,
       (SELECT count(*) FROM deleted_tokens) AS oauth_tokens`,
    [userEmail],
  );
  const row = result.rows[0];
  return {
    scheduledCampaigns: Number(row?.scheduled_campaigns || 0),
    oauthTokens: Number(row?.oauth_tokens || 0),
  };
}
