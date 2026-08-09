import { type NextRequest, NextResponse } from "next/server";

import { aggregateDeviceData } from "@/lib/activity/devices";
import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import type { TrackingEvent } from "@/types/activity";
import type { CampaignDocument } from "@/types/appwrite";

export const dynamic = "force-dynamic";

/**
 * Get aggregated stats for a specific campaign
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaign_id");
    const advanced = searchParams.get("advanced") === "true";

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 },
      );
    }

    // Verify campaign belongs to user
    const campaign = (await databases.getDocument(
      config.databaseId,
      config.campaignsCollectionId,
      campaignId,
    )) as CampaignDocument;

    if (campaign.user_email !== auth.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all events for this campaign (up to 5000 for aggregation)
    const response = await databases.listDocuments(
      config.databaseId,
      config.trackingEventsCollectionId,
      [Query.equal("campaign_id", campaignId), Query.limit(5000)],
    );

    const events = response.documents as unknown as TrackingEvent[];

    const opens = events.filter((e) => e.event_type === "open");
    const clicks = events.filter((e) => e.event_type === "click");

    const uniqueOpens = new Set(opens.map((e) => e.recipient_id || e.email))
      .size;
    const uniqueClicks = new Set(clicks.map((e) => e.recipient_id || e.email))
      .size;

    const baseStats = {
      opens: opens.length,
      uniqueOpens,
      clicks: clicks.length,
      uniqueClicks,
    };

    if (!advanced) {
      return NextResponse.json(baseStats);
    }

    // Advanced stats: Time series (grouped by day)
    const timeSeriesMap = new Map<
      string,
      { date: string; opens: number; clicks: number }
    >();

    events.forEach((event) => {
      const date = new Date(event.created_at).toISOString().split("T")[0];
      const existing = timeSeriesMap.get(date) || { date, opens: 0, clicks: 0 };

      if (event.event_type === "open") {
        existing.opens++;
      } else if (event.event_type === "click") {
        existing.clicks++;
      }

      timeSeriesMap.set(date, existing);
    });

    const timeSeries = Array.from(timeSeriesMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // Advanced stats: Devices
    const devices = aggregateDeviceData(events);

    // Advanced stats: Email Clients
    const clientMap = new Map<string, number>();
    events.forEach((event) => {
      const ua = event.user_agent || "";
      let client = "Other";
      if (ua.includes("GoogleImageProxy")) {
        client = "Gmail";
      } else if (
        ua.includes("Outlook-iOS") ||
        ua.includes("Outlook-Android") ||
        ua.includes("Office")
      ) {
        client = "Outlook";
      } else if (
        ua.includes("AppleWebKit") &&
        (ua.includes("iPhone") || ua.includes("iPad"))
      ) {
        client = "Apple Mail (iOS)";
      } else if (ua.includes("Macintosh") && ua.includes("AppleWebKit")) {
        client = "Apple Mail (macOS)";
      } else if (ua.includes("Thunderbird")) {
        client = "Thunderbird";
      }

      clientMap.set(client, (clientMap.get(client) || 0) + 1);
    });
    const emailClients = Array.from(clientMap.entries()).map(
      ([name, value]) => ({ name, value }),
    );

    // Advanced stats: Timing.
    // `created_at` is an optional attribute; fall back to Appwrite's own
    // creation timestamp so a missing value can't turn every derived
    // duration below into NaN.
    const sentAt = new Date(
      campaign.created_at || campaign.$createdAt,
    ).getTime();
    const firstOpen =
      opens.length > 0
        ? Math.min(...opens.map((e) => new Date(e.created_at).getTime()))
        : null;
    const firstClick =
      clicks.length > 0
        ? Math.min(...clicks.map((e) => new Date(e.created_at).getTime()))
        : null;

    const timing = {
      timeToFirstOpen: firstOpen ? (firstOpen - sentAt) / 1000 : null, // seconds
      timeToFirstClick: firstClick ? (firstClick - sentAt) / 1000 : null, // seconds
      averageTimeToOpen:
        opens.length > 0
          ? opens.reduce(
              (acc, e) => acc + (new Date(e.created_at).getTime() - sentAt),
              0,
            ) /
            opens.length /
            1000
          : null,
    };

    // Advanced stats: Locations (mocked by IP grouping for now)
    const locationMap = new Map<string, number>();
    events.forEach((event) => {
      const ip = event.ip_address || "Unknown";
      locationMap.set(ip, (locationMap.get(ip) || 0) + 1);
    });

    const locations = Array.from(locationMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Advanced stats: Link performance (Heatmap data)
    const linkMap = new Map<
      string,
      { url: string; clicks: number; uniqueClicks: number; linkId: string }
    >();

    clicks.forEach((event) => {
      const linkId = event.link_id || "unknown";
      const url = event.link_url || "unknown";
      const existing = linkMap.get(linkId) || {
        url,
        clicks: 0,
        uniqueClicks: 0,
        linkId,
      };

      existing.clicks++;
      linkMap.set(linkId, existing);
    });

    // Calculate unique clicks per link
    linkMap.forEach((data, linkId) => {
      const uniqueForLink = new Set(
        clicks
          .filter((e) => e.link_id === linkId)
          .map((e) => e.recipient_id || e.email),
      ).size;
      data.uniqueClicks = uniqueForLink;
    });

    const linkStats = Array.from(linkMap.values());

    return NextResponse.json({
      ...baseStats,
      timeSeries,
      devices,
      emailClients,
      timing,
      locations,
      linkStats,
    });
  } catch (error) {
    apiLogger.error(
      "Error fetching campaign stats",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to fetch campaign stats" },
      { status: 500 },
    );
  }
}
