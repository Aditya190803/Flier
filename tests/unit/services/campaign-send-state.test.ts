/**
 * Unit tests for chunked campaign send-state persistence
 * (lib/services/campaign-send-state.ts).
 */
import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

import { databases, config } from "@/lib/appwrite-server";
import {
  loadCampaignSendState,
  persistCampaignSendState,
  toAppwriteDocId,
} from "@/lib/services/campaign-send-state";

vi.mock("@/lib/appwrite-server", () => ({
  databases: {
    getDocument: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
  },
  config: {
    databaseId: "test-db",
    campaignsCollectionId: "campaigns",
  },
  Query: {
    equal: vi.fn((field: string, value: string) => `${field}=${value}`),
    limit: vi.fn((n: number) => `limit:${n}`),
  },
  ID: { unique: vi.fn(() => "unique-id") },
}));

vi.mock("@/lib/logger", () => ({
  apiLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

describe("toAppwriteDocId", () => {
  it("returns short, safe ids unchanged", () => {
    expect(toAppwriteDocId("campaign_123_abc")).toBe("campaign_123_abc");
  });

  it("derives a safe, deterministic id for unsafe/oversized ids", () => {
    const long = "a".repeat(250);
    const first = toAppwriteDocId(long);
    const second = toAppwriteDocId(long);
    expect(first).toBe(second);
    expect(first.length).toBeLessThanOrEqual(36);
    expect(first).toMatch(/^[a-f0-9]+$/);
  });

  it("hashes ids containing disallowed characters", () => {
    const unsafe = "campaign with spaces/slashes";
    const result = toAppwriteDocId(unsafe);
    expect(result).not.toBe(unsafe);
    expect(result.length).toBeLessThanOrEqual(36);
  });
});

describe("loadCampaignSendState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty state when no document exists yet", async () => {
    (databases.getDocument as any).mockRejectedValueOnce(
      new Error("not found"),
    );

    const state = await loadCampaignSendState("campaign_1", "user@example.com");

    expect(state.exists).toBe(false);
    expect(state.processedEmails.size).toBe(0);
    expect(state.results).toEqual([]);
    expect(state.sent).toBe(0);
    expect(state.failed).toBe(0);
  });

  it("parses previously persisted results into a lookup set", async () => {
    (databases.getDocument as any).mockResolvedValueOnce({
      user_email: "user@example.com",
      sent: 2,
      failed: 1,
      status: "partial",
      send_results: JSON.stringify([
        { email: "a@example.com", status: "success" },
        { email: "b@example.com", status: "success" },
        { email: "c@example.com", status: "error", error: "boom" },
      ]),
    });

    const state = await loadCampaignSendState("campaign_2", "user@example.com");

    expect(state.exists).toBe(true);
    expect(state.sent).toBe(2);
    expect(state.failed).toBe(1);
    expect(state.processedEmails.has("a@example.com")).toBe(true);
    expect(state.processedEmails.has("b@example.com")).toBe(true);
    expect(state.processedEmails.has("c@example.com")).toBe(true);
    expect(state.processedEmails.has("nobody@example.com")).toBe(false);
  });

  it("treats a document owned by a different user as empty", async () => {
    (databases.getDocument as any).mockResolvedValueOnce({
      user_email: "someone-else@example.com",
      sent: 5,
      failed: 0,
      status: "completed",
      send_results: JSON.stringify([
        { email: "a@example.com", status: "success" },
      ]),
    });

    const state = await loadCampaignSendState("campaign_3", "user@example.com");

    expect(state.exists).toBe(false);
    expect(state.processedEmails.size).toBe(0);
  });

  it("returns an empty state when the collection isn't configured", async () => {
    const originalDbId = config.databaseId;
    (config as any).databaseId = "";

    const state = await loadCampaignSendState("campaign_4", "user@example.com");

    expect(state.exists).toBe(false);
    expect(databases.getDocument).not.toHaveBeenCalled();

    (config as any).databaseId = originalDbId;
  });
});

describe("persistCampaignSendState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new document with the full recipient list on first persist", async () => {
    await persistCampaignSendState({
      campaignId: "campaign_5",
      docId: "campaign_5",
      existed: false,
      userEmail: "user@example.com",
      subject: "Hello",
      content: "<p>Hi</p>",
      fullRecipients: ["a@example.com", "b@example.com"],
      allResults: [{ email: "a@example.com", status: "success" }],
      sentDelta: 1,
      failedDelta: 0,
      previousSent: 0,
      previousFailed: 0,
      done: false,
    });

    expect(databases.createDocument).toHaveBeenCalledTimes(1);
    const [, , docId, data] = (databases.createDocument as any).mock.calls[0];
    expect(docId).toBe("campaign_5");
    expect(data.status).toBe("partial");
    expect(data.sent).toBe(1);
    expect(data.failed).toBe(0);
    expect(JSON.parse(data.recipients)).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("updates an existing document without touching recipients/subject", async () => {
    await persistCampaignSendState({
      campaignId: "campaign_6",
      docId: "campaign_6",
      existed: true,
      userEmail: "user@example.com",
      fullRecipients: ["a@example.com", "b@example.com"],
      allResults: [
        { email: "a@example.com", status: "success" },
        { email: "b@example.com", status: "success" },
      ],
      sentDelta: 1,
      failedDelta: 0,
      previousSent: 1,
      previousFailed: 0,
      done: true,
    });

    expect(databases.updateDocument).toHaveBeenCalledTimes(1);
    const [, , docId, data] = (databases.updateDocument as any).mock.calls[0];
    expect(docId).toBe("campaign_6");
    expect(data.sent).toBe(2);
    expect(data.status).toBe("completed");
    expect(data.recipients).toBeUndefined();
  });

  it("marks a completed campaign as failed when every send failed", async () => {
    await persistCampaignSendState({
      campaignId: "campaign_failed",
      docId: "campaign_failed",
      existed: true,
      userEmail: "user@example.com",
      fullRecipients: ["a@example.com"],
      allResults: [
        { email: "a@example.com", status: "error", error: "Rejected" },
      ],
      sentDelta: 0,
      failedDelta: 1,
      previousSent: 0,
      previousFailed: 0,
      done: true,
    });

    const [, , , data] = (databases.updateDocument as any).mock.calls[0];
    expect(data.status).toBe("failed");
  });

  it("swallows persistence errors instead of throwing", async () => {
    (databases.createDocument as any).mockRejectedValueOnce(
      new Error("Appwrite down"),
    );

    await expect(
      persistCampaignSendState({
        campaignId: "campaign_7",
        docId: "campaign_7",
        existed: false,
        userEmail: "user@example.com",
        fullRecipients: ["a@example.com"],
        allResults: [],
        sentDelta: 0,
        failedDelta: 0,
        previousSent: 0,
        previousFailed: 0,
        done: false,
      }),
    ).resolves.toBeUndefined();
  });
});
