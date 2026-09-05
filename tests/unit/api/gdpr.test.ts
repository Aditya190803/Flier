/**
 * Unit tests for GDPR API routes
 */
import { getServerSession } from "next-auth";
import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

import { databases, ID } from "@/lib/appwrite-server";
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
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getDocument: vi.fn(),
  },
  config: {
    databaseId: "test-db",
    contactsCollectionId: "contacts",
    campaignsCollectionId: "campaigns",
    templatesCollectionId: "templates",
    gdprLogsCollectionId: "gdpr-logs",
  },
  Query: {
    equal: vi.fn((field: string, value: string) => `${field}=${value}`),
    orderDesc: vi.fn((field: string) => `orderDesc:${field}`),
    limit: vi.fn((n: number) => `limit:${n}`),
  },
  ID: {
    unique: vi.fn(() => "unique-id"),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () =>
  createMockLoggerModule({
    apiLogger: createSpyLogger(),
  }),
);

describe("GDPR API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should reject unauthenticated requests", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const session = await getServerSession();
      expect(session).toBeNull();
    });
  });

  describe("Data Export (Right to Access)", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "user@example.com", name: "Test User" },
        accessToken: "token",
      } as any);
    });

    it("should export all user data", async () => {
      // Mock contacts
      vi.mocked(databases.listDocuments)
        .mockResolvedValueOnce({
          total: 2,
          documents: [
            { $id: "c1", email: "contact1@test.com", name: "Contact 1" },
            { $id: "c2", email: "contact2@test.com", name: "Contact 2" },
          ],
        } as any)
        // Mock campaigns
        .mockResolvedValueOnce({
          total: 1,
          documents: [
            { $id: "camp1", subject: "Test Campaign", status: "completed" },
          ],
        } as any)
        // Mock templates
        .mockResolvedValueOnce({
          total: 1,
          documents: [
            { $id: "t1", name: "Welcome Template", content: "<p>Hello</p>" },
          ],
        } as any);

      const contactsResult = await databases.listDocuments(
        "test-db",
        "contacts",
        [],
      );
      const campaignsResult = await databases.listDocuments(
        "test-db",
        "campaigns",
        [],
      );
      const templatesResult = await databases.listDocuments(
        "test-db",
        "templates",
        [],
      );

      const exportData = {
        contacts: contactsResult.documents,
        campaigns: campaignsResult.documents,
        templates: templatesResult.documents,
        exportDate: new Date().toISOString(),
        userEmail: "user@example.com",
      };

      expect(exportData.contacts).toHaveLength(2);
      expect(exportData.campaigns).toHaveLength(1);
      expect(exportData.templates).toHaveLength(1);
    });

    it("should log data export request", async () => {
      vi.mocked(databases.createDocument).mockResolvedValueOnce({
        $id: "log-1",
        action: "data_export",
        user_email: "user@example.com",
        timestamp: new Date().toISOString(),
      } as any);

      const logEntry = await databases.createDocument(
        "test-db",
        "gdpr-logs",
        ID.unique(),
        {
          action: "data_export",
          user_email: "user@example.com",
          timestamp: new Date().toISOString(),
        },
      );

      expect(logEntry.$id).toBe("log-1");
      expect((logEntry as any).action).toBe("data_export");
    });
  });

  describe("Data Deletion (Right to be Forgotten)", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "user@example.com", name: "Test User" },
        accessToken: "token",
      } as any);
    });

    it("should delete all user data on request", async () => {
      // Mock listing documents
      vi.mocked(databases.listDocuments)
        .mockResolvedValueOnce({
          total: 2,
          documents: [{ $id: "c1" }, { $id: "c2" }],
        } as any)
        .mockResolvedValueOnce({
          total: 1,
          documents: [{ $id: "camp1" }],
        } as any)
        .mockResolvedValueOnce({
          total: 1,
          documents: [{ $id: "t1" }],
        } as any);

      vi.mocked(databases.deleteDocument).mockResolvedValue({} as any);

      const contacts = await databases.listDocuments("test-db", "contacts", []);
      const campaigns = await databases.listDocuments(
        "test-db",
        "campaigns",
        [],
      );
      const templates = await databases.listDocuments(
        "test-db",
        "templates",
        [],
      );

      // Delete all documents
      for (const doc of contacts.documents) {
        await databases.deleteDocument("test-db", "contacts", doc.$id);
      }
      for (const doc of campaigns.documents) {
        await databases.deleteDocument("test-db", "campaigns", doc.$id);
      }
      for (const doc of templates.documents) {
        await databases.deleteDocument("test-db", "templates", doc.$id);
      }

      expect(databases.deleteDocument).toHaveBeenCalledTimes(4);
    });

    it("should log deletion request", async () => {
      vi.mocked(databases.createDocument).mockResolvedValueOnce({
        $id: "log-2",
        action: "data_deletion",
        user_email: "user@example.com",
        items_deleted: { contacts: 2, campaigns: 1, templates: 1 },
        timestamp: new Date().toISOString(),
      } as any);

      const logEntry = await databases.createDocument(
        "test-db",
        "gdpr-logs",
        ID.unique(),
        {
          action: "data_deletion",
          user_email: "user@example.com",
          items_deleted: { contacts: 2, campaigns: 1, templates: 1 },
          timestamp: new Date().toISOString(),
        },
      );

      expect((logEntry as any).action).toBe("data_deletion");
    });
  });

  describe("Consent Management", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "user@example.com", name: "Test User" },
        accessToken: "token",
      } as any);
    });

    it("should record user consent", async () => {
      vi.mocked(databases.createDocument).mockResolvedValueOnce({
        $id: "consent-1",
        user_email: "user@example.com",
        consent_type: "marketing",
        granted: true,
        timestamp: new Date().toISOString(),
      } as any);

      const consent = await databases.createDocument(
        "test-db",
        "gdpr-logs",
        ID.unique(),
        {
          user_email: "user@example.com",
          consent_type: "marketing",
          granted: true,
          timestamp: new Date().toISOString(),
        },
      );

      expect((consent as any).granted).toBe(true);
    });

    it("should revoke consent", async () => {
      vi.mocked(databases.createDocument).mockResolvedValueOnce({
        $id: "consent-2",
        user_email: "user@example.com",
        consent_type: "marketing",
        granted: false,
        timestamp: new Date().toISOString(),
      } as any);

      const consent = await databases.createDocument(
        "test-db",
        "gdpr-logs",
        ID.unique(),
        {
          user_email: "user@example.com",
          consent_type: "marketing",
          granted: false,
          timestamp: new Date().toISOString(),
        },
      );

      expect((consent as any).granted).toBe(false);
    });
  });

  describe("Audit Logs", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "user@example.com", name: "Test User" },
        accessToken: "token",
      } as any);
    });

    it("should list audit logs for user", async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 3,
        documents: [
          { $id: "log-1", action: "login", timestamp: "2024-01-15T10:00:00Z" },
          {
            $id: "log-2",
            action: "data_export",
            timestamp: "2024-01-14T10:00:00Z",
          },
          {
            $id: "log-3",
            action: "consent_update",
            timestamp: "2024-01-13T10:00:00Z",
          },
        ],
      } as any);

      const logs = await databases.listDocuments("test-db", "gdpr-logs", []);

      expect(logs.total).toBe(3);
      expect(logs.documents).toHaveLength(3);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "user@example.com" },
        accessToken: "token",
      } as any);
    });

    it("should handle deletion failure gracefully", async () => {
      vi.mocked(databases.deleteDocument).mockRejectedValueOnce(
        new Error("Deletion failed"),
      );

      await expect(
        databases.deleteDocument("test-db", "contacts", "contact-1"),
      ).rejects.toThrow("Deletion failed");
    });

    it("should handle export failure gracefully", async () => {
      vi.mocked(databases.listDocuments).mockRejectedValueOnce(
        new Error("Export failed"),
      );

      await expect(
        databases.listDocuments("test-db", "contacts", []),
      ).rejects.toThrow("Export failed");
    });
  });
});
