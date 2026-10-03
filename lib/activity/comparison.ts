/**
 * Comparison reports for analytics
 * Week-over-week, campaign-over-campaign comparisons
 */

import type {
  CampaignAnalytics,
  ComparisonReport,
  ComparisonPeriod,
  PeriodMetrics,
  MetricChanges,
  ChangeValue,
} from "@/types/activity";

/**
 * Format date for display
 */
function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Calculate change between two values
 */
function calculateChange(current: number, previous: number): ChangeValue {
  if (previous === 0) {
    return {
      value: current,
      percentage: current > 0 ? 100 : 0,
      direction: current > 0 ? "up" : "same",
    };
  }

  const difference = current - previous;
  const percentage = ((current - previous) / previous) * 100;

  return {
    value: difference,
    percentage: Math.abs(percentage),
    direction: difference > 0 ? "up" : difference < 0 ? "down" : "same",
  };
}

/**
 * Calculate metrics for a set of campaigns
 */
function calculatePeriodMetrics(
  campaigns: CampaignAnalytics[],
  label: string,
  startDate: Date,
  endDate: Date,
): PeriodMetrics {
  const sent = campaigns.reduce((sum, c) => sum + c.sent, 0);
  const failed = campaigns.reduce((sum, c) => sum + c.failed, 0);
  const recipients = campaigns.reduce((sum, c) => sum + c.recipients, 0);
  const opens = campaigns.reduce((sum, c) => sum + (c.opens ?? 0), 0);
  const clicks = campaigns.reduce((sum, c) => sum + (c.clicks ?? 0), 0);

  const successRate = recipients > 0 ? (sent / recipients) * 100 : 0;
  const openRate = sent > 0 ? (opens / sent) * 100 : 0;
  const clickRate = sent > 0 ? (clicks / sent) * 100 : 0;

  return {
    label,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    campaigns: campaigns.length,
    sent,
    failed,
    successRate,
    opens: campaigns.some((c) => c.opens !== undefined) ? opens : undefined,
    clicks: campaigns.some((c) => c.clicks !== undefined) ? clicks : undefined,
    openRate: campaigns.some((c) => c.opens !== undefined) && sent > 0 ? openRate : undefined,
    clickRate: campaigns.some((c) => c.clicks !== undefined) && sent > 0 ? clickRate : undefined,
  };
}

/**
 * Generate week-over-week comparison
 */
export function generateWeekOverWeekComparison(campaigns: CampaignAnalytics[]): ComparisonReport {
  const now = new Date();

  // Current week (last 7 days)
  const currentWeekEnd = new Date(now);
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);

  // Previous week
  const previousWeekEnd = new Date(currentWeekStart);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
  const previousWeekStart = new Date(previousWeekEnd);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const currentWeekCampaigns = campaigns.filter((c) => {
    const date = new Date(c.createdAt);
    return date >= currentWeekStart && date <= currentWeekEnd;
  });

  const previousWeekCampaigns = campaigns.filter((c) => {
    const date = new Date(c.createdAt);
    return date >= previousWeekStart && date <= previousWeekEnd;
  });

  const current = calculatePeriodMetrics(
    currentWeekCampaigns,
    `This Week (${formatDateShort(currentWeekStart)} - ${formatDateShort(currentWeekEnd)})`,
    currentWeekStart,
    currentWeekEnd,
  );

  const previous = calculatePeriodMetrics(
    previousWeekCampaigns,
    `Last Week (${formatDateShort(previousWeekStart)} - ${formatDateShort(previousWeekEnd)})`,
    previousWeekStart,
    previousWeekEnd,
  );

  const changes = calculateMetricChanges(current, previous);

  return {
    period: "week",
    current,
    previous,
    changes,
  };
}

/**
 * Generate month-over-month comparison
 */
export function generateMonthOverMonthComparison(campaigns: CampaignAnalytics[]): ComparisonReport {
  const now = new Date();

  // Current month
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now);

  // Previous month
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const currentMonthCampaigns = campaigns.filter((c) => {
    const date = new Date(c.createdAt);
    return date >= currentMonthStart && date <= currentMonthEnd;
  });

  const previousMonthCampaigns = campaigns.filter((c) => {
    const date = new Date(c.createdAt);
    return date >= previousMonthStart && date <= previousMonthEnd;
  });

  const currentLabel = currentMonthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const previousLabel = previousMonthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const current = calculatePeriodMetrics(
    currentMonthCampaigns,
    currentLabel,
    currentMonthStart,
    currentMonthEnd,
  );

  const previous = calculatePeriodMetrics(
    previousMonthCampaigns,
    previousLabel,
    previousMonthStart,
    previousMonthEnd,
  );

  const changes = calculateMetricChanges(current, previous);

  return {
    period: "month",
    current,
    previous,
    changes,
  };
}

