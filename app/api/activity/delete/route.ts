import { type NextRequest, NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Delete tracking data for a campaign or the entire user account (GDPR)
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaign_id");
    const deleteAll = searchParams.get("all") === "true";

    if (!campaignId && !deleteAll) {
      return NextResponse.json({ error: "Campaign ID or 'all=true' is required" }, { status: 400 });
    }

    const queries = [Query.equal("user_email", auth.email)];
    if (campaignId) {
      queries.push(Query.equal("campaign_id", campaignId));
    }

    // Fetch documents to delete (Appwrite doesn't have deleteMany)
    // We'll do it in batches of 100
    let deletedCount = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await databases.listDocuments(
        config.databaseId,
        config.trackingEventsCollectionId,
        [...queries, Query.limit(100)],
      );

      if (response.documents.length === 0) {
        hasMore = false;
        break;
      }

      const deletePromises = response.documents.map((doc) =>
        databases.deleteDocument(config.databaseId, config.trackingEventsCollectionId, doc.$id),
      );

      await Promise.all(deletePromises);
      deletedCount += response.documents.length;

      // If we got less than 100, we're done
      if (response.documents.length < 100) {
        hasMore = false;
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      message: deleteAll
        ? "All tracking data deleted successfully"
        : `Tracking data for campaign ${campaignId} deleted successfully`,
    });
  } catch (error) {
    apiLogger.error("Error deleting tracking data", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to delete tracking data" }, { status: 500 });
  }
}
