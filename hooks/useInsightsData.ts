"use client";

import { useCallback, useEffect, useState } from "react";

import { generateWeekOverWeekComparison } from "@/lib/activity/comparison";
import { uniqueCampaignEngagement } from "@/lib/activity/engagement";
import { aggregateDeviceData } from "@/lib/activity/devices";
import { calculateSummary, transformCampaignToAnalytics } from "@/lib/activity/export";
import { aggregateClickData } from "@/lib/activity/heatmap";
import { buildHistoryData, type HistoryData } from "@/lib/activity/history";
import { getRecipientsArray } from "@/lib/activity/recipients";
import type { EmailCampaign } from "@/lib/appwrite";
import { campaignsService } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";
import { metricsService } from "@/lib/services/metrics-service";
import type {
  CampaignAnalytics,
  AnalyticsSummary,
  ComparisonReport,
  ClickHeatmapData,
  TrackingEvent,
} from "@/types/activity";

export function useInsightsData(userEmail: string | undefined) {
  const [trackingStatus, setTrackingStatus] = useState<"available" | "partial" | "unavailable">(
    "unavailable",
  );
  const [trackingTotal, setTrackingTotal] = useState(0);
  const [historyError, setHistoryError] = useState("");
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [insightsCampaigns, setInsightsCampaigns] = useState<CampaignAnalytics[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [deviceDistribution, setDeviceDistribution] = useState<
    ReturnType<typeof aggregateDeviceData>
  >([]);
  const [heatmap, setHeatmap] = useState<ClickHeatmapData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allTrackingEvents, setAllTrackingEvents] = useState<TrackingEvent[]>([]);
  const [selectedHeatmapCampaignId, setSelectedHeatmapCampaignId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!userEmail) {
      return;
    }

    setIsLoadingData(true);
    try {
      const campaignsResponse = await campaignsService.listByUser(userEmail);
      const campaigns = campaignsResponse.documents;

      setHistoryError("");
      let events: TrackingEvent[] = [];
      let available = false;
      try {
        const eventsResponse = await metricsService.listEvents({ limit: 1000 });
        events = eventsResponse.documents as unknown as TrackingEvent[];
        available = true;
        const total = eventsResponse.total ?? events.length;
        setTrackingTotal(total);
        setTrackingStatus(total > events.length ? "partial" : "available");
      } catch (error) {
        setTrackingStatus("unavailable");
        setTrackingTotal(0);
        componentLogger.error("Error fetching tracking events", error as Error);
      }

      const transformed = campaigns.map((c) => {
        return transformCampaignToAnalytics(
          c,
          available ? uniqueCampaignEngagement(events, c.$id) : undefined,
        );
      });

      setInsightsCampaigns(transformed);
      setSummary(calculateSummary(transformed));
      setComparison(generateWeekOverWeekComparison(transformed));
      setDeviceDistribution(aggregateDeviceData(events));
      setAllTrackingEvents(events);

      if (transformed.length > 0) {
        setSelectedHeatmapCampaignId(transformed[0].id);
        setHeatmap(aggregateClickData(events, transformed[0].id));
      }

      setHistoryData(buildHistoryData(campaigns));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Refresh to retry");
      componentLogger.error("Error fetching history", error instanceof Error ? error : undefined);
    } finally {
      setIsLoadingData(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) {
      return;
    }
    fetchHistory();
    const unsubscribe = campaignsService.subscribeToUserCampaigns(userEmail, () => {
      fetchHistory();
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userEmail, fetchHistory]);

  const selectHeatmapCampaign = useCallback(
    (campaignId: string, heatmapData?: ClickHeatmapData | null) => {
      setSelectedHeatmapCampaignId(campaignId);
      setHeatmap(heatmapData ?? aggregateClickData(allTrackingEvents, campaignId));
    },
    [allTrackingEvents],
  );

  return {
    historyData,
    trackingStatus,
    trackingTotal,
    historyError,
    insightsCampaigns,
    summary,
    comparison,
    deviceDistribution,
    heatmap,
    isLoadingData,
    allTrackingEvents,
    selectedHeatmapCampaignId,
    setSelectedHeatmapCampaignId: selectHeatmapCampaign,
    fetchHistory,
    getRecipientsArray,
  };
}

export type { HistoryData, EmailCampaign };
