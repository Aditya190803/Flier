import type { BillingInterval, PlanId } from "@/lib/plans";

export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "trialing" | "none";

export interface SubscriptionRecord {
  $id?: string;
  user_email: string;
  plan: PlanId;
  status: SubscriptionStatus;
  interval?: BillingInterval | null;
  razorpay_subscription_id?: string | null;
  razorpay_customer_id?: string | null;
  razorpay_plan_id?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  /** Optional Enterprise overrides */
  emails_per_day_override?: number | null;
  emails_per_month_override?: number | null;
  contacts_override?: number | null;
  updated_at?: string;
  created_at?: string;
}

export interface EffectiveLimits {
  planId: PlanId;
  planName: string;
  status: SubscriptionStatus;
  emailsPerDay: number;
  emailsPerMonth: number;
  contacts: number;
  features: {
    advancedAnalytics: boolean;
    exportReports: boolean;
    abTesting: boolean;
    webhooks: boolean;
    teams: boolean;
  };
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  interval: BillingInterval | null;
}

export interface UsageSnapshot {
  emailsToday: number;
  emailsThisMonth: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  dailyResetAt: string;
  monthlyResetAt: string;
}
