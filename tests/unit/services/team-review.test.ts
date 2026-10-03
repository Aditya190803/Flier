import { beforeEach, expect, it, vi } from "vite-plus/test";
const mocks = vi.hoisted(() => ({ members: vi.fn(), team: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/appwrite-server", () => ({
  databases: { listDocuments: mocks.members, getDocument: mocks.team },
  config: { databaseId: "db", teamsCollectionId: "teams", teamMembersCollectionId: "members" },
  Query: { equal: (key: string, value: string) => `${key}:${value}`, limit: () => "limit" },
}));
vi.mock("@/lib/db", () => ({ dbQuery: mocks.query }));
import {
  authorizeTeamCampaign,
  campaignSnapshotHash,
  getTeamPolicy,
} from "@/lib/services/team-review";
const snapshot = {
  subject: "Hello",
  content: "Message",
  recipients: ["reader@example.com"],
  scheduled_at: "2026-10-03T00:00:00Z",
  send_now: true,
  csv_data: [{ email: "reader@example.com", name: "Ada" }],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.members.mockResolvedValue({ documents: [{ role: "member" }] });
  mocks.team.mockResolvedValue({ settings: '{"require_approval":true}' });
});
it("fails closed for missing or inactive membership", async () => {
  mocks.members.mockResolvedValueOnce({ documents: [] });
  await expect(getTeamPolicy("team", "owner@example.com")).rejects.toThrow(
    "Active team membership",
  );
  expect(mocks.members.mock.calls[0][2]).toContain("status:active");
});
it("denies viewers and missing approval", async () => {
  mocks.members.mockResolvedValueOnce({ documents: [{ role: "viewer" }] });
  await expect(
    authorizeTeamCampaign("team", undefined, snapshot, "owner@example.com"),
  ).rejects.toThrow("Viewers");
  await expect(
    authorizeTeamCampaign("team", undefined, snapshot, "owner@example.com"),
  ).rejects.toThrow("Request team review");
});
it("requires the exact approved owner/team snapshot", async () => {
  mocks.query.mockResolvedValueOnce({ rows: [] });
  await expect(
    authorizeTeamCampaign("team", "review", snapshot, "owner@example.com"),
  ).rejects.toThrow("campaign changed");
  expect(mocks.query.mock.calls[0][1]).toEqual([
    "review",
    "team",
    "owner@example.com",
    campaignSnapshotHash(snapshot),
  ]);
});
it("allows sending without review only when the live team policy permits it", async () => {
  mocks.team.mockResolvedValueOnce({ settings: '{"require_approval":false}' });
  expect(
    await authorizeTeamCampaign("team", undefined, snapshot, "owner@example.com"),
  ).toBeUndefined();
  expect(mocks.query).not.toHaveBeenCalled();
});
it("ignores immediate timestamps/request IDs but binds content, options and recipient fields", () => {
  const hash = campaignSnapshotHash(snapshot);
  expect(
    campaignSnapshotHash({
      ...snapshot,
      scheduled_at: "2030-01-01T00:00:00Z",
      request_id: "different",
    }),
  ).toBe(hash);
  for (const changed of [
    { subject: "Changed" },
    { cc: ["other@example.com"] },
    { tracking_enabled: false },
    { csv_data: [{ email: "reader@example.com", name: "Other" }] },
    { attachments: [{ fileName: "secret.pdf", appwrite_file_id: "file" }] },
  ]) {
    expect(campaignSnapshotHash({ ...snapshot, ...changed })).not.toBe(hash);
  }
  expect(
    campaignSnapshotHash({ ...snapshot, csv_data: [{ name: "Ada", email: "reader@example.com" }] }),
  ).toBe(hash);
});
