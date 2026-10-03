import { isPdfUrl } from "@/lib/attachment-fetcher";
import {
  SCHEDULED_BATCH_SIZE,
  SCHEDULED_CRON_BUDGET_MS,
  SCHEDULED_LOCK_STALE_MS,
  SCHEDULED_MAX_ATTEMPTS,
  SCHEDULED_STATUS,
} from "@/lib/constants";
import { assertEmailQuota, incrementEmailUsage, PlanLimitError } from "@/lib/billing";
import { apiLogger } from "@/lib/logger";
import {
  loadCampaignSendState,
  persistCampaignSendState,
} from "@/lib/services/campaign-send-state";
import { EmailService, type PersonalizedEmail } from "@/lib/services/email-service";
import { getOfflineAccessToken } from "@/lib/services/oauth-token-store";
import {
  claimNextDueCampaign,
  getScheduledCampaign,
  isScheduledSendingConfigured,
  reclaimStaleCampaigns,
  toAttachmentData,
  updateScheduledCampaign,
  type ScheduledCampaignRecord,
} from "@/lib/services/scheduled-campaign-store";
import {
  beginDelivery,
  finishDelivery,
  listDeliveries,
  markInterruptedDeliveries,
  isUncertainDeliveryError,
  recordWorkerTick,
} from "@/lib/services/campaign-delivery-store";
import { getTeamPolicy, TeamReviewError } from "@/lib/services/team-review";
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
function buildPersonalizedEmails(campaign: ScheduledCampaignRecord): PersonalizedEmail[] {
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
      column && csvRow?.[column] && isPdfUrl(csvRow[column]) ? csvRow[column] : undefined;

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
    if (
      campaign.team_id &&
      (await getTeamPolicy(campaign.team_id, campaign.user_email)).role === "viewer"
    ) {
      throw new TeamReviewError("Sender is now a viewer and cannot send this team campaign");
    }
    if (!campaign.progress_migrated) {
      const legacy = await loadCampaignSendState(campaignId, campaign.user_email, true);
      for (const result of legacy.results) {
        await finishDelivery(campaign.$id, {
          email: result.email,
          status: result.status,
          message_id: result.messageId,
          error: result.error,
        });
      }
      await updateScheduledCampaign(campaign.$id, { progress_migrated: true });
    }
    await markInterruptedDeliveries(campaign.$id);
    const previous = await listDeliveries(campaign.$id);
    const processed = new Set(previous.map((result) => result.email));
    const pending = allEmails.filter((email) => !processed.has(email.to.toLowerCase()));
    const service = new EmailService(token.accessToken, campaign.user_email);
    let cancelled = false;
    let quotaPause: { message: string; resetAt?: string } | undefined;
    for (const email of pending) {
      if (Date.now() >= deadline - 2_000) {
        break;
      }
      const current = await getScheduledCampaign(campaign.$id);
      if (!current || current.cancel_requested) {
        cancelled = true;
        break;
      }
      try {
        await assertEmailQuota(campaign.user_email, 1);
      } catch (error) {
        if (!(error instanceof PlanLimitError)) {
          throw error;
        }
        // Plan quota reached: pause until it resets rather than exceeding the plan.
        quotaPause = {
          message: `Paused: ${error.message}`,
          resetAt: typeof error.details.resetAt === "string" ? error.details.resetAt : undefined,
        };
        break;
      }
      let reserved = false;
      try {
        const chunk = await service.sendPersonalizedBatch([email], {
          verifyBeforeSending: true,
          tracking: {
            enabled: campaign.tracking_enabled,
            campaignId,
            userEmail: campaign.user_email,
          },
          checkUnsubscribe: campaign.is_marketing
            ? (address: string) => checkUserUnsubscribed(campaign.user_email, address)
            : undefined,
          beforeDelivery: async (address: string) => {
            reserved = await beginDelivery(campaign.$id, address);
            return reserved;
          },
          deadline,
        });
        for (const result of chunk.results) {
          await finishDelivery(campaign.$id, {
            email: result.email,
            status:
              result.status === "error" && reserved && isUncertainDeliveryError(result.error || "")
                ? "unknown"
                : result.status,
            message_id: result.messageId,
            error: result.error,
          });
        }
        const accepted = chunk.results.filter((result) => result.status === "success").length;
        await incrementEmailUsage(campaign.user_email, accepted).catch((error) =>
          apiLogger.error("Plan usage could not be recorded", {
            campaignId,
            error: String(error),
          }),
        );
      } catch (error) {
        if (reserved) {
          throw error;
        } // Keep the reservation uncertain if result persistence fails.
        await finishDelivery(campaign.$id, {
          email: email.to,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    const deliveries = await listDeliveries(campaign.$id);
    const sent = deliveries.filter((result) => result.status === "success").length;
    const unknown = deliveries.filter(
      (result) => result.status === "unknown" || result.status === "sending",
    ).length;
    const failed = deliveries.filter((result) => result.status === "error").length + unknown;
    const done = deliveries.length >= total;
    if (cancelled) {
      await updateScheduledCampaign(campaign.$id, {
        status: SCHEDULED_STATUS.CANCELLED,
        locked_at: null,
        sent,
        failed,
        last_error: "Stopped before the next recipient. An in-flight message may have completed.",
      });
      return {
        id: campaign.$id,
        status: SCHEDULED_STATUS.CANCELLED,
        sent,
        failed,
        remaining: total - deliveries.length,
      };
    }
    // Appwrite history is a projection; PostgreSQL owns delivery progress.
    try {
      const state = await loadCampaignSendState(campaignId, campaign.user_email, true);
      await persistCampaignSendState({
        campaignId,
        docId: state.docId,
        existed: state.exists,
        userEmail: campaign.user_email,
        subject: campaign.subject,
        content: campaign.content,
        fullRecipients: campaign.recipients,
        allResults: deliveries.map((result) => ({
          email: result.email,
          status:
            result.status === "unknown" || result.status === "sending" ? "error" : result.status,
          messageId: result.message_id,
          error: result.error,
        })),
        sentDelta: sent,
        failedDelta: failed,
        previousSent: 0,
        previousFailed: 0,
        done,
      });
    } catch (error) {
      apiLogger.error("Delivery history projection unavailable", {
        campaignId,
        error: String(error),
      });
    }

    // Not finished: hand the row back to the queue so the next tick resumes.
    if (!done) {
      await updateScheduledCampaign(campaign.$id, {
        status: SCHEDULED_STATUS.SCHEDULED,
        locked_at: null,
        sent,
        failed,
        last_error: quotaPause?.message ?? null,
        ...(quotaPause?.resetAt ? { scheduled_at: quotaPause.resetAt } : {}),
      });

      return {
        id: campaign.$id,
        status: SCHEDULED_STATUS.SCHEDULED,
        sent,
        failed,
        remaining: Math.max(0, total - deliveries.length),
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
      last_error: unknown
        ? `${unknown} uncertain outcome(s). Check Gmail Sent before recovery.`
        : failed > 0
          ? `${failed} of ${total} recipients failed`
          : null,
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
    const terminal =
      attempts >= SCHEDULED_MAX_ATTEMPTS ||
      (error instanceof TeamReviewError && error.status === 403);

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

  await recordWorkerTick();
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
