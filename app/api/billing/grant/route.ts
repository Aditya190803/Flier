import { type NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { upsertSubscription } from "@/lib/billing";
import { apiLogger } from "@/lib/logger";
import { PLANS, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Manual plan grant for Enterprise / support.
 * Auth: session email must match BILLING_ADMIN_EMAILS, or CRON_SECRET bearer.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const targetEmail = String(body.userEmail || "")
      .toLowerCase()
      .trim();
    const planId = body.plan as PlanId;
    const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    const adminList = (process.env.BILLING_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const session = await getServerSession(authOptions);
    const isCron = Boolean(process.env.CRON_SECRET) && secret === process.env.CRON_SECRET;
    const isAdmin = session?.user?.email && adminList.includes(session.user.email.toLowerCase());

    if (!isCron && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!targetEmail || !(planId in PLANS)) {
      return NextResponse.json({ error: "userEmail and valid plan required" }, { status: 400 });
    }

    const periodDays = body.periodDays ? Number(body.periodDays) : 365;
    const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString();

    const sub = await upsertSubscription(targetEmail, {
      plan: planId,
      status: planId === "free" ? "none" : "active",
      interval: body.interval || null,
      current_period_end: planId === "free" ? null : periodEnd,
      cancel_at_period_end: false,
      emails_per_day_override: body.emailsPerDay ?? null,
      emails_per_month_override: body.emailsPerMonth ?? null,
      contacts_override: body.contacts ?? null,
    });

    return NextResponse.json({ success: true, subscription: sub });
  } catch (error) {
    apiLogger.error("Billing grant error", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        error: "Grant failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
