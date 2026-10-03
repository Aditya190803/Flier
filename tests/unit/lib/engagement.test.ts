import { expect, it } from "vite-plus/test";
import { uniqueCampaignEngagement } from "@/lib/activity/engagement";
import { calculateSummary, transformCampaignToAnalytics } from "@/lib/activity/export";

it("counts a recipient once per campaign/type regardless of repeated events or email case", () => {
  const events = [
    { campaign_id: "one", event_type: "open", email: "ADA@example.com" },
    { campaign_id: "one", event_type: "open", email: "ada@example.com" },
    { campaign_id: "one", event_type: "click", email: "ada@example.com" },
    { campaign_id: "two", event_type: "open", email: "other@example.com" },
  ];
  expect(uniqueCampaignEngagement(events as never, "one")).toEqual({ opens: 1, clicks: 1 });
});
it("distinguishes unavailable tracking from a recorded zero", () => {
  const campaign = {
    $id: "one",
    subject: "Hello",
    status: "completed",
    recipients: ["reader@example.com"],
    sent: 1,
    failed: 0,
  };
  expect(
    calculateSummary([transformCampaignToAnalytics(campaign)]).averageOpenRate,
  ).toBeUndefined();
  const zero = calculateSummary([transformCampaignToAnalytics(campaign, { opens: 0, clicks: 0 })]);
  expect(zero).toMatchObject({ totalOpens: 0, totalClicks: 0, averageOpenRate: 0 });
});
