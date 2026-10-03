import type { EmailCampaign } from "@/lib/appwrite";

import { getRecipientsArray } from "./recipients";

export interface HistoryData {
  totalCampaigns: number;
  totalSent: number;
  totalRecipients: number;
  totalFailed: number;
  successRate: number;
  averageRecipientsPerCampaign: number;
  campaignsThisMonth: number;
  campaignsLastMonth: number;
  recentCampaigns: EmailCampaign[];
  monthlyTrend: "up" | "down" | "same";
}

export function buildHistoryData(campaigns: EmailCampaign[]): HistoryData {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);
  const totalRecipients = campaigns.reduce(
    (sum, c) => sum + getRecipientsArray(c.recipients).length,
    0,
  );
  const totalFailed = campaigns.reduce((sum, c) => sum + c.failed, 0);
  const successRate = totalRecipients > 0 ? (totalSent / totalRecipients) * 100 : 0;
  const averageRecipientsPerCampaign = totalCampaigns > 0 ? totalRecipients / totalCampaigns : 0;

  const campaignsThisMonth = campaigns.filter((c) => {
    const date = new Date(c.created_at || "");
    return date >= thisMonth;
  }).length;

  const campaignsLastMonth = campaigns.filter((c) => {
    const date = new Date(c.created_at || "");
    return date >= lastMonth && date <= lastMonthEnd;
  }).length;

  const monthlyTrend =
    campaignsThisMonth > campaignsLastMonth
      ? "up"
      : campaignsThisMonth < campaignsLastMonth
        ? "down"
        : "same";

  return {
    totalCampaigns,
    totalSent,
    totalRecipients,
    totalFailed,
    successRate,
    averageRecipientsPerCampaign,
    campaignsThisMonth,
    campaignsLastMonth,
    recentCampaigns: campaigns,
    monthlyTrend,
  };
}
