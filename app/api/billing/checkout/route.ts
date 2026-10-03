import { type NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createRazorpaySubscription, isRazorpayConfigured } from "@/lib/billing";
import { apiLogger } from "@/lib/logger";
import { type BillingInterval, type PlanId, PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

const SELF_SERVE: PlanId[] = ["insights", "pro"];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        {
          error: "Billing not configured",
          message: "Razorpay keys are missing. Contact support.",
        },
        { status: 503 },
      );
    }

    const body = await request.json();
    const planId = body.planId as PlanId;
    const interval = (body.interval as BillingInterval) || "monthly";

    if (!SELF_SERVE.includes(planId)) {
      return NextResponse.json(
        {
          error: "Invalid plan",
          message:
            planId === "enterprise"
              ? "Enterprise is sales-led. Visit /enterprise to contact us."
              : "Choose Insights or Pro.",
        },
        { status: 400 },
      );
    }

    if (interval !== "monthly" && interval !== "annual") {
      return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
    }

    const plan = PLANS[planId];
    const subscription = await createRazorpaySubscription({
      planId,
      interval,
      userEmail: session.user.email,
      userName: session.user.name,
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      planId,
      interval,
      planName: plan.name,
      prefill: {
        email: session.user.email,
        name: session.user.name || undefined,
      },
    });
  } catch (error) {
    apiLogger.error("Billing checkout error", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        error: "Checkout failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
