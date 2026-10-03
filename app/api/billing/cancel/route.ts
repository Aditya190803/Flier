import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { cancelRazorpaySubscription, getSubscription, upsertSubscription } from "@/lib/billing";
import { apiLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sub = await getSubscription(session.user.email);
    if (!sub?.razorpay_subscription_id) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    try {
      await cancelRazorpaySubscription(sub.razorpay_subscription_id, true);
    } catch (error) {
      apiLogger.warn("Razorpay cancel failed; marking local cancel", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await upsertSubscription(session.user.email, {
      plan: sub.plan,
      status: "cancelled",
      cancel_at_period_end: true,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription will cancel at the end of the current billing period.",
      currentPeriodEnd: sub.current_period_end,
    });
  } catch (error) {
    apiLogger.error("Billing cancel error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
