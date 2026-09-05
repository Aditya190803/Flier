import { type NextRequest, NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { SEND_EMAIL_CHUNK_BUDGET_MS } from "@/lib/constants";
import { apiLogger } from "@/lib/logger";
import {
  rateLimitAsync,
  rateLimitUserEmailAsync,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import {
  loadCampaignSendState,
  persistCampaignSendState,
} from "@/lib/services/campaign-send-state";
import {
  EmailService,
  type PersonalizedEmail,
} from "@/lib/services/email-service";
import { checkUserUnsubscribed } from "@/lib/services/unsubscribe-service";
import { sendEmailRequestSchema, validate } from "@/lib/validation";

/**
 * Sends a bulk/personalized campaign.
 *
 * To keep large campaigns resumable, this route processes recipients until a
 * time budget
 * (`SEND_EMAIL_CHUNK_BUDGET_MS`) is used up, persists per-recipient
 * progress to the `campaigns` collection keyed by `campaignId`, and returns
 * `done: false` with the remaining count when there's more work left.
 *
 * Resuming is client-driven and idempotent: call this endpoint again with
 * the *same* `campaignId` and the *same* full recipient list — recipients
 * already recorded as processed for that campaign are skipped
 * automatically. Callers that don't know about chunking (existing behavior)
 * are unaffected as long as the whole campaign fits inside one time
 * budget, which covers the vast majority of sends.
 */
export async function POST(request: NextRequest) {
  const requestStartedAt = Date.now();
  try {
    const rateLimitResponse = await rateLimitAsync(
      request,
      RATE_LIMITS.sendEmail,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const auth = await requireSession(request, { accessToken: true });
    if (!isAuthed(auth)) {
      return auth;
    }

    const body = await request.json();
    const parsed = validate(sendEmailRequestSchema, body);
    if (!parsed.success || !parsed.data) {
      return NextResponse.json(
        { error: parsed.message || "Invalid request" },
        { status: 400 },
      );
    }

    const {
      campaignId: rawCampaignId,
      abTestId,
      trackingEnabled = true,
      isTransactional = false,
      recipients,
      subject,
      content,
      variants,
      cc: campaignCc,
      bcc: campaignBcc,
      personalizedEmails: rawPersonalized,
    } = parsed.data;

    // Per-message Cc/Bcc wins; campaign-level values fill in otherwise.
    const withCampaignCcBcc = (
      email: PersonalizedEmail,
    ): PersonalizedEmail => ({
      ...email,
      cc: email.cc ?? (campaignCc?.length ? campaignCc : undefined),
      bcc: email.bcc ?? (campaignBcc?.length ? campaignBcc : undefined),
    });

    let personalizedEmails: PersonalizedEmail[] | undefined =
      rawPersonalized?.map((e) =>
        withCampaignCcBcc({
          to: e.to,
          subject: e.subject,
          message: e.message,
          originalRowData: e.originalRowData ?? {},
          attachments: e.attachments,
          cc: e.cc,
          bcc: e.bcc,
        }),
      );

    if (!personalizedEmails && recipients && Array.isArray(recipients)) {
      if (variants && variants.length > 0) {
        personalizedEmails = recipients.map((to: string, index: number) => {
          const variant = variants[index % variants.length];
          return withCampaignCcBcc({
            to,
            subject: variant.subject || subject || "A/B Test Email",
            message: variant.content || content || "",
            originalRowData: {},
          });
        });
      } else {
        personalizedEmails = recipients.map((to: string) =>
          withCampaignCcBcc({
            to,
            subject: subject || "A/B Test Email",
            message: content || "",
            originalRowData: {},
          }),
        );
      }
    }

    if (!personalizedEmails || personalizedEmails.length === 0) {
      return NextResponse.json(
        { error: "No emails provided" },
        { status: 400 },
      );
    }

    // Stable id for this campaign's persisted send state. Falls back to a
    // fresh id (single-chunk, non-resumable) when the caller doesn't supply
    // one — matching the previous, non-chunked behavior for those callers.
    const campaignId = rawCampaignId || abTestId || crypto.randomUUID();
    const total = personalizedEmails.length;

    const state = await loadCampaignSendState(campaignId, auth.email);

    // Idempotency: skip recipients already recorded as processed for this
    // campaign, whether from an earlier chunk in this send or a resume.
    const pending = personalizedEmails.filter(
      (email) => !state.processedEmails.has(email.to.toLowerCase()),
    );

    if (pending.length === 0 && state.exists) {
      const skipped = state.results.filter(
        (r) => r.status === "skipped",
      ).length;
      return NextResponse.json({
        results: state.results,
        summary: {
          total,
          sent: state.sent,
          failed: state.failed,
          skipped,
          successRate: total > 0 ? (state.sent / total) * 100 : 0,
        },
        campaignId,
        done: true,
        remaining: 0,
      });
    }

    const userRateLimitResponse = await rateLimitUserEmailAsync(
      auth.email,
      pending.length,
    );
    if (userRateLimitResponse) {
      return userRateLimitResponse;
    }

    const emailService = new EmailService(auth.accessToken, auth.email);

    const chunk = await emailService.sendPersonalizedBatch(pending, {
      verifyBeforeSending: true,
      tracking: {
        enabled: trackingEnabled,
        campaignId,
        userEmail: auth.email,
      },
      checkUnsubscribe: isTransactional
        ? undefined
        : async (email: string) => checkUserUnsubscribed(auth.email, email),
      deadline: requestStartedAt + SEND_EMAIL_CHUNK_BUDGET_MS,
    });

    const allResults = [...state.results, ...chunk.results];
    const done = chunk.done !== false && allResults.length >= total;
    const sent = state.sent + chunk.sent;
    const failed = state.failed + chunk.failed;

    await persistCampaignSendState({
      campaignId,
      docId: state.docId,
      existed: state.exists,
      userEmail: auth.email,
      subject: subject ?? personalizedEmails[0]?.subject,
      content: content ?? personalizedEmails[0]?.message,
      fullRecipients: personalizedEmails.map((e) => e.to),
      allResults,
      sentDelta: chunk.sent,
      failedDelta: chunk.failed,
      previousSent: state.sent,
      previousFailed: state.failed,
      done,
    });

    return NextResponse.json({
      results: chunk.results,
      summary: {
        total,
        sent,
        failed,
        skipped: allResults.filter((r) => r.status === "skipped").length,
        successRate: total > 0 ? (sent / total) * 100 : 0,
      },
      campaignId,
      done,
      remaining: Math.max(0, total - allResults.length),
    });
  } catch (error) {
    apiLogger.error(
      "Send email API error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to process email request" },
      { status: 500 },
    );
  }
}
