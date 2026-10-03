import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isAuthed, requireSession } from "@/lib/api-auth";
import {
  getDeliveryHealth,
  listDeliveries,
  resolveUnknown,
  retryCampaign,
} from "@/lib/services/campaign-delivery-store";
import { hasUsableRefreshToken } from "@/lib/services/oauth-token-store";
import {
  getScheduledCampaign,
  isScheduledSendingConfigured,
} from "@/lib/services/scheduled-campaign-store";

export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if (!isAuthed(auth)) {
    return auth;
  }
  if (!isScheduledSendingConfigured()) {
    return NextResponse.json({ configured: false, offlineReady: false });
  }
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const campaign = await getScheduledCampaign(id);
      if (!campaign || campaign.user_email !== auth.email) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ campaign, results: await listDeliveries(id) });
    }
    return NextResponse.json({
      configured: true,
      offlineReady: await hasUsableRefreshToken(auth.email),
      ...(await getDeliveryHealth(auth.email)),
    });
  } catch {
    return NextResponse.json(
      { error: "Delivery state is unavailable. Refresh before taking recovery actions." },
      { status: 503 },
    );
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ id: z.string().min(1), action: z.literal("retry") }),
  z.object({
    id: z.string().min(1),
    action: z.literal("resolve"),
    email: z.string().email(),
    sent: z.boolean(),
    confirmed: z.literal(true),
  }),
]);

export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if (!isAuthed(auth)) {
    return auth;
  }
  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid recovery action" }, { status: 400 });
    }
    const data = parsed.data;
    const campaign = await getScheduledCampaign(data.id);
    if (!campaign || campaign.user_email !== auth.email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (["scheduled", "processing"].includes(campaign.status)) {
      return NextResponse.json(
        { error: "Wait for delivery to stop before recovery" },
        { status: 409 },
      );
    }
    if (data.action === "retry" && !(await hasUsableRefreshToken(auth.email))) {
      return NextResponse.json({ error: "Reconnect Google before retrying" }, { status: 412 });
    }
    const changed =
      data.action === "retry"
        ? await retryCampaign(data.id, auth.email)
        : await resolveUnknown(data.id, data.email, data.sent);
    return NextResponse.json(
      changed ? { success: true } : { error: "State changed; refresh before retrying" },
      { status: changed ? 200 : 409 },
    );
  } catch {
    return NextResponse.json(
      { error: "Recovery unavailable; refresh before retrying" },
      { status: 503 },
    );
  }
}
