import { type NextRequest, NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Get overall analytics stats for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    // Fetch all campaigns for this user
    const campaignsResponse = await databases.listDocuments(
      config.databaseId,
      config.campaignsCollectionId,
      [Query.equal("user_email", auth.email), Query.limit(1000)],
    );

    const campaigns = campaignsResponse.documents as any[];
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);

    // Fetch all tracking events for this user
    const eventsResponse = await databases.listDocuments(
      config.databaseId,
      config.trackingEventsCollectionId,
      [Query.equal("user_email", auth.email), Query.limit(5000)],
    );

    const events = eventsResponse.documents as any[];
    const totalOpens = events.filter((e) => e.event_type === "open").length;
    const totalClicks = events.filter((e) => e.event_type === "click").length;

    const averageOpenRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0;
    const averageClickRate = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0;

    return NextResponse.json({
      totalOpens,
      totalClicks,
      averageOpenRate,
      averageClickRate,
    });
  } catch (error) {
    apiLogger.error("Error fetching user stats", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch user stats" }, { status: 500 });
  }
}
