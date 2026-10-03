import { beforeEach, expect, it, vi } from "vite-plus/test";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  get: vi.fn(),
  retry: vi.fn(),
  resolve: vi.fn(),
  token: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({
  requireSession: mocks.auth,
  isAuthed: (auth: unknown) => Boolean(auth && typeof auth === "object" && "email" in auth),
}));
vi.mock("@/lib/services/campaign-delivery-store", () => ({
  retryCampaign: mocks.retry,
  resolveUnknown: mocks.resolve,
  listDeliveries: vi.fn(),
  getDeliveryHealth: vi.fn(),
}));
vi.mock("@/lib/services/scheduled-campaign-store", () => ({
  getScheduledCampaign: mocks.get,
  isScheduledSendingConfigured: () => true,
}));
vi.mock("@/lib/services/oauth-token-store", () => ({ hasUsableRefreshToken: mocks.token }));
import { POST } from "@/app/api/campaign-recovery/route";
const request = (body: object) =>
  new NextRequest("http://localhost/api/campaign-recovery", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ email: "owner@example.com" });
  mocks.get.mockResolvedValue({ user_email: "owner@example.com", status: "partial" });
  mocks.token.mockResolvedValue(true);
  mocks.retry.mockResolvedValue(true);
  mocks.resolve.mockResolvedValue(true);
});
it("blocks foreign campaign recovery", async () => {
  mocks.get.mockResolvedValue({ user_email: "other@example.com", status: "failed" });
  expect((await POST(request({ id: "job", action: "retry" }))).status).toBe(404);
  expect(mocks.retry).not.toHaveBeenCalled();
});
it("requires reconnect before retry", async () => {
  mocks.token.mockResolvedValue(false);
  expect((await POST(request({ id: "job", action: "retry" }))).status).toBe(412);
  expect(mocks.retry).not.toHaveBeenCalled();
});
it("blocks recovery while a worker is active", async () => {
  mocks.get.mockResolvedValue({ user_email: "owner@example.com", status: "processing" });
  expect((await POST(request({ id: "job", action: "retry" }))).status).toBe(409);
});
it("requires explicit Gmail confirmation to release an uncertain recipient", async () => {
  expect(
    (
      await POST(
        request({ id: "job", action: "resolve", email: "reader@example.com", sent: false }),
      )
    ).status,
  ).toBe(400);
  expect(mocks.resolve).not.toHaveBeenCalled();
  expect(
    (
      await POST(
        request({
          id: "job",
          action: "resolve",
          email: "reader@example.com",
          sent: false,
          confirmed: true,
        }),
      )
    ).status,
  ).toBe(200);
  expect(mocks.resolve).toHaveBeenCalledWith("job", "reader@example.com", false);
});
