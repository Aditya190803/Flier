import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vite-plus/test";

import {
  generateWeekOverWeekComparison,
  generateMonthOverMonthComparison,
  generateCampaignComparison,
  generateCustomPeriodComparison,
  getTrendIndicator,
  formatComparisonSummary,
} from "@/lib/activity/comparison";
import type { CampaignAnalytics, ChangeValue } from "@/types/activity";

function makeCampaign(
  overrides: Partial<CampaignAnalytics> = {},
): CampaignAnalytics {
  return {
    id: "c1",
    subject: "Test campaign",
    status: "completed",
    recipients: 10,
    sent: 10,
    failed: 0,
    successRate: 100,
    campaignType: "bulk",
    createdAt: "2024-03-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("comparison reports", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("generateWeekOverWeekComparison", () => {
    it("buckets campaigns into current vs previous week", () => {
      const campaigns = [
        makeCampaign({
          id: "current",
          createdAt: "2024-03-14T00:00:00.000Z",
          sent: 10,
          recipients: 10,
        }),
        makeCampaign({
          id: "previous",
          createdAt: "2024-03-04T00:00:00.000Z",
          sent: 5,
          recipients: 5,
        }),
      ];

      const report = generateWeekOverWeekComparison(campaigns);

      expect(report.period).toBe("week");
      expect(report.current.campaigns).toBe(1);
      expect(report.current.sent).toBe(10);
      expect(report.previous.campaigns).toBe(1);
      expect(report.previous.sent).toBe(5);
      expect(report.changes.sent.direction).toBe("up");
    });

    it("handles an empty campaign list without dividing by zero", () => {
      const report = generateWeekOverWeekComparison([]);
      expect(report.current.successRate).toBe(0);
      expect(report.current.opens).toBeUndefined();
      expect(report.changes.campaigns).toEqual({
        value: 0,
        percentage: 0,
        direction: "same",
      });
    });
  });

  describe("generateMonthOverMonthComparison", () => {
    it("buckets campaigns into current vs previous month", () => {
      const campaigns = [
        makeCampaign({ id: "current", createdAt: "2024-03-10T00:00:00.000Z" }),
        makeCampaign({ id: "previous", createdAt: "2024-02-10T00:00:00.000Z" }),
      ];

      const report = generateMonthOverMonthComparison(campaigns);

      expect(report.period).toBe("month");
      expect(report.current.campaigns).toBe(1);
      expect(report.previous.campaigns).toBe(1);
      expect(report.current.label).toContain("March");
      expect(report.previous.label).toContain("February");
    });
  });

  describe("generateCampaignComparison", () => {
    it("compares two campaigns directly, carrying over opens/clicks", () => {
      const current = makeCampaign({
        subject: "New blast",
        sent: 20,
        opens: 10,
        clicks: 2,
      });
      const previous = makeCampaign({
        subject: "Old blast",
        sent: 10,
        opens: 4,
        clicks: 1,
      });

      const report = generateCampaignComparison(current, previous);

      expect(report.period).toBe("campaign");
      expect(report.current.label).toBe("New blast");
      expect(report.previous.label).toBe("Old blast");
      expect(report.changes.opens).toEqual({
        value: 6,
        percentage: 150,
        direction: "up",
      });
    });
  });

  describe("generateCustomPeriodComparison", () => {
    it("dispatches to week comparison for 'week'", () => {
      const report = generateCustomPeriodComparison([], "week");
      expect(report.period).toBe("week");
    });

    it("dispatches to month comparison for 'month'", () => {
      const report = generateCustomPeriodComparison([], "month");
      expect(report.period).toBe("month");
    });

    it("uses the two most recent campaigns for 'campaign'", () => {
      const campaigns = [
        makeCampaign({ id: "oldest", createdAt: "2024-01-01T00:00:00.000Z" }),
        makeCampaign({
          id: "newest",
          subject: "Newest",
          createdAt: "2024-03-01T00:00:00.000Z",
        }),
        makeCampaign({
          id: "middle",
          subject: "Middle",
          createdAt: "2024-02-01T00:00:00.000Z",
        }),
      ];
      const report = generateCustomPeriodComparison(campaigns, "campaign");
      expect(report.period).toBe("campaign");
      expect(report.current.label).toBe("Newest");
      expect(report.previous.label).toBe("Middle");
    });

    it("falls back to week comparison for 'campaign' when fewer than 2 campaigns exist", () => {
      const report = generateCustomPeriodComparison(
        [makeCampaign()],
        "campaign",
      );
      expect(report.period).toBe("week");
    });
  });
});

describe("getTrendIndicator", () => {
  it("formats an 'up' change", () => {
    const change: ChangeValue = {
      value: 5,
      percentage: 12.34,
      direction: "up",
    };
    expect(getTrendIndicator(change)).toEqual({
      label: "+12.3%",
      color: "success",
      icon: "up",
    });
  });

  it("formats a 'down' change", () => {
    const change: ChangeValue = {
      value: -5,
      percentage: 12.34,
      direction: "down",
    };
    expect(getTrendIndicator(change)).toEqual({
      label: "-12.3%",
      color: "destructive",
      icon: "down",
    });
  });

  it("formats a 'same' change", () => {
    const change: ChangeValue = { value: 0, percentage: 0, direction: "same" };
    expect(getTrendIndicator(change)).toEqual({
      label: "No change",
      color: "secondary",
      icon: "same",
    });
  });
});

describe("formatComparisonSummary", () => {
  it("always includes campaigns, sent, and success rate lines", () => {
    const report = generateCampaignComparison(makeCampaign(), makeCampaign());
    const summary = formatComparisonSummary(report);

    expect(summary.some((s) => s.startsWith("Campaigns:"))).toBe(true);
    expect(summary.some((s) => s.startsWith("Emails Sent:"))).toBe(true);
    expect(summary.some((s) => s.startsWith("Success Rate:"))).toBe(true);
  });

  it("includes opens/clicks lines only when both periods have them", () => {
    const withOpens = generateCampaignComparison(
      makeCampaign({ opens: 5, clicks: 1 }),
      makeCampaign({ opens: 3, clicks: 0 }),
    );
    const withoutOpens = generateCampaignComparison(
      makeCampaign(),
      makeCampaign(),
    );

    expect(
      formatComparisonSummary(withOpens).some((s) => s.startsWith("Opens:")),
    ).toBe(true);
    expect(
      formatComparisonSummary(withoutOpens).some((s) => s.startsWith("Opens:")),
    ).toBe(false);
  });
});
