import { type NextRequest, NextResponse } from "next/server";

import { periodEndFromUnix, upsertSubscription, verifyWebhookSignature } from "@/lib/billing";
import { apiLogger } from "@/lib/logger";
import { resolveRazorpayPlan, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

type RazorpayEntity = {
  id?: string;
  plan_id?: string;
  status?: string;
  current_end?: number;
  customer_id?: string;
  notes?: Record<string, string>;
  email?: string;
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      subscription?: { entity?: RazorpayEntity };
      payment?: { entity?: RazorpayEntity };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = event.event || "";
  const subEntity = event.payload?.subscription?.entity;
  const paymentEntity = event.payload?.payment?.entity;

  try {
    if (subEntity?.id) {
      const userEmail =
        subEntity.notes?.user_email || paymentEntity?.email || paymentEntity?.notes?.user_email;

      if (!userEmail) {
        apiLogger.warn("Razorpay webhook missing user_email", {
          event: eventName,
          subscriptionId: subEntity.id,
        });
        return NextResponse.json({ ok: true, skipped: true });
      }

      const resolved =
        resolveRazorpayPlan(subEntity.plan_id) ||
        (subEntity.notes?.plan
          ? {
              planId: subEntity.notes.plan as PlanId,
              interval: (subEntity.notes.interval as "monthly" | "annual") || "monthly",
            }
          : null);

      const planId = resolved?.planId || "free";
      const interval = resolved?.interval || "monthly";

      if (
        eventName === "subscription.activated" ||
        eventName === "subscription.charged" ||
        eventName === "subscription.resumed"
      ) {
        await upsertSubscription(userEmail, {
          plan: planId,
          status: "active",
          interval,
          razorpay_subscription_id: subEntity.id,
          razorpay_customer_id: subEntity.customer_id || null,
          razorpay_plan_id: subEntity.plan_id || null,
          current_period_end: periodEndFromUnix(subEntity.current_end),
          cancel_at_period_end: false,
        });
      } else if (eventName === "subscription.pending") {
        await upsertSubscription(userEmail, {
          plan: planId,
          status: "past_due",
          interval,
          razorpay_subscription_id: subEntity.id,
          razorpay_plan_id: subEntity.plan_id || null,
          current_period_end: periodEndFromUnix(subEntity.current_end),
        });
      } else if (
        eventName === "subscription.halted" ||
        eventName === "subscription.cancelled" ||
        eventName === "subscription.completed"
      ) {
        await upsertSubscription(userEmail, {
          plan: "free",
          status: "cancelled",
          interval,
          razorpay_subscription_id: subEntity.id,
          current_period_end: periodEndFromUnix(subEntity.current_end),
          cancel_at_period_end: true,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    apiLogger.error(
      "Razorpay webhook processing failed",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
