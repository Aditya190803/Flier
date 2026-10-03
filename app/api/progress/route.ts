import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

// Client-side progress is primary; this endpoint only reports if a
// same-instance global Map was populated (legacy / single-instance).
declare global {
  var emailProgress: Map<
    string,
    {
      total: number;
      sent: number;
      failed: number;
      status: "sending" | "completed" | "error" | "paused";
      startTime: number;
      lastUpdate: number;
      userEmail?: string;
    }
  >;

  var emailRateLimitState: {
    isPaused: boolean;
    pauseStartTime: number;
    pauseDuration: number;
    pauseReason?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const campaignId = new URL(request.url).searchParams.get("campaignId");
    if (!campaignId) {
      return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
    }

    // Ownership: campaign must belong to the session user when it exists in
    // DB. Ephemeral client campaign ids (not yet in DB) are allowed and their
    // progress-map ownership is checked below before returning data.
    // The persisted campaign document (see lib/services/campaign-send-state)
    // is also our primary source of chunked/resumable send progress, since
    // the in-memory map below doesn't survive across serverless instances.
    let persistedDoc: Record<string, unknown> | null = null;
    if (config.databaseId && config.campaignsCollectionId) {
      try {
        const owned = await databases.listDocuments(
          config.databaseId,
          config.campaignsCollectionId,
          [Query.equal("$id", campaignId), Query.equal("user_email", auth.email), Query.limit(1)],
        );
        if (owned.total > 0) {
          persistedDoc = owned.documents[0] as unknown as Record<string, unknown>;
        } else if (!global.emailProgress?.has(campaignId)) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
      } catch {
        // Ownership lookup failed; the map ownership check below still applies.
      }
    }

    const progress = global.emailProgress?.get(campaignId);

    if (!progress) {
      if (persistedDoc) {
        const status = String(persistedDoc.status || "sending");
        let total = 0;
        try {
          const recipients =
            typeof persistedDoc.recipients === "string"
              ? JSON.parse(persistedDoc.recipients)
              : persistedDoc.recipients;
          total = Array.isArray(recipients) ? recipients.length : 0;
        } catch {
          total = 0;
        }

        return NextResponse.json({
          sent: Number(persistedDoc.sent) || 0,
          failed: Number(persistedDoc.failed) || 0,
          total,
          status: status === "partial" ? "sending" : status,
        });
      }

      return NextResponse.json({
        sent: 0,
        failed: 0,
        total: 0,
        status: "error",
      });
    }

    if (progress.userEmail && progress.userEmail !== auth.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      ...progress,
      globalPause: global.emailRateLimitState
        ? {
            isPaused: global.emailRateLimitState.isPaused,
            pauseStartTime: global.emailRateLimitState.pauseStartTime,
            pauseDuration: global.emailRateLimitState.pauseDuration,
            pauseReason: global.emailRateLimitState.pauseReason,
            pauseTimeRemaining: global.emailRateLimitState.isPaused
              ? Math.max(
                  0,
                  global.emailRateLimitState.pauseStartTime +
                    global.emailRateLimitState.pauseDuration -
                    Date.now(),
                )
              : 0,
          }
        : null,
    });
  } catch (error) {
    apiLogger.error("Progress API error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to get progress" }, { status: 500 });
  }
}
