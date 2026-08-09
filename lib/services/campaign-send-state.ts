/**
 * Campaign Send State
 *
 * Persists per-recipient send progress for chunked/resumable bulk campaigns
 * into the existing Appwrite `campaigns` collection (no new collection or
 * external infrastructure needed). This lets `/api/send-email` process a
 * time-budgeted chunk of recipients per request — staying under the
 * Vercel `maxDuration` limit — and pick up where it left off on a
 * subsequent call, skipping recipients that were already sent.
 *
 * The campaign document's `$id` is the caller-provided `campaignId` (the
 * same convention used by `POST /api/appwrite/campaigns` and
 * `hooks/useEmailSend/persistence.ts`'s `generateCampaignId`). Normal chunk
 * resumes skip recipients in the persisted `send_results`. Delivery remains
 * at least once because Gmail sending and result persistence are not atomic.
 *
 * @module services/campaign-send-state
 */

import { createHash } from "node:crypto";

import { databases, config } from "@/lib/appwrite-server";
import { CAMPAIGN_STATUS } from "@/lib/constants";
import { apiLogger } from "@/lib/logger";

import type { EmailResult } from "./email-service";

const MAX_APPWRITE_ID_LENGTH = 36;
const APPWRITE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/**
 * Convert an arbitrary campaign identifier into something safe to use as an
 * Appwrite document `$id` (max 36 chars, restricted charset). IDs that are
 * already safe are returned unchanged so this stays compatible with
 * campaign ids minted elsewhere in the app.
 */
export function toAppwriteDocId(campaignId: string): string {
  if (
    campaignId.length > 0 &&
    campaignId.length <= MAX_APPWRITE_ID_LENGTH &&
    APPWRITE_ID_PATTERN.test(campaignId)
  ) {
    return campaignId;
  }
  return createHash("sha1").update(campaignId).digest("hex").slice(0, 32);
}

function safeParseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export interface CampaignSendState {
  /** Appwrite document id used to store this campaign's send state */
  docId: string;
  /** True if a persisted state document already existed for this campaign */
  exists: boolean;
  /** Lowercased recipient emails already processed in a previous chunk */
  processedEmails: Set<string>;
  /** Accumulated results from previous chunks */
  results: EmailResult[];
  sent: number;
  failed: number;
  status: string;
}

/**
 * Load previously persisted send state for a campaign, if any.
 * Returns an "empty" state (as if nothing existed) when the collection
 * isn't configured, the document doesn't exist yet, or it belongs to a
 * different user.
 */
export async function loadCampaignSendState(
  campaignId: string,
  userEmail: string,
): Promise<CampaignSendState> {
  const docId = toAppwriteDocId(campaignId);
  const empty: CampaignSendState = {
    docId,
    exists: false,
    processedEmails: new Set(),
    results: [],
    sent: 0,
    failed: 0,
    status: CAMPAIGN_STATUS.SENDING,
  };

  if (!config.databaseId || !config.campaignsCollectionId) {
    return empty;
  }

  try {
    const doc: any = await databases.getDocument(
      config.databaseId,
      config.campaignsCollectionId,
      docId,
    );

    if (doc.user_email && doc.user_email !== userEmail) {
      // Not our campaign — don't leak or clobber another user's progress.
      return empty;
    }

    const results = safeParseJson<EmailResult[]>(doc.send_results, []);

    return {
      docId,
      exists: true,
      processedEmails: new Set(results.map((r) => r.email.toLowerCase())),
      results,
      sent: doc.sent || 0,
      failed: doc.failed || 0,
      status: doc.status || CAMPAIGN_STATUS.SENDING,
    };
  } catch {
    // Document not found (or a transient lookup error) — start fresh.
    return empty;
  }
}

export interface PersistChunkInput {
  /** Original caller-provided campaign id (for logging only) */
  campaignId: string;
  docId: string;
  /** Whether the document already existed (update vs. create) */
  existed: boolean;
  userEmail: string;
  subject?: string;
  content?: string;
  /** Full recipient list for the campaign; only stored on first creation */
  fullRecipients: string[];
  /** Results accumulated across all chunks so far (previous + this one) */
  allResults: EmailResult[];
  sentDelta: number;
  failedDelta: number;
  previousSent: number;
  previousFailed: number;
  /** Whether every recipient has now been processed */
  done: boolean;
}

/** Persist the accumulated results after processing a chunk. */
export async function persistCampaignSendState(
  input: PersistChunkInput,
): Promise<void> {
  if (!config.databaseId || !config.campaignsCollectionId) {
    return;
  }

  const sent = input.previousSent + input.sentDelta;
  const failed = input.previousFailed + input.failedDelta;
  const status = input.done
    ? sent === 0 && failed > 0
      ? CAMPAIGN_STATUS.FAILED
      : CAMPAIGN_STATUS.COMPLETED
    : CAMPAIGN_STATUS.PARTIAL;
  const send_results = JSON.stringify(input.allResults);

  try {
    if (input.existed) {
      await databases.updateDocument(
        config.databaseId,
        config.campaignsCollectionId,
        input.docId,
        { sent, failed, status, send_results },
      );
    } else {
      await databases.createDocument(
        config.databaseId,
        config.campaignsCollectionId,
        input.docId,
        {
          subject: input.subject || "",
          content: input.content || "",
          recipients: JSON.stringify(input.fullRecipients),
          sent,
          failed,
          status,
          user_email: input.userEmail,
          campaign_type: "bulk-chunked",
          send_results,
          created_at: new Date().toISOString(),
        },
      );
    }
  } catch (err) {
    apiLogger.error("Failed to persist campaign send state", {
      campaignId: input.campaignId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
