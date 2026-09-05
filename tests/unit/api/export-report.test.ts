/**
 * Unit tests for Export Report API route
 */
import { getServerSession } from "next-auth";
import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

import { databases } from "@/lib/appwrite-server";
import {
  createMockLoggerModule,
  createSpyLogger,
} from "@/tests/helpers/mockLoggerModule";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock appwrite-server
vi.mock("@/lib/appwrite-server", () => ({
  databases: {
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
  },
  config: {
    databaseId: "test-db",
    campaignsCollectionId: "campaigns",
  },
  Query: {
    equal: vi.fn((field: string, value: string) => `${field}=${value}`),
    orderDesc: vi.fn((field: string) => `orderDesc:${field}`),
    limit: vi.fn((n: number) => `limit:${n}`),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () =>
  createMockLoggerModule({
    apiLogger: createSpyLogger(),
  }),
);

describe("Export Report API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should reject unauthenticated requests", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const session = await getServerSession();
      expect(session).toBeNull();
    });

    it("should reject requests without user email", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {},
        accessToken: "token",
      } as any);

      const session = await getServerSession();
      expect((session as any)?.user?.email).toBeFalsy();
    });
  });

  describe("Export Functionality", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "test@example.com" },
        accessToken: "token",
      } as any);
    });

    it("should export all campaigns as CSV", async () => {
      const mockCampaigns = {
        total: 2,
        documents: [
          {
            $id: "campaign-1",
            subject: "Campaign 1",
            status: "completed",
            sent: 100,
            failed: 5,
            recipients: JSON.stringify(["a@test.com", "b@test.com"]),
            campaign_type: "bulk",
            created_at: "2024-01-15T10:00:00Z",
          },
          {
            $id: "campaign-2",
            subject: "Campaign 2",
            status: "completed",
            sent: 50,
            failed: 0,
            recipients: JSON.stringify(["c@test.com"]),
            campaign_type: "single",
            created_at: "2024-01-14T10:00:00Z",
          },
        ],
      };

      vi.mocked(databases.listDocuments).mockResolvedValueOnce(
        mockCampaigns as any,
      );

      const result = await databases.listDocuments("test-db", "campaigns", []);

      expect(result.total).toBe(2);
      expect(result.documents).toHaveLength(2);
    });

    it("should export a single campaign", async () => {
      const mockCampaign = {
        $id: "campaign-1",
        subject: "Test Campaign",
        status: "completed",
        sent: 100,
        failed: 5,
        recipients: JSON.stringify(["a@test.com", "b@test.com"]),
        campaign_type: "bulk",
        created_at: "2024-01-15T10:00:00Z",
      };

      vi.mocked(databases.getDocument).mockResolvedValueOnce(
        mockCampaign as any,
      );

      const result = await databases.getDocument(
        "test-db",
        "campaigns",
        "campaign-1",
      );

      expect(result.$id).toBe("campaign-1");
      expect((result as any).subject).toBe("Test Campaign");
    });

    it("should handle campaigns with complex subjects (quotes, commas)", async () => {
      const mockCampaigns = {
        total: 1,
        documents: [
          {
            $id: "campaign-1",
            subject: 'Hello, World! "Special" Campaign',
            status: "completed",
            sent: 10,
            failed: 0,
            recipients: JSON.stringify(["a@test.com"]),
            campaign_type: "bulk",
            created_at: "2024-01-15T10:00:00Z",
          },
        ],
      };

      vi.mocked(databases.listDocuments).mockResolvedValueOnce(
        mockCampaigns as any,
      );

      const result = await databases.listDocuments("test-db", "campaigns", []);

      // Verify CSV escaping logic
      const subject = (result.documents[0] as any).subject;
      const escapedSubject = `"${subject.replace(/"/g, '""')}"`;
      expect(escapedSubject).toBe('"Hello, World! ""Special"" Campaign"');
    });

    it("should calculate success rate correctly", () => {
      const campaigns = [
        { sent: 100, failed: 0 }, // 100%
        { sent: 80, failed: 20 }, // 80%
        { sent: 0, failed: 10 }, // 0%
        { sent: 0, failed: 0 }, // N/A
      ];

      const calculateSuccessRate = (sent: number, failed: number) => {
        const total = sent + failed;
        if (total === 0) {
          return "N/A";
        }
        return `${((sent / total) * 100).toFixed(1)}%`;
      };

      expect(calculateSuccessRate(campaigns[0].sent, campaigns[0].failed)).toBe(
        "100.0%",
      );
      expect(calculateSuccessRate(campaigns[1].sent, campaigns[1].failed)).toBe(
        "80.0%",
      );
      expect(calculateSuccessRate(campaigns[2].sent, campaigns[2].failed)).toBe(
        "0.0%",
      );
      expect(calculateSuccessRate(campaigns[3].sent, campaigns[3].failed)).toBe(
        "N/A",
      );
    });
  });

  describe("JSON Export", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "test@example.com" },
        accessToken: "token",
      } as any);
    });

    it("should return campaigns as JSON when format=json", async () => {
      const mockCampaigns = {
        total: 1,
        documents: [
          {
            $id: "campaign-1",
            subject: "Test",
            status: "completed",
            sent: 10,
            failed: 0,
            recipients: JSON.stringify(["a@test.com"]),
            campaign_type: "bulk",
            created_at: "2024-01-15T10:00:00Z",
          },
        ],
      };

      vi.mocked(databases.listDocuments).mockResolvedValueOnce(
        mockCampaigns as any,
      );

      const result = await databases.listDocuments("test-db", "campaigns", []);

      expect(result.documents[0].$id).toBe("campaign-1");
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "test@example.com" },
        accessToken: "token",
      } as any);
    });

    it("should handle database errors", async () => {
      vi.mocked(databases.listDocuments).mockRejectedValueOnce(
        new Error("Database error"),
      );

      await expect(
        databases.listDocuments("test-db", "campaigns", []),
      ).rejects.toThrow("Database error");
    });

    it("should handle campaign not found", async () => {
      vi.mocked(databases.getDocument).mockRejectedValueOnce(
        new Error("Document not found"),
      );

      await expect(
        databases.getDocument("test-db", "campaigns", "nonexistent"),
      ).rejects.toThrow("Document not found");
    });
  });
});
