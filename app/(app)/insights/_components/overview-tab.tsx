import { BarChart3 } from "lucide-react";

import {
  LineChartWidget,
  ComparisonWidget,
  RecentCampaignsWidget,
} from "@/components/activity/dashboard-widgets";
import { GlobalLeaderboard } from "@/components/activity/global-leaderboard";
import { InsightsSummaryCards } from "@/components/insights/insights-summary-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HistoryData } from "@/hooks/useInsightsData";
import type { buildCampaignChartData } from "@/lib/activity/chart-data";
import type {
  AnalyticsSummary,
  CampaignAnalytics,
  ComparisonReport,
  TrackingEvent,
} from "@/types/activity";

interface OverviewTabProps {
  historyData: HistoryData;
  summary: AnalyticsSummary | null;
  comparison: ComparisonReport | null;
  chartData: ReturnType<typeof buildCampaignChartData>;
  insightsCampaigns: CampaignAnalytics[];
  allTrackingEvents: TrackingEvent[];
  onViewCampaign: (id: string) => void;
}

export function OverviewTab({
  historyData,
  summary,
  comparison,
  chartData,
  insightsCampaigns,
  allTrackingEvents,
  onViewCampaign,
}: OverviewTabProps) {
  return (
    <div className="space-y-8">
      <InsightsSummaryCards historyData={historyData} summary={summary} comparison={comparison} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart */}
        <div className="lg:col-span-2">
          <LineChartWidget
            title="Campaign Activity"
            data={chartData}
            label="Campaigns"
            size="large"
            className="h-full"
          />
        </div>

        {/* Comparison Widget */}
        <div className="h-full">
          {comparison && <ComparisonWidget report={comparison} className="h-full" />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Campaigns */}
        <RecentCampaignsWidget
          campaigns={insightsCampaigns.slice(0, 3)}
          onViewCampaign={onViewCampaign}
        />

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gmail Acceptance</span>
                <span className="font-medium">{historyData.successRate.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-success transition-all"
                  style={{ width: `${historyData.successRate}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recorded Open Rate (estimate)</span>
                <span className="font-medium">
                  {summary?.averageOpenRate === undefined
                    ? "Unavailable"
                    : `${summary.averageOpenRate.toFixed(1)}%`}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${summary?.averageOpenRate || 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Click Rate</span>
                <span className="font-medium">
                  {summary?.averageClickRate === undefined
                    ? "Unavailable"
                    : `${summary.averageClickRate.toFixed(1)}%`}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${summary?.averageClickRate || 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <GlobalLeaderboard events={allTrackingEvents} limit={3} />
      </div>
    </div>
  );
}
