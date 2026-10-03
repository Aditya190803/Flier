import { beforeEach, expect, it, vi } from "vite-plus/test";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ query: vi.fn(), policy: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/api-auth", () => ({ requireSession: mocks.auth, isAuthed: () => true }));
vi.mock("@/lib/db", () => ({ dbQuery: mocks.query }));
vi.mock("@/lib/services/team-review", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getTeamPolicy: mocks.policy,
}));
vi.mock("@/lib/services/campaign-eligibility", () => ({
  checkCampaignEligibility: async (snapshot: { recipients: string[] }) => ({
    recipients: snapshot.recipients,
    issues: [],
  }),
}));
import { POST, PUT } from "@/app/api/campaign-reviews/route";
const id = "878f5034-e464-4df0-b38e-cecebc572e80";
const request = (body: object) =>
  new NextRequest("http://localhost/api/campaign-reviews", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ email: "reviewer@example.com" });
  mocks.policy.mockResolvedValue({ role: "admin", requiresApproval: true });
  mocks.query.mockResolvedValueOnce({
    rows: [{ team_id: "team", submitter_email: "sender@example.com", status: "pending" }],
  });
});
it("blocks self-approval", async () => {
  mocks.auth.mockResolvedValue({ email: "sender@example.com" });
  expect((await PUT(request({ id, action: "approved" }))).status).toBe(403);
  expect(mocks.query).toHaveBeenCalledTimes(1);
});
it("blocks member approval and viewer submissions", async () => {
  mocks.policy.mockResolvedValue({ role: "member" });
  expect((await PUT(request({ id, action: "approved" }))).status).toBe(403);
  mocks.policy.mockResolvedValue({ role: "viewer" });
  expect(
    (
      await POST(
        request({
          team_id: "team",
          snapshot: {
            subject: "Hello",
            content: "Message",
            recipients: ["reader@example.com"],
            scheduled_at: new Date().toISOString(),
            send_now: true,
          },
        }),
      )
    ).status,
  ).toBe(403);
});
it("atomically saves an admin decision and comment with server identity", async () => {
  mocks.query.mockResolvedValueOnce({ rows: [{ id }] });
  expect(
    (
      await PUT(
        request({
          id,
          action: "approved",
          comment: "Looks good",
          author_email: "spoof@example.com",
        }),
      )
    ).status,
  ).toBe(200);
  expect(mocks.query.mock.calls[1][1]).toEqual([
    id,
    "approved",
    "reviewer@example.com",
    expect.any(String),
    "Looks good",
  ]);
});
it("rejects a decision that changed concurrently and requires rejection reasons", async () => {
  mocks.query.mockResolvedValueOnce({ rows: [] });
  expect((await PUT(request({ id, action: "approved" }))).status).toBe(409);
});

it("requires a reason before rejecting", async () => {
  expect((await PUT(request({ id, action: "rejected" }))).status).toBe(400);
});
