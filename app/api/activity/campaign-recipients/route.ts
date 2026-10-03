import { type NextRequest, NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import type { TrackingEvent } from "@/types/activity";

export const dynamic = "force-dynamic";

/**
 * List recipients for a campaign with their engagement stats
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaign_id");

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Fetch all events for this campaign to aggregate per recipient
    // In a large scale app, we would pre-aggregate this or use a more efficient query
    const response = await databases.listDocuments(
      config.databaseId,
      config.trackingEventsCollectionId,
      [
        Query.equal("user_email", auth.email),
        Query.equal("campaign_id", campaignId),
        Query.limit(5000),
      ],
    );

    const events = response.documents as unknown as TrackingEvent[];
    const recipientMap = new Map<string, any>();

    for (const event of events) {
      const rid = event.recipient_id || event.email;
      if (!recipientMap.has(rid)) {
        recipientMap.set(rid, {
          recipient_id: rid,
          email: event.email,
          sent: false,
          opened: false,
          clicked: false,
          clickCount: 0,
          lastActivity: event.created_at,
          clickedLinks: new Set<string>(),
        });
      }

      const stats = recipientMap.get(rid);
      if (event.event_type === "sent") {
        stats.sent = true;
      }
      if (event.event_type === "open") {
        stats.opened = true;
      }
      if (event.event_type === "click") {
        stats.clicked = true;
        stats.clickCount++;
        if (event.link_url) {
          stats.clickedLinks.add(event.link_url);
        }
      }

      if (new Date(event.created_at) > new Date(stats.lastActivity)) {
        stats.lastActivity = event.created_at;
      }
    }

    const recipients = Array.from(recipientMap.values()).map((r) => ({
      ...r,
      clickedLinks: Array.from(r.clickedLinks),
    }));

    // Sort by last activity
    recipients.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));

    const paginatedRecipients = recipients.slice(offset, offset + limit);

    return NextResponse.json({
      total: recipients.length,
      recipients: paginatedRecipients,
    });
  } catch (error) {
    apiLogger.error(
      "Error fetching recipient engagement",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json({ error: "Failed to fetch recipient engagement" }, { status: 500 });
  }
}
