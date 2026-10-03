import { type NextRequest, NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Export campaign tracking data as CSV or JSON
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaign_id");
    const format = searchParams.get("format") || "json";

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    // Fetch all events for this campaign
    const response = await databases.listDocuments(
      config.databaseId,
      config.trackingEventsCollectionId,
      [
        Query.equal("user_email", auth.email),
        Query.equal("campaign_id", campaignId),
        Query.limit(5000),
      ],
    );

    const events = response.documents;

    if (format === "csv") {
      const headers = ["email", "event_type", "link_url", "created_at", "ip_address", "user_agent"];
      const csvRows = [headers.join(",")];

      for (const event of events) {
        const row = [
          event.email,
          event.event_type,
          `"${(event.link_url || "").replace(/"/g, '""')}"`,
          event.created_at,
          event.ip_address || "",
          `"${(event.user_agent || "").replace(/"/g, '""')}"`,
        ];
        csvRows.push(row.join(","));
      }

      return new NextResponse(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="campaign-${campaignId}-export.csv"`,
        },
      });
    }

    return NextResponse.json(events);
  } catch (error) {
    apiLogger.error("Error exporting campaign data", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to export campaign data" }, { status: 500 });
  }
}
