import { type NextRequest, NextResponse } from "next/server";

import { authorizeCron } from "@/lib/cron-auth";
import { apiLogger } from "@/lib/logger";
import { runScheduledCampaignPass } from "@/lib/services/scheduled-campaign-worker";

export const dynamic = "force-dynamic";

/** Manually trigger one worker pass. The Heroku web dyno runs the clock. */
export async function POST(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) {
    return denied;
  }

  try {
    return NextResponse.json(await runScheduledCampaignPass());
  } catch (error) {
    apiLogger.error(
      "Scheduled send worker failed",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Scheduled send worker failed" },
      { status: 500 },
    );
  }
}
