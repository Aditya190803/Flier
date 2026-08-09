import { isPdfUrl } from "@/lib/attachment-fetcher";
import {
  SCHEDULED_BATCH_SIZE,
  SCHEDULED_CRON_BUDGET_MS,
  SCHEDULED_LOCK_STALE_MS,
  SCHEDULED_MAX_ATTEMPTS,
  SCHEDULED_STATUS,
} from "@/lib/constants";
import { apiLogger } from "@/lib/logger";
import {
  loadCampaignSendState,
  persistCampaignSendState,
} from "@/lib/services/campaign-send-state";
import {
  EmailService,
  type PersonalizedEmail,
} from "@/lib/services/email-service";
import { getOfflineAccessToken } from "@/lib/services/oauth-token-store";
import {
  claimNextDueCampaign,
  isScheduledSendingConfigured,
  reclaimStaleCampaigns,
  toAttachmentData,
  updateScheduledCampaign,
  type ScheduledCampaignRecord,
} from "@/lib/services/scheduled-campaign-store";
import { checkUserUnsubscribed } from "@/lib/services/unsubscribe-service";

/**
 * Dispatches campaigns whose scheduled send time has arrived. The Heroku
 * clock process calls this directly, so delivery does not depend on an HTTP
 * request remaining open.
 */

/** Case-insensitively find the CSV row belonging to a recipient. */
function findCsvRow(
  csvData: Record<string, string>[],
  email: string,
): Record<string, string> | undefined {
  return csvData.find((row) => {
    const rowEmail = row.email || row.Email || row.EMAIL || "";
    return rowEmail.toLowerCase() === email.toLowerCase();
  });
}

/**
 * Build the per-recipient messages for a campaign.
 *
 * Subject and body are passed through as authored; `EmailService` resolves
 * `{{placeholders}}` from `originalRowData` at send time.
 */
function buildPersonalizedEmails(
  campaign: ScheduledCampaignRecord,
): PersonalizedEmail[] {
  const attachments = toAttachmentData(campaign.attachments);
  const column = campaign.has_personalized_attachments
    ? campaign.personalized_attachment_column
    : undefined;

  return campaign.recipients.map((recipient) => {
    const csvRow = findCsvRow(campaign.csv_data, recipient);

    const data: Record<string, string> = { email: recipient };
    if (csvRow) {
      for (const [key, value] of Object.entries(csvRow)) {
        data[key] = String(value);
      }
    }

    const personalizedAttachmentUrl =
      column && csvRow?.[column] && isPdfUrl(csvRow[column])
        ? csvRow[column]
        : undefined;

    return {
      to: recipient,
      subject: campaign.subject,
      message: campaign.content,
      originalRowData: data,
      attachments: attachments.length ? attachments : undefined,
      personalizedAttachment: personalizedAttachmentUrl
        ? { url: personalizedAttachmentUrl }
        : undefined,
      cc: campaign.cc.length ? campaign.cc : undefined,
      bcc: campaign.bcc.length ? campaign.bcc : undefined,
    };
  });
}

interface CampaignOutcome {
  id: string;
  status: string;
  sent: number;
  failed: number;
  remaining: number;
  error?: string;
}

/**
 * Send as much of one campaign as the remaining time budget allows.
 *
 * @param deadline - Absolute `Date.now()` timestamp to stop starting sends at.
 */
