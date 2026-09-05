import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vite-plus/test";

import { buildHistoryData } from "@/lib/activity/history";
import type { EmailCampaign } from "@/lib/appwrite";

function makeCampaign(overrides: Partial<EmailCampaign> = {}): EmailCampaign {
  return {
    $id: "c1",
    subject: "Test",
    content: "<p>Hi</p>",
    recipients: ["a@example.com", "b@example.com"],
    sent: 2,
    failed: 0,
    status: "completed",
    user_email: "sender@example.com",
    created_at: "2024-01-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildHistoryData", () => {
  it("returns zeroed data for an empty campaign list", () => {
    const result = buildHistoryData([]);

    expect(result.totalCampaigns).toBe(0);
    expect(result.totalSent).toBe(0);
    expect(result.totalRecipients).toBe(0);
    expect(result.totalFailed).toBe(0);
    expect(result.successRate).toBe(0);
    expect(result.averageRecipientsPerCampaign).toBe(0);
    expect(result.recentCampaigns).toEqual([]);
    expect(result.monthlyTrend).toBe("same");
  });

  it("sums totals and computes success/average rates", () => {
    const campaigns = [
      makeCampaign({
        sent: 8,
        failed: 2,
        recipients: Array.from({ length: 10 }, (_, i) => `r${i}@example.com`),
      }),
      makeCampaign({
        sent: 5,
        failed: 0,
        recipients: ["x@example.com", "y@example.com"],
      }),
    ];

    const result = buildHistoryData(campaigns);

    expect(result.totalCampaigns).toBe(2);
    expect(result.totalSent).toBe(13);
    expect(result.totalFailed).toBe(2);
    expect(result.totalRecipients).toBe(12);
    expect(result.successRate).toBeCloseTo((13 / 12) * 100);
    expect(result.averageRecipientsPerCampaign).toBe(6);
  });

  it("parses recipients stored as a JSON string", () => {
    const campaigns = [
      makeCampaign({
        recipients: JSON.stringify([
          "a@example.com",
          "b@example.com",
          "c@example.com",
        ]) as unknown as string[],
      }),
    ];
    const result = buildHistoryData(campaigns);
    expect(result.totalRecipients).toBe(3);
  });

  describe("monthly trend", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-03-15T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("is 'up' when this month has more campaigns than last month", () => {
      const campaigns = [
        makeCampaign({ created_at: "2024-03-05T00:00:00.000Z" }),
        makeCampaign({ created_at: "2024-03-10T00:00:00.000Z" }),
        makeCampaign({ created_at: "2024-02-10T00:00:00.000Z" }),
      ];
      const result = buildHistoryData(campaigns);
      expect(result.campaignsThisMonth).toBe(2);
      expect(result.campaignsLastMonth).toBe(1);
      expect(result.monthlyTrend).toBe("up");
    });

    it("is 'down' when this month has fewer campaigns than last month", () => {
      const campaigns = [
        makeCampaign({ created_at: "2024-03-05T00:00:00.000Z" }),
        makeCampaign({ created_at: "2024-02-01T00:00:00.000Z" }),
        makeCampaign({ created_at: "2024-02-10T00:00:00.000Z" }),
      ];
      const result = buildHistoryData(campaigns);
      expect(result.campaignsThisMonth).toBe(1);
      expect(result.campaignsLastMonth).toBe(2);
      expect(result.monthlyTrend).toBe("down");
    });

    it("is 'same' when this month equals last month (including both zero)", () => {
      const campaigns = [
        makeCampaign({ created_at: "2024-01-01T00:00:00.000Z" }),
      ];
      const result = buildHistoryData(campaigns);
      expect(result.campaignsThisMonth).toBe(0);
      expect(result.campaignsLastMonth).toBe(0);
      expect(result.monthlyTrend).toBe("same");
    });

    it("treats a missing created_at as epoch (not counted in this/last month)", () => {
      const campaigns = [
        makeCampaign({ created_at: undefined as unknown as string }),
      ];
      const result = buildHistoryData(campaigns);
      expect(result.campaignsThisMonth).toBe(0);
      expect(result.campaignsLastMonth).toBe(0);
    });
  });

  it("returns the original campaigns array as recentCampaigns", () => {
    const campaigns = [
      makeCampaign({ $id: "one" }),
      makeCampaign({ $id: "two" }),
    ];
    const result = buildHistoryData(campaigns);
    expect(result.recentCampaigns).toBe(campaigns);
  });
});
