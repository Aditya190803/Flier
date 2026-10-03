/**
 * Metrics Service
 * Handles fetching tracking events and aggregating metrics data
 */

import { apiRequest } from "@/lib/appwrite";
import type { TrackingEvent } from "@/types/activity";

export const metricsService = {
  /**
   * List tracking events for a user
   */
  async listEvents(options?: {
    campaignId?: string;
    eventType?: "open" | "click";
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; documents: TrackingEvent[] }> {
    const params = new URLSearchParams();
    if (options?.campaignId) {
      params.append("campaign_id", options.campaignId);
    }
    if (options?.eventType) {
      params.append("event_type", options.eventType);
    }
    if (options?.limit) {
      params.append("limit", options.limit.toString());
    }
    if (options?.offset) {
      params.append("offset", options.offset.toString());
    }

    const queryString = params.toString();
    const url = `/api/activity/events${queryString ? `?${queryString}` : ""}`;

    return apiRequest(url);
  },

  /**
   * Get aggregated stats for a campaign
   */
  async getCampaignStats(campaignId: string): Promise<{
    opens: number;
    uniqueOpens: number;
    clicks: number;
    uniqueClicks: number;
  }> {
    return apiRequest(`/api/activity/campaign-stats?campaign_id=${campaignId}`);
  },

  /**
   * Get advanced stats for a campaign
   */
  async getAdvancedCampaignStats(campaignId: string): Promise<{
    opens: number;
    uniqueOpens: number;
    clicks: number;
    uniqueClicks: number;
    timeSeries: Array<{ date: string; opens: number; clicks: number }>;
    devices: Array<{ name: string; value: number; color: string }>;
    locations: Array<{ name: string; value: number }>;
  }> {
    return apiRequest(`/api/activity/campaign-stats?campaign_id=${campaignId}&advanced=true`);
  },

  /**
   * Get overall stats for a user
   */
  async getUserStats(): Promise<{
    totalOpens: number;
    totalClicks: number;
    averageOpenRate: number;
    averageClickRate: number;
  }> {
    return apiRequest("/api/activity/user-stats");
  },
};
