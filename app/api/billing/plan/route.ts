import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getBillingSnapshot } from "@/lib/billing";
import { apiLogger } from "@/lib/logger";
import { PLAN_ORDER, PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await getBillingSnapshot(session.user.email);

    return NextResponse.json({
      ...snapshot,
      catalog: PLAN_ORDER.map((id) => {
        const p = PLANS[id];
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          priceInrMonthly: p.priceInrMonthly,
          priceInrAnnual: p.priceInrAnnual,
          popular: p.popular ?? false,
          selfServe: p.selfServe,
          limits: p.limits,
        };
      }),
    });
  } catch (error) {
    apiLogger.error("Billing plan GET error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to load billing plan" }, { status: 500 });
  }
}