async function dispatchCampaign(
  campaign: ScheduledCampaignRecord,
  deadline: number,
): Promise<CampaignOutcome> {
  const campaignId = campaign.campaign_id || campaign.$id;
  const attempts = campaign.attempts;

  const token = await getOfflineAccessToken(campaign.user_email);
  if (!token.ok) {
    // A revoked grant can't fix itself; anything else is worth another tick
    // until we've burned through the attempt budget.
    const terminal =
      token.reason === "revoked" ||
      token.reason === "no_token" ||
      attempts >= SCHEDULED_MAX_ATTEMPTS;

    await updateScheduledCampaign(campaign.$id, {
      status: terminal ? SCHEDULED_STATUS.FAILED : SCHEDULED_STATUS.SCHEDULED,
      locked_at: null,
      last_error: token.error.slice(0, 2000),
    });

    apiLogger.error("Scheduled campaign could not authenticate", {
      campaignId,
      reason: token.reason,
      terminal,
    });

    return {
      id: campaign.$id,
      status: terminal ? SCHEDULED_STATUS.FAILED : SCHEDULED_STATUS.SCHEDULED,
      sent: campaign.sent,
      failed: campaign.failed,
      remaining: campaign.recipients.length,
      error: token.error,
    };
  }

  const allEmails = buildPersonalizedEmails(campaign);
  const total = allEmails.length;

  try {
    const state = await loadCampaignSendState(campaignId, campaign.user_email);

    // Skip anyone already processed on an earlier tick.
    const pending = allEmails.filter(
      (email) => !state.processedEmails.has(email.to.toLowerCase()),
    );

    let chunkSent = 0;
    let chunkFailed = 0;
    let results = state.results;
    let done = pending.length === 0;

    if (pending.length > 0) {
      const emailService = new EmailService(
        token.accessToken,
        campaign.user_email,
      );

      const chunk = await emailService.sendPersonalizedBatch(pending, {
        verifyBeforeSending: true,
        tracking: {
          enabled: campaign.tracking_enabled,
          campaignId,
          userEmail: campaign.user_email,
        },
        // Transactional mail ignores the unsubscribe list by design.
        checkUnsubscribe: campaign.is_marketing
          ? async (email: string) =>
              checkUserUnsubscribed(campaign.user_email, email)
          : undefined,
        deadline,
      });

      chunkSent = chunk.sent;
      chunkFailed = chunk.failed;
      results = [...state.results, ...chunk.results];
      done = chunk.done !== false && results.length >= total;
    }

    const sent = state.sent + chunkSent;
    const failed = state.failed + chunkFailed;

    await persistCampaignSendState({
      campaignId,
      docId: state.docId,
      existed: state.exists,
      userEmail: campaign.user_email,
      subject: campaign.subject,
      content: campaign.content,
      fullRecipients: campaign.recipients,
      allResults: results,
      sentDelta: chunkSent,
      failedDelta: chunkFailed,
      previousSent: state.sent,
      previousFailed: state.failed,
      done,
    });

    // Not finished: hand the row back to the queue so the next tick resumes.
    if (!done) {
      await updateScheduledCampaign(campaign.$id, {
        status: SCHEDULED_STATUS.SCHEDULED,
        locked_at: null,
        sent,
        failed,
        last_error: null,
      });

      return {
        id: campaign.$id,
        status: SCHEDULED_STATUS.SCHEDULED,
        sent,
        failed,
        remaining: Math.max(0, total - results.length),
      };
    }

    const finalStatus =
      sent === 0 && failed > 0
        ? SCHEDULED_STATUS.FAILED
        : failed > 0
          ? SCHEDULED_STATUS.PARTIAL
          : SCHEDULED_STATUS.SENT;

    await updateScheduledCampaign(campaign.$id, {
      status: finalStatus,
      locked_at: null,
      sent,
      failed,
      sent_at: new Date().toISOString(),
      last_error: failed > 0 ? `${failed} of ${total} recipients failed` : null,
    });

    apiLogger.info("Scheduled campaign dispatched", {
      campaignId,
      status: finalStatus,
      sent,
      failed,
    });

    return {
      id: campaign.$id,
      status: finalStatus,
      sent,
      failed,
      remaining: 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const terminal = attempts >= SCHEDULED_MAX_ATTEMPTS;

    await updateScheduledCampaign(campaign.$id, {
      status: terminal ? SCHEDULED_STATUS.FAILED : SCHEDULED_STATUS.SCHEDULED,
      locked_at: null,
      last_error: message.slice(0, 2000),
    });

    apiLogger.error("Scheduled campaign dispatch failed", {
      campaignId,
      attempts,
      terminal,
      error: message,
    });

    return {
      id: campaign.$id,
      status: terminal ? SCHEDULED_STATUS.FAILED : SCHEDULED_STATUS.SCHEDULED,
      sent: campaign.sent,
      failed: campaign.failed,
      remaining: total,
      error: message,
    };
  }
}

export interface ScheduledCampaignPass {
  success: true;
  reclaimed: number;
  claimed: number;
  processed: CampaignOutcome[];
  durationMs: number;
}

export async function runScheduledCampaignPass(): Promise<ScheduledCampaignPass> {
  if (!isScheduledSendingConfigured()) {
    throw new Error("Scheduled sending is not configured");
  }

  const startedAt = Date.now();
  const deadline = startedAt + SCHEDULED_CRON_BUDGET_MS;
  const reclaimed = await reclaimStaleCampaigns(
    new Date(startedAt - SCHEDULED_LOCK_STALE_MS),
    SCHEDULED_BATCH_SIZE,
  );

  const processed: CampaignOutcome[] = [];
  let claimed = 0;

  while (claimed < SCHEDULED_BATCH_SIZE && Date.now() < deadline - 2_000) {
    const campaign = await claimNextDueCampaign(new Date());
    if (!campaign) {
      break;
    }
    claimed++;
    processed.push(await dispatchCampaign(campaign, deadline));
  }

  return {
    success: true,
    reclaimed,
    claimed,
    processed,
    durationMs: Date.now() - startedAt,
  };
}
