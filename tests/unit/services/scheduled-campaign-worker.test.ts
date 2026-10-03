import { beforeEach, expect, it, vi } from "vite-plus/test";
const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  list: vi.fn(),
  begin: vi.fn(),
  finish: vi.fn(),
  interrupt: vi.fn(),
  send: vi.fn(),
  token: vi.fn(),
  load: vi.fn(),
}));
vi.mock("@/lib/services/scheduled-campaign-store", () => ({
  claimNextDueCampaign: mocks.claim,
  getScheduledCampaign: mocks.get,
  updateScheduledCampaign: mocks.update,
  isScheduledSendingConfigured: () => true,
  reclaimStaleCampaigns: vi.fn().mockResolvedValue(0),
  toAttachmentData: () => [],
}));
vi.mock("@/lib/services/campaign-delivery-store", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listDeliveries: mocks.list,
  beginDelivery: mocks.begin,
  finishDelivery: mocks.finish,
  markInterruptedDeliveries: mocks.interrupt,
  recordWorkerTick: vi.fn(),
}));
vi.mock("@/lib/services/email-service", () => ({
  EmailService: class {
    sendPersonalizedBatch = mocks.send;
  },
}));
vi.mock("@/lib/services/oauth-token-store", () => ({ getOfflineAccessToken: mocks.token }));
vi.mock("@/lib/services/campaign-send-state", () => ({
  loadCampaignSendState: mocks.load,
  persistCampaignSendState: vi.fn(),
}));
vi.mock("@/lib/services/unsubscribe-service", () => ({ checkUserUnsubscribed: vi.fn() }));
vi.mock("@/lib/attachment-fetcher", () => ({ isPdfUrl: () => false }));
import { runScheduledCampaignPass } from "@/lib/services/scheduled-campaign-worker";

const campaign = {
  $id: "job",
  campaign_id: "job",
  user_email: "owner@example.com",
  recipients: ["one@example.com", "two@example.com"],
  subject: "Hello",
  content: "Message",
  attachments: [],
  csv_data: [],
  cc: [],
  bcc: [],
  attempts: 1,
  progress_migrated: true,
  sent: 0,
  failed: 0,
  tracking_enabled: false,
  is_marketing: false,
};
let results: { email: string; status: string }[];
beforeEach(() => {
  vi.clearAllMocks();
  results = [];
  mocks.claim.mockReset().mockResolvedValueOnce(campaign).mockResolvedValue(null);
  mocks.get.mockResolvedValue(campaign);
  mocks.token.mockResolvedValue({ ok: true, accessToken: "test" });
  mocks.list.mockImplementation(async () => [...results]);
  mocks.begin.mockResolvedValue(true);
  mocks.finish.mockImplementation(async (resultId) => resultId);
  mocks.finish.mockImplementation(async (_id, result) => {
    results.push(result);
  });
  mocks.load.mockResolvedValue({ docId: "job", exists: false, results: [] });
  mocks.send.mockImplementation(async ([email], options) => {
    expect(await options.beforeDelivery(email.to)).toBe(true);
    return { results: [{ email: email.to, status: "success", messageId: "gmail" }] };
  });
});
it("preserves previous successes and sends only remaining recipients", async () => {
  results.push({ email: "one@example.com", status: "success" });
  const pass = await runScheduledCampaignPass();
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.send.mock.calls[0][0][0].to).toBe("two@example.com");
  expect(pass.processed[0]).toMatchObject({ sent: 2, failed: 0, status: "sent" });
});
it("holds network errors and never resumes unknown recipients", async () => {
  results.push({ email: "one@example.com", status: "unknown" });
  mocks.send.mockImplementation(async ([email], options) => {
    await options.beforeDelivery(email.to);
    return { results: [{ email: email.to, status: "error", error: "fetch failed" }] };
  });
  const pass = await runScheduledCampaignPass();
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(results[1]).toMatchObject({ status: "unknown" });
  expect(pass.processed[0]).toMatchObject({ failed: 2, status: "failed" });
});
it("stops before the next recipient on cancellation", async () => {
  mocks.get.mockResolvedValue({ ...campaign, cancel_requested: true });
  expect((await runScheduledCampaignPass()).processed[0]).toMatchObject({
    status: "cancelled",
    remaining: 2,
  });
  expect(mocks.send).not.toHaveBeenCalled();
});
it("does not call Gmail if legacy progress cannot be verified", async () => {
  mocks.claim
    .mockReset()
    .mockResolvedValueOnce({ ...campaign, progress_migrated: false })
    .mockResolvedValue(null);
  mocks.load.mockRejectedValueOnce(new Error("History unavailable"));
  await runScheduledCampaignPass();
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenCalledWith(
    "job",
    expect.objectContaining({ last_error: "History unavailable" }),
  );
});