/**
 * Generate campaign-over-campaign comparison
 */
export function generateCampaignComparison(
  currentCampaign: CampaignAnalytics,
  previousCampaign: CampaignAnalytics,
): ComparisonReport {
  const current: PeriodMetrics = {
    label: currentCampaign.subject,
    startDate: currentCampaign.createdAt,
    endDate: currentCampaign.createdAt,
    campaigns: 1,
    sent: currentCampaign.sent,
    failed: currentCampaign.failed,
    successRate: currentCampaign.successRate,
    opens: currentCampaign.opens,
    clicks: currentCampaign.clicks,
    openRate: currentCampaign.openRate,
    clickRate: currentCampaign.clickRate,
  };

  const previous: PeriodMetrics = {
    label: previousCampaign.subject,
    startDate: previousCampaign.createdAt,
    endDate: previousCampaign.createdAt,
    campaigns: 1,
    sent: previousCampaign.sent,
    failed: previousCampaign.failed,
    successRate: previousCampaign.successRate,
    opens: previousCampaign.opens,
    clicks: previousCampaign.clicks,
    openRate: previousCampaign.openRate,
    clickRate: previousCampaign.clickRate,
  };

  const changes = calculateMetricChanges(current, previous);

  return {
    period: "campaign",
    current,
    previous,
    changes,
  };
}

/**
 * Calculate metric changes between periods
 */
function calculateMetricChanges(current: PeriodMetrics, previous: PeriodMetrics): MetricChanges {
  return {
    campaigns: calculateChange(current.campaigns, previous.campaigns),
    sent: calculateChange(current.sent, previous.sent),
    successRate: calculateChange(current.successRate, previous.successRate),
    opens:
      current.opens !== undefined && previous.opens !== undefined
        ? calculateChange(current.opens, previous.opens)
        : undefined,
    clicks:
      current.clicks !== undefined && previous.clicks !== undefined
        ? calculateChange(current.clicks, previous.clicks)
        : undefined,
    openRate:
      current.openRate !== undefined && previous.openRate !== undefined
        ? calculateChange(current.openRate, previous.openRate)
        : undefined,
    clickRate:
      current.clickRate !== undefined && previous.clickRate !== undefined
        ? calculateChange(current.clickRate, previous.clickRate)
        : undefined,
  };
}

/**
 * Generate comparison for a custom period
 */
export function generateCustomPeriodComparison(
  campaigns: CampaignAnalytics[],
  period: ComparisonPeriod,
): ComparisonReport {
  switch (period) {
    case "week":
      return generateWeekOverWeekComparison(campaigns);
    case "month":
      return generateMonthOverMonthComparison(campaigns);
    case "campaign":
      // For campaign comparison, use the two most recent campaigns
      const sortedCampaigns = [...campaigns].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      if (sortedCampaigns.length >= 2) {
        return generateCampaignComparison(sortedCampaigns[0], sortedCampaigns[1]);
      }
      // Fallback to week comparison if not enough campaigns
      return generateWeekOverWeekComparison(campaigns);
    default:
      return generateWeekOverWeekComparison(campaigns);
  }
}

/**
 * Get trend indicator for a metric change
 */
export function getTrendIndicator(change: ChangeValue): {
  label: string;
  color: "success" | "destructive" | "secondary";
  icon: "up" | "down" | "same";
} {
  if (change.direction === "up") {
    return {
      label: `+${change.percentage.toFixed(1)}%`,
      color: "success",
      icon: "up",
    };
  }
  if (change.direction === "down") {
    return {
      label: `-${change.percentage.toFixed(1)}%`,
      color: "destructive",
      icon: "down",
    };
  }
  return {
    label: "No change",
    color: "secondary",
    icon: "same",
  };
}

/**
 * Format comparison for display
 */
export function formatComparisonSummary(report: ComparisonReport): string[] {
  const summaries: string[] = [];

  summaries.push(`Campaigns: ${report.current.campaigns} vs ${report.previous.campaigns}`);
  summaries.push(`Emails Sent: ${report.current.sent} vs ${report.previous.sent}`);
  summaries.push(
    `Success Rate: ${report.current.successRate.toFixed(1)}% vs ${report.previous.successRate.toFixed(1)}%`,
  );

  if (report.current.opens !== undefined && report.previous.opens !== undefined) {
    summaries.push(`Opens: ${report.current.opens} vs ${report.previous.opens}`);
  }

  if (report.current.clicks !== undefined && report.previous.clicks !== undefined) {
    summaries.push(`Clicks: ${report.current.clicks} vs ${report.previous.clicks}`);
  }

  return summaries;
}
