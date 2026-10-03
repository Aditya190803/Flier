"use client";

import { useEffect, useState } from "react";

import type { EmailCampaign } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

/**
 * Fetches recipient engagement and advanced stats for a selected campaign
 * (used by the Insights "Campaign Details" modal).
 */
export function useCampaignDetails(selectedCampaign: EmailCampaign | null) {
  const [recipientEngagement, setRecipientEngagement] = useState<any[]>([]);
  const [campaignStats, setCampaignStats] = useState<any>(null);
  const [isLoadingEngagement, setIsLoadingEngagement] = useState(false);
  const [_isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!selectedCampaign) {
        setRecipientEngagement([]);
        setCampaignStats(null);
        return;
      }

      setIsLoadingEngagement(true);
      setIsLoadingStats(true);

      try {
        // Fetch recipients
        const recipientsPromise = fetch(
          `/api/activity/campaign-recipients?campaignId=${selectedCampaign.$id}`,
        ).then((res) => (res.ok ? res.json() : { recipients: [] }));

        // Fetch advanced stats
        const statsPromise = fetch(
          `/api/activity/campaign-stats?campaign_id=${selectedCampaign.$id}&advanced=true`,
        ).then((res) => (res.ok ? res.json() : null));

        const [recipientsData, statsData] = await Promise.all([recipientsPromise, statsPromise]);

        setRecipientEngagement(recipientsData.recipients || []);
        setCampaignStats(statsData);
      } catch (error) {
        componentLogger.error("Error fetching campaign data", error as Error);
      } finally {
        setIsLoadingEngagement(false);
        setIsLoadingStats(false);
      }
    };

    fetchCampaignData();
  }, [selectedCampaign]);

  return {
    recipientEngagement,
    campaignStats,
    isLoadingEngagement,
  };
}
