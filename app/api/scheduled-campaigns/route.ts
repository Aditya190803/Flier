import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import {
  MAX_SCHEDULE_HORIZON_MS,
  MIN_SCHEDULE_LEAD_MS,
  SCHEDULED_STATUS,
} from "@/lib/constants";
import { apiLogger } from "@/lib/logger";
import { hasUsableRefreshToken } from "@/lib/services/oauth-token-store";
import {
  createScheduledCampaign,
  deleteScheduledCampaign,
  getScheduledCampaign,
  isScheduledSendingConfigured,
  listScheduledCampaignsForUser,
  updateScheduledCampaign,
} from "@/lib/services/scheduled-campaign-store";
import {
  scheduledCampaignSchema,
  updateScheduledCampaignSchema,
  validate,
} from "@/lib/validation";

/**
 * CRUD for campaigns queued to send at a future time.
 *
 * Delivery itself is owned by `/api/cron/send-scheduled`; this route only
 * manages the queue. Statuses other than `scheduled` are terminal or
 * worker-owned, so edits are refused once a campaign has left the queue.
 */

/** Statuses a user is still allowed to edit or cancel. */
const EDITABLE_STATUSES: string[] = [SCHEDULED_STATUS.SCHEDULED];

function notConfigured() {
  return NextResponse.json(
    {
      error:
        "Scheduled sending is not configured. Set DATABASE_URL and run `npm run db:migrate`.",
    },
    { status: 503 },
  );
}

/**
 * Reject send times that are in the past, effectively immediate, or absurdly
 * far out. The lead time also guards the gap between the user picking a time
 * and the request landing.
 */
function validateSendTime(value: string): { at: Date } | { error: string } {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) {
    return { error: "Invalid send time" };
  }

  const now = Date.now();
  if (at.getTime() < now + MIN_SCHEDULE_LEAD_MS) {
    return {
      error: `Send time must be at least ${Math.round(
        MIN_SCHEDULE_LEAD_MS / 1000,
      )} seconds in the future`,
    };
  }
  if (at.getTime() > now + MAX_SCHEDULE_HORIZON_MS) {
    return { error: "Send time must be within one year" };
  }

  return { at };
}

// GET /api/scheduled-campaigns[?id=] — list or fetch one
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    if (!isScheduledSendingConfigured()) {
      return notConfigured();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const record = await getScheduledCampaign(id);
      if (!record) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (record.user_email !== auth.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      return NextResponse.json(record);
    }

    const documents = await listScheduledCampaignsForUser(auth.email);
    return NextResponse.json({ total: documents.length, documents });
  } catch (error: unknown) {
    apiLogger.error(
      "Error fetching scheduled campaigns",
      error instanceof Error ? { message: error.message } : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch scheduled campaigns" },
      { status: 500 },
    );
  }
}

// POST /api/scheduled-campaigns — queue a campaign
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    if (!isScheduledSendingConfigured()) {
      return notConfigured();
    }

    const body = await request.json();
    const parsed = validate(scheduledCampaignSchema, body);
    if (!parsed.success || !parsed.data) {
      return NextResponse.json(
        { error: parsed.message || "Invalid request" },
        { status: 400 },
      );
    }

    const timing = validateSendTime(parsed.data.scheduled_at);
    if ("error" in timing) {
      return NextResponse.json({ error: timing.error }, { status: 400 });
    }

    // The worker sends with a stored refresh token, not the session cookie.
    // Without one the campaign would sit in the queue and fail at send time,
    // so surface it now while the user can still act on it.
    const canSendOffline = await hasUsableRefreshToken(auth.email);
    if (!canSendOffline) {
      return NextResponse.json(
        {
          error:
            "Scheduled sending needs offline access to your Google account. Sign out and sign in again to grant it.",
          code: "REAUTH_REQUIRED",
        },
        { status: 412 },
      );
    }

    const data = parsed.data;
    const campaign = await createScheduledCampaign({
      subject: data.subject,
      content: data.content,
      recipients: data.recipients,
      scheduledAt: timing.at,
      timezone: data.timezone,
      userEmail: auth.email,
      attachments: data.attachments,
      csvData: data.csv_data,
      cc: data.cc,
      bcc: data.bcc,
      trackingEnabled: data.tracking_enabled !== false,
      isMarketing: data.is_marketing === true,
      hasPersonalizedAttachments: data.has_personalized_attachments === true,
      personalizedAttachmentColumn: data.personalized_attachment_column,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error: unknown) {
    apiLogger.error(
      "Error creating scheduled campaign",
      error instanceof Error ? { message: error.message } : undefined,
    );
    return NextResponse.json(
      { error: "Failed to schedule campaign" },
      { status: 500 },
    );
  }
}

// PUT /api/scheduled-campaigns — reschedule or cancel
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    if (!isScheduledSendingConfigured()) {
      return notConfigured();
    }

    const body = await request.json();
    const parsed = validate(updateScheduledCampaignSchema, body);
    if (!parsed.success || !parsed.data) {
      return NextResponse.json(
        { error: parsed.message || "Invalid request" },
        { status: 400 },
      );
    }

    const { id, ...changes } = parsed.data;

    const record = await getScheduledCampaign(id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (record.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!EDITABLE_STATUSES.includes(record.status)) {
      return NextResponse.json(
        {
          error: `Campaign is already ${record.status} and can no longer be changed`,
        },
        { status: 409 },
      );
    }

    const updates: Record<string, unknown> = {};

    if (changes.scheduled_at) {
      const timing = validateSendTime(changes.scheduled_at);
      if ("error" in timing) {
        return NextResponse.json({ error: timing.error }, { status: 400 });
      }
      updates.scheduled_at = timing.at.toISOString();
    }
    if (changes.timezone !== undefined) {
      updates.timezone = changes.timezone || null;
    }
    if (changes.status) {
      updates.status = changes.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const changed = await updateScheduledCampaign(
      id,
      updates,
      SCHEDULED_STATUS.SCHEDULED,
    );
    if (!changed) {
      return NextResponse.json(
        { error: "Campaign started sending before the change was applied" },
        { status: 409 },
      );
    }

    const updated = await getScheduledCampaign(id);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    apiLogger.error(
      "Error updating scheduled campaign",
      error instanceof Error ? { message: error.message } : undefined,
    );
    return NextResponse.json(
      { error: "Failed to update scheduled campaign" },
      { status: 500 },
    );
  }
}

// DELETE /api/scheduled-campaigns?id= — remove from the queue
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    if (!isScheduledSendingConfigured()) {
      return notConfigured();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Campaign ID required" },
        { status: 400 },
      );
    }

    const record = await getScheduledCampaign(id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (record.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    // Deleting a row a worker is actively sending would orphan the send
    // mid-flight; make the user cancel (or wait) first.
    if (record.status === SCHEDULED_STATUS.PROCESSING) {
      return NextResponse.json(
        { error: "Campaign is currently sending and cannot be deleted" },
        { status: 409 },
      );
    }

    const deleted = await deleteScheduledCampaign(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Campaign started sending before it could be deleted" },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    apiLogger.error(
      "Error deleting scheduled campaign",
      error instanceof Error ? { message: error.message } : undefined,
    );
    return NextResponse.json(
      { error: "Failed to delete scheduled campaign" },
      { status: 500 },
    );
  }
}
