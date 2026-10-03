import { BarChart3, MousePointer2 } from "lucide-react";

import { HeatmapWidget } from "@/components/activity/dashboard-widgets";
import type { ClickHeatmapData } from "@/types/activity";

interface HeatmapTabProps {
  selectedHeatmapCampaignId: string | null;
  heatmap: ClickHeatmapData | null;
}

export function HeatmapTab({ selectedHeatmapCampaignId, heatmap }: HeatmapTabProps) {
  if (!selectedHeatmapCampaignId) {
    return (
      <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm">
        <BarChart3 className="h-10 w-10 mb-4 opacity-40 text-primary" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No Campaign Selected</h3>
        <p className="max-w-sm text-sm">
          Select a campaign from the selector above to view its send-time heatmap.
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-lg font-semibold text-foreground">Send-Time Heatmap</h2>
      {heatmap && heatmap.links && heatmap.links.length > 0 ? (
        <HeatmapWidget
          links={heatmap.links}
          totalClicks={heatmap.totalClicks}
          title="When do your recipients open emails?"
        />
      ) : (
        <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm mt-4">
          <MousePointer2 className="h-10 w-10 mb-4 opacity-40" />
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Not enough open or click data
          </h3>
          <p className="max-w-sm text-sm">
            This campaign hasn't generated enough tracking events to display a heatmap yet.
          </p>
        </div>
      )}
    </>
  );
}
