/**
 * Plan catalog — source of truth for limits and feature flags.
 */

export type PlanId = "free" | "insights" | "pro" | "enterprise";
export type BillingInterval = "monthly" | "annual";

export type PlanFeature =
  | "advancedAnalytics"
  | "exportReports"
  | "abTesting"
  | "webhooks"
  | "teams";

export interface PlanLimits {
  emailsPerDay: number;
  emailsPerMonth: number;
  contacts: number;
  features: Record<PlanFeature, boolean>;
}

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  priceInrMonthly: number | null; // null = contact sales
  priceInrAnnual: number | null;
  popular?: boolean;
  limits: PlanLimits;
  selfServe: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Send and learn the basics",
    priceInrMonthly: 0,
    priceInrAnnual: 0,
    selfServe: true,
    limits: {
      emailsPerDay: 100,
      emailsPerMonth: 2000,
      contacts: 1000,
      features: {
        advancedAnalytics: false,
        exportReports: false,
        abTesting: false,
        webhooks: false,
        teams: false,
      },
    },
  },
  insights: {
    id: "insights",
    name: "Insights",
    description: "Full analytics, same send volume",
    priceInrMonthly: 299,
    priceInrAnnual: 2990,
    selfServe: true,
    limits: {
      emailsPerDay: 100,
      emailsPerMonth: 2000,
      contacts: 5000,
      features: {
        advancedAnalytics: true,
        exportReports: true,
        abTesting: false,
        webhooks: false,
        teams: false,
      },
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Full product, serious sending",
    priceInrMonthly: 999,
    priceInrAnnual: 9990,
    popular: true,
    selfServe: true,
    limits: {
      emailsPerDay: 500, // free Gmail daily ceiling
      emailsPerMonth: 10000,
      contacts: 25000,
      features: {
        advancedAnalytics: true,
        exportReports: true,
        abTesting: true,
        webhooks: true,
        teams: true,
      },
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom limits, SSO, invoice billing",
    priceInrMonthly: null,
    priceInrAnnual: null,
    selfServe: false,
    limits: {
      emailsPerDay: 2000,
      emailsPerMonth: 50000,
      contacts: 100000,
      features: {
        advancedAnalytics: true,
        exportReports: true,
        abTesting: true,
        webhooks: true,
        teams: true,
      },
    },
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "insights", "pro", "enterprise"];

export function getPlan(id: PlanId | string | null | undefined): Plan {
  if (id && id in PLANS) {
    return PLANS[id as PlanId];
  }
  return PLANS.free;
}

export function planHasFeature(
  planId: PlanId | string | null | undefined,
  feature: PlanFeature,
): boolean {
  return getPlan(planId).limits.features[feature];
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Map Razorpay plan id env keys → product plan + interval */
export function resolveRazorpayPlan(
  razorpayPlanId: string | undefined,
): { planId: PlanId; interval: BillingInterval } | null {
  if (!razorpayPlanId) {
    return null;
  }

  const map: Record<string, { planId: PlanId; interval: BillingInterval }> = {};
  const entries: Array<[string | undefined, PlanId, BillingInterval]> = [
    [process.env.RAZORPAY_PLAN_INSIGHTS_MONTHLY, "insights", "monthly"],
    [process.env.RAZORPAY_PLAN_INSIGHTS_ANNUAL, "insights", "annual"],
    [process.env.RAZORPAY_PLAN_PRO_MONTHLY, "pro", "monthly"],
    [process.env.RAZORPAY_PLAN_PRO_ANNUAL, "pro", "annual"],
  ];

  for (const [id, planId, interval] of entries) {
    if (id) {
      map[id] = { planId, interval };
    }
  }

  return map[razorpayPlanId] ?? null;
}

export function getRazorpayPlanId(planId: PlanId, interval: BillingInterval): string | null {
  if (planId === "insights" && interval === "monthly") {
    return process.env.RAZORPAY_PLAN_INSIGHTS_MONTHLY || null;
  }
  if (planId === "insights" && interval === "annual") {
    return process.env.RAZORPAY_PLAN_INSIGHTS_ANNUAL || null;
  }
  if (planId === "pro" && interval === "monthly") {
    return process.env.RAZORPAY_PLAN_PRO_MONTHLY || null;
  }
  if (planId === "pro" && interval === "annual") {
    return process.env.RAZORPAY_PLAN_PRO_ANNUAL || null;
  }
  return null;
}
