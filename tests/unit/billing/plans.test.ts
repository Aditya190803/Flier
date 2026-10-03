import { describe, expect, it } from "vite-plus/test";

import { formatInr, getPlan, planHasFeature, PLANS, PLAN_ORDER } from "@/lib/plans";

describe("plans catalog", () => {
  it("has four tiers in order", () => {
    expect(PLAN_ORDER).toEqual(["free", "insights", "pro", "enterprise"]);
  });

  it("free is 100 emails/day without advanced analytics", () => {
    const free = PLANS.free;
    expect(free.limits.emailsPerDay).toBe(100);
    expect(free.limits.features.advancedAnalytics).toBe(false);
    expect(free.limits.features.abTesting).toBe(false);
  });

  it("insights keeps 100/day but unlocks analytics", () => {
    const insights = PLANS.insights;
    expect(insights.limits.emailsPerDay).toBe(100);
    expect(insights.limits.features.advancedAnalytics).toBe(true);
    expect(insights.limits.features.exportReports).toBe(true);
    expect(insights.limits.features.abTesting).toBe(false);
  });

  it("pro is 500/day with full features", () => {
    const pro = PLANS.pro;
    expect(pro.limits.emailsPerDay).toBe(500);
    expect(pro.limits.features.abTesting).toBe(true);
    expect(pro.limits.features.teams).toBe(true);
    expect(pro.limits.features.webhooks).toBe(true);
  });

  it("enterprise is not self-serve", () => {
    expect(PLANS.enterprise.selfServe).toBe(false);
    expect(PLANS.enterprise.priceInrMonthly).toBeNull();
  });

  it("getPlan falls back to free", () => {
    expect(getPlan("nope").id).toBe("free");
    expect(getPlan(null).id).toBe("free");
  });

  it("planHasFeature works", () => {
    expect(planHasFeature("free", "teams")).toBe(false);
    expect(planHasFeature("pro", "teams")).toBe(true);
  });

  it("formatInr formats rupees", () => {
    expect(formatInr(299)).toContain("299");
  });
});
