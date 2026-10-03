import type { TrackingEvent } from "@/types/activity";

/** One recorded recipient per campaign/type, regardless of repeat pixels or link visits. */
export function uniqueCampaignEngagement(events: TrackingEvent[], campaignId: string) {
  const opens = new Set<string>();
  const clicks = new Set<string>();
  for (const event of events) {
    if (event.campaign_id !== campaignId || !event.email) {
      continue;
    }
    const email = event.email.trim().toLowerCase();
    if (event.event_type === "open") {
      opens.add(email);
    }
    if (event.event_type === "click") {
      clicks.add(email);
    }
  }
  return { opens: opens.size, clicks: clicks.size };
}
