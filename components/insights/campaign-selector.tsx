import { BarChart3, Eye, Mail, MousePointer2, Send } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { aggregateClickData } from "@/lib/activity/heatmap";
import { cn } from "@/lib/utils";
import type { TrackingEvent } from "@/types/activity";

interface CampaignSummary {
  $id: string;
  subject?: string | null;
  sent: number;
}

interface CampaignSelectorProps {
  campaigns: CampaignSummary[];
  allTrackingEvents: TrackingEvent[];
  selectedCampaignId: string | null;
  onSelectCampaign: (campaignId: string, heatmap: ReturnType<typeof aggregateClickData>) => void;
}

export function CampaignSelector({
  campaigns,
  allTrackingEvents,
  selectedCampaignId,
  onSelectCampaign,
}: CampaignSelectorProps) {
  return (
    <Card className="border border-border/50 shadow-sm bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Select Campaign for Analysis
        </CardTitle>
        <CardDescription className="text-xs">
          Choose a campaign to view its detailed metrics, heatmaps, and event logs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 hide-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
          {campaigns.slice(0, 12).map((campaign) => {
            const isSelected = selectedCampaignId === campaign.$id;
            const campaignEvents = allTrackingEvents.filter(
              (event) => event.campaign_id === campaign.$id,
            );
            const opens = campaignEvents.filter((event) => event.event_type === "open").length;
            const clicks = campaignEvents.filter((event) => event.event_type === "click").length;

            return (
              <button
                key={campaign.$id}
                onClick={() => {
                  onSelectCampaign(campaign.$id, aggregateClickData(campaignEvents, campaign.$id));
                }}
                className={cn(
                  "shrink-0 px-3 py-2 rounded-lg border text-left transition-all hover:bg-muted/50 w-[180px]",
                  isSelected
                    ? "border-[var(--color-chart-1)]/50 bg-[var(--color-chart-1)]/5 ring-1 ring-[var(--color-chart-1)]/30"
                    : "border-border/60 bg-card",
                )}
                type="button"
              >
                <div className="font-medium text-xs truncate text-foreground">
                  {campaign.subject || "Untitled"}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1.5 font-medium">
                  <span className="flex items-center gap-1" title="Opens">
                    <Eye className="h-3 w-3 text-emerald-500/80" />
                    {opens}
                  </span>
                  <span className="flex items-center gap-1" title="Clicks">
                    <MousePointer2 className="h-3 w-3 text-[var(--color-chart-2)]/80" />
                    {clicks}
                  </span>
                  <span className="flex items-center gap-1" title="Sent">
                    <Send className="h-3 w-3 text-[var(--color-chart-1)]/80" />
                    {campaign.sent}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {campaigns.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm flex flex-col items-center">
            <Mail className="h-6 w-6 mb-2 opacity-50" />
            <p>No campaigns found. Send your first email to see analytics.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
