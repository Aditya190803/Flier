import { Eye, Mail, Percent, Send } from "lucide-react";

import { StatsCardWidget } from "@/components/activity/dashboard-widgets";
import type { AnalyticsSummary, ComparisonReport } from "@/types/activity";

interface HistorySummaryData {
  totalCampaigns: number;
  successRate: number;
  totalSent: number;
}

interface InsightsSummaryCardsProps {
  historyData: HistorySummaryData;
  summary: AnalyticsSummary | null;
  comparison: ComparisonReport | null;
}

export function InsightsSummaryCards({
  historyData,
  summary,
  comparison,
}: InsightsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCardWidget
        title="Total Campaigns"
        value={historyData.totalCampaigns}
        icon={<Mail className="h-5 w-5 text-primary" />}
        trend={comparison?.changes.campaigns}
      />
      <StatsCardWidget
        title="Delivery Rate"
        value={`${historyData.successRate.toFixed(1)}%`}
        icon={<Percent className="h-5 w-5 text-success" />}
        trend={comparison?.changes.successRate}
        gradientFrom="success/10"
        gradientTo="success/5"
      />
      <StatsCardWidget
        title="Emails Delivered"
        value={historyData.totalSent}
        icon={<Send className="h-5 w-5 text-secondary" />}
        trend={comparison?.changes.sent}
        gradientFrom="secondary/10"
        gradientTo="secondary/5"
      />
      <StatsCardWidget
        title="Open Rate"
        value={
          summary?.averageOpenRate !== null && summary?.averageOpenRate !== undefined
            ? `${summary.averageOpenRate.toFixed(1)}%`
            : "N/A"
        }
        icon={<Eye className="h-5 w-5 text-accent" />}
        trend={comparison?.changes.openRate}
        gradientFrom="accent/10"
        gradientTo="accent/5"
      />
    </div>
  );
}
