import { type NextRequest, NextResponse } from "next/server";

import { databases, config, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyTrackingToken } from "@/lib/tracking-token";

function safeRedirect(url: string | undefined, request: NextRequest) {
  if (url && /^https?:\/\//i.test(url)) {
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await rateLimitAsync(request, RATE_LIMITS.public);
  const token = new URL(request.url).searchParams.get("t");

  if (rateLimitResponse) {
    const payload = token ? verifyTrackingToken(token, "click") : null;
    return safeRedirect(payload?.targetUrl, request);
  }

  try {
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const payload = verifyTrackingToken(token, "click");
    if (!payload?.targetUrl) {
      apiLogger.warn("Click tracking rejected invalid token");
      return NextResponse.redirect(new URL("/", request.url));
    }

    try {
      await databases.createDocument(
        config.databaseId,
        config.trackingEventsCollectionId,
        ID.unique(),
        {
          campaign_id: payload.campaignId,
          recipient_id: payload.recipientId || undefined,
          link_id: payload.linkId || undefined,
          email: payload.recipientEmail,
          event_type: "click",
          link_url: payload.targetUrl,
          user_agent: request.headers.get("user-agent") || undefined,
          ip_address:
            request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            undefined,
          user_email: payload.userEmail,
          created_at: new Date().toISOString(),
        },
      );
      apiLogger.info("Link click tracked", { campaignId: payload.campaignId });
    } catch (error) {
      apiLogger.error(
        "Error recording click event",
        error instanceof Error ? error : undefined,
        {
          campaignId: payload.campaignId,
        },
      );
    }

    return safeRedirect(payload.targetUrl, request);
  } catch (error) {
    apiLogger.error(
      "Link tracking error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.redirect(new URL("/", request.url));
  }
}
