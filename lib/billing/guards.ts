import { NextResponse } from "next/server";

import type { PlanFeature } from "@/lib/plans";

import { countUserContacts, getUserPlan } from "./subscriptions";
import { buildUsageSnapshot, getEmailUsage } from "./usage";

import type { EffectiveLimits } from "./types";

export class PlanLimitError extends Error {
  code = "PLAN_LIMIT" as const;
  status = 403;
  details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "PlanLimitError";
    this.details = details;
  }
}

export function planLimitResponse(error: PlanLimitError): NextResponse {
  return NextResponse.json(
    {
      error: error.code,
      message: error.message,
      ...error.details,
    },
    { status: error.status },
  );
}

export async function assertFeature(
  userEmail: string,
  feature: PlanFeature,
  featureLabel?: string,
): Promise<EffectiveLimits> {
  const plan = await getUserPlan(userEmail);
  if (!plan.features[feature]) {
    throw new PlanLimitError(
      `${featureLabel ?? feature} requires a higher plan. Upgrade to unlock.`,
      {
        feature,
        planId: plan.planId,
        upgradeRequired: true,
      },
    );
  }
  return plan;
}

/**
 * Check daily + monthly email quota. Does NOT increment.
 * Call incrementEmailUsage after successful sends.
 */
export async function assertEmailQuota(
  userEmail: string,
  emailCount: number,
): Promise<EffectiveLimits> {
  const plan = await getUserPlan(userEmail);
  const { today, month, dailyResetAt, monthlyResetAt } = await getEmailUsage(userEmail);

  if (today + emailCount > plan.emailsPerDay) {
    throw new PlanLimitError(
      `Daily email limit reached (${plan.emailsPerDay}/day on ${plan.planName}). Resets at ${dailyResetAt.toISOString()}.`,
      {
        limit: "emailsPerDay",
        used: today,
        max: plan.emailsPerDay,
        remaining: Math.max(0, plan.emailsPerDay - today),
        resetAt: dailyResetAt.toISOString(),
        planId: plan.planId,
        upgradeRequired: plan.planId !== "pro" && plan.planId !== "enterprise",
      },
    );
  }

  if (month + emailCount > plan.emailsPerMonth) {
    throw new PlanLimitError(
      `Monthly email limit reached (${plan.emailsPerMonth}/month on ${plan.planName}).`,
      {
        limit: "emailsPerMonth",
        used: month,
        max: plan.emailsPerMonth,
        remaining: Math.max(0, plan.emailsPerMonth - month),
        resetAt: monthlyResetAt.toISOString(),
        planId: plan.planId,
        upgradeRequired: true,
      },
    );
  }

  return plan;
}

export async function assertContactQuota(
  userEmail: string,
  additional = 1,
): Promise<EffectiveLimits> {
  const plan = await getUserPlan(userEmail);
  const current = await countUserContacts(userEmail);

  if (current + additional > plan.contacts) {
    throw new PlanLimitError(
      `Contact limit reached (${plan.contacts} on ${plan.planName}). Upgrade or remove contacts.`,
      {
        limit: "contacts",
        used: current,
        max: plan.contacts,
        remaining: Math.max(0, plan.contacts - current),
        planId: plan.planId,
        upgradeRequired: true,
      },
    );
  }

  return plan;
}

export async function getBillingSnapshot(userEmail: string) {
  const plan = await getUserPlan(userEmail);
  const usage = await buildUsageSnapshot(userEmail, plan.emailsPerDay, plan.emailsPerMonth);
  const contactsUsed = await countUserContacts(userEmail);

  return {
    plan,
    usage,
    contacts: {
      used: contactsUsed,
      max: plan.contacts,
      remaining: Math.max(0, plan.contacts - contactsUsed),
    },
  };
}
