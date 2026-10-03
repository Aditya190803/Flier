import { BarChart3, History } from "lucide-react";

import { CampaignFunnelWidget } from "@/components/activity/campaign-funnel";
import { DeviceBreakdownChart } from "@/components/activity/device-breakdown";
import { LinkPerformanceTable } from "@/components/activity/link-performance";
import type { HistoryData } from "@/hooks/useInsightsData";
import type { TrackingEvent } from "@/types/activity";

interface PerformanceTabProps {
  selectedHeatmapCampaignId: string | null;
  historyData: HistoryData | null;
  allTrackingEvents: TrackingEvent[];
}

export function PerformanceTab({
  selectedHeatmapCampaignId,
  historyData,
  allTrackingEvents,
}: PerformanceTabProps) {
  if (!selectedHeatmapCampaignId) {
    return (
      <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm">
        <BarChart3 className="h-10 w-10 mb-4 opacity-40 text-primary" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No Campaign Selected</h3>
        <p className="max-w-sm text-sm">
          Select a campaign above to view its delivery funnel and link performance.
        </p>
      </div>
    );
  }

  const campaign = historyData?.recentCampaigns?.find((c) => c.$id === selectedHeatmapCampaignId);
  const events = allTrackingEvents.filter((e) => e.campaign_id === selectedHeatmapCampaignId);
  const sent = campaign?.sent || 0;

  const openedEmails = new Set(events.filter((e) => e.event_type === "open").map((e) => e.email));

  if (sent === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center min-h-[290px] text-muted-foreground text-sm">
          <History className="h-8 w-8 mb-2 opacity-30" />
          No tracking data available (0 sent)
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <CampaignFunnelWidget sent={sent} events={events} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <DeviceBreakdownChart events={events} />
        <LinkPerformanceTable events={events} uniqueOpens={openedEmails.size} />
      </div>
    </div>
  );
}
