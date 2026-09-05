import { type NextRequest, NextResponse } from "next/server";

import { databases, config, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyTrackingToken } from "@/lib/tracking-token";

/** 1x1 transparent GIF */
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

function pixelResponse(extraHeaders?: Record<string, string>) {
  return new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      ...extraHeaders,
    },
  });
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimitAsync(request, RATE_LIMITS.public);
  if (rateLimitResponse) {
    return pixelResponse();
  }

  try {
    const token = new URL(request.url).searchParams.get("t");
    if (!token) {
      return pixelResponse();
    }

    const payload = verifyTrackingToken(token, "open");
    if (!payload) {
      apiLogger.warn("Open tracking rejected invalid token");
      return pixelResponse();
    }

    try {
      await databases.createDocument(
        config.databaseId,
        config.trackingEventsCollectionId,
        ID.unique(),
        {
          campaign_id: payload.campaignId,
          recipient_id: payload.recipientId || undefined,
          email: payload.recipientEmail,
          event_type: "open",
          user_agent: request.headers.get("user-agent") || undefined,
          ip_address:
            request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            undefined,
          user_email: payload.userEmail,
          created_at: new Date().toISOString(),
        },
      );
      apiLogger.info("Email open tracked", { campaignId: payload.campaignId });
    } catch (error) {
      apiLogger.error(
        "Error recording open event",
        error instanceof Error ? error : undefined,
        {
          campaignId: payload.campaignId,
        },
      );
    }

    return pixelResponse();
  } catch (error) {
    apiLogger.error(
      "Tracking pixel error",
      error instanceof Error ? error : undefined,
    );
    return pixelResponse();
  }
}
