import { describe, it, expect } from "vite-plus/test";

import { buildCampaignChartData } from "@/lib/activity/chart-data";
import type { CampaignAnalytics } from "@/types/activity";

function makeCampaign(
  overrides: Partial<CampaignAnalytics> = {},
): CampaignAnalytics {
  return {
    id: "c1",
    subject: "Test",
    status: "completed",
    recipients: 10,
    sent: 10,
    failed: 0,
    successRate: 100,
    campaignType: "bulk",
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildCampaignChartData", () => {
  it("returns an empty array for no campaigns", () => {
    expect(buildCampaignChartData([])).toEqual([]);
  });

  it("aggregates sent counts by day", () => {
    const campaigns = [
      makeCampaign({ createdAt: "2024-01-01T08:00:00.000Z", sent: 5 }),
      makeCampaign({ createdAt: "2024-01-01T18:00:00.000Z", sent: 3 }),
      makeCampaign({ createdAt: "2024-01-02T08:00:00.000Z", sent: 7 }),
    ];

    const result = buildCampaignChartData(campaigns);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(8); // 5 + 3 on Jan 1
    expect(result[1].value).toBe(7); // Jan 2
  });

  it("sorts output chronologically regardless of input order", () => {
    const campaigns = [
      makeCampaign({ createdAt: "2024-01-05T00:00:00.000Z", sent: 1 }),
      makeCampaign({ createdAt: "2024-01-01T00:00:00.000Z", sent: 2 }),
      makeCampaign({ createdAt: "2024-01-03T00:00:00.000Z", sent: 3 }),
    ];

    const result = buildCampaignChartData(campaigns);
    expect(result.map((r) => r.value)).toEqual([2, 3, 1]);
  });

  it("limits output to the most recent 10 days", () => {
    const campaigns = Array.from({ length: 15 }, (_, i) =>
      makeCampaign({
        createdAt: new Date(2024, 0, i + 1).toISOString(),
        sent: i + 1,
      }),
    );

    const result = buildCampaignChartData(campaigns);
    expect(result).toHaveLength(10);
    // Should keep the last 10 days (days 6..15 => sent values 6..15)
    expect(result.map((r) => r.value)).toEqual([
      6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
  });

  it("each entry only has name and value keys", () => {
    const result = buildCampaignChartData([makeCampaign()]);
    expect(Object.keys(result[0]).sort()).toEqual(["name", "value"]);
  });
});
