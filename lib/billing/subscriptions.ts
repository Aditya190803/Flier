import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";
import { getPlan, type PlanId } from "@/lib/plans";

import type { EffectiveLimits, SubscriptionRecord, SubscriptionStatus } from "./types";

function subscriptionsCollectionId(): string {
  return process.env.NEXT_PUBLIC_APPWRITE_SUBSCRIPTIONS_COLLECTION_ID || "subscriptions";
}

function isConfigured(): boolean {
  return Boolean(config.databaseId && subscriptionsCollectionId());
}

export function toEffectiveLimits(sub: SubscriptionRecord | null): EffectiveLimits {
  const plan = getPlan(sub?.plan);
  const status: SubscriptionStatus = sub?.status ?? "none";

  // past_due / cancelled still use paid plan until period end if set
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const stillInPeriod = periodEnd !== null && periodEnd.getTime() > Date.now();

  const usePaid =
    status === "active" ||
    status === "trialing" ||
    (status === "cancelled" && stillInPeriod) ||
    (status === "past_due" && stillInPeriod);

  const effectivePlan = usePaid ? plan : getPlan("free");

  return {
    planId: effectivePlan.id,
    planName: effectivePlan.name,
    status: sub?.status ?? "none",
    emailsPerDay: sub?.emails_per_day_override ?? effectivePlan.limits.emailsPerDay,
    emailsPerMonth: sub?.emails_per_month_override ?? effectivePlan.limits.emailsPerMonth,
    contacts: sub?.contacts_override ?? effectivePlan.limits.contacts,
    features: { ...effectivePlan.limits.features },
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(sub?.cancel_at_period_end),
    interval: sub?.interval ?? null,
  };
}

export async function getSubscription(userEmail: string): Promise<SubscriptionRecord | null> {
  if (!isConfigured()) {
    return null;
  }

  try {
    const response = await databases.listDocuments(config.databaseId, subscriptionsCollectionId(), [
      Query.equal("user_email", userEmail),
      Query.limit(1),
    ]);

    if (response.documents.length === 0) {
      return null;
    }

    const doc = response.documents[0] as unknown as SubscriptionRecord & {
      $id: string;
    };
    return { ...doc, $id: doc.$id };
  } catch (error) {
    apiLogger.warn("Failed to load subscription; treating as free", {
      userEmail,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getUserPlan(userEmail: string): Promise<EffectiveLimits> {
  const sub = await getSubscription(userEmail);
  return toEffectiveLimits(sub);
}

export async function upsertSubscription(
  userEmail: string,
  patch: Partial<SubscriptionRecord> & { plan: PlanId },
): Promise<SubscriptionRecord> {
  if (!isConfigured()) {
    throw new Error("Subscriptions collection not configured");
  }

  const now = new Date().toISOString();
  const existing = await getSubscription(userEmail);

  const data: Record<string, unknown> = {
    user_email: userEmail,
    plan: patch.plan,
    status: patch.status ?? existing?.status ?? "active",
    interval: patch.interval ?? existing?.interval ?? null,
    razorpay_subscription_id:
      patch.razorpay_subscription_id ?? existing?.razorpay_subscription_id ?? null,
    razorpay_customer_id: patch.razorpay_customer_id ?? existing?.razorpay_customer_id ?? null,
    razorpay_plan_id: patch.razorpay_plan_id ?? existing?.razorpay_plan_id ?? null,
    current_period_end: patch.current_period_end ?? existing?.current_period_end ?? null,
    cancel_at_period_end: patch.cancel_at_period_end ?? existing?.cancel_at_period_end ?? false,
    emails_per_day_override:
      patch.emails_per_day_override ?? existing?.emails_per_day_override ?? null,
    emails_per_month_override:
      patch.emails_per_month_override ?? existing?.emails_per_month_override ?? null,
    contacts_override: patch.contacts_override ?? existing?.contacts_override ?? null,
    updated_at: now,
  };

  if (existing?.$id) {
    const updated = await databases.updateDocument(
      config.databaseId,
      subscriptionsCollectionId(),
      existing.$id,
      data,
    );
    return updated as unknown as SubscriptionRecord;
  }

  const created = await databases.createDocument(
    config.databaseId,
    subscriptionsCollectionId(),
    ID.unique(),
    { ...data, created_at: now },
  );
  return created as unknown as SubscriptionRecord;
}

export async function countUserContacts(userEmail: string): Promise<number> {
  try {
    const response = await databases.listDocuments(config.databaseId, config.contactsCollectionId, [
      Query.equal("user_email", userEmail),
      Query.limit(1),
    ]);
    return response.total;
  } catch {
    return 0;
  }
}
