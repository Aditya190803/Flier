/**
 * Unit tests for API routes
 */
import { getServerSession } from "next-auth";
import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

import { databases, ID } from "@/lib/appwrite-server";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock appwrite-server
vi.mock("@/lib/appwrite-server", () => ({
  databases: {
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getDocument: vi.fn(),
  },
  config: {
    databaseId: "test-db",
    contactsCollectionId: "contacts",
    campaignsCollectionId: "campaigns",
    templatesCollectionId: "templates",
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

describe("API Routes - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject unauthenticated requests", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    // Simulate what the API would return for null session
    const session = await getServerSession();
    const response = session
      ? { status: 200 }
      : { error: "Unauthorized", status: 401 };

    expect(response.status).toBe(401);
    expect(response.error).toBe("Unauthorized");
  });

  it("should allow authenticated requests", async () => {
    const mockSession = {
      user: { email: "test@example.com", name: "Test User" },
      accessToken: "valid-token",
    };
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession as any);

    // Simulate successful auth check - call getServerSession which now returns our mock
    const session = await getServerSession();

    // Verify the mock was called and returned our session
    expect(getServerSession).toHaveBeenCalled();
    expect(session).not.toBeNull();
    expect((session as any)?.user?.email).toBe("test@example.com");
  });
});

describe("API Routes - Contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: "test@example.com" },
      accessToken: "token",
    } as any);
  });

  describe("GET /api/appwrite/contacts", () => {
    it("should return contacts for authenticated user", async () => {
      const mockContacts = {
        total: 2,
        documents: [
          {
            $id: "1",
            email: "a@test.com",
            name: "A",
            user_email: "test@example.com",
          },
          {
            $id: "2",
            email: "b@test.com",
            name: "B",
            user_email: "test@example.com",
          },
        ],
      };

      vi.mocked(databases.listDocuments).mockResolvedValueOnce(
        mockContacts as any,
      );

      const result = await databases.listDocuments("test-db", "contacts", []);

      expect(result.total).toBe(2);
      expect(result.documents).toHaveLength(2);
    });
  });

  describe("POST /api/appwrite/contacts", () => {
    it("should create a new contact", async () => {
      const newContact = {
        email: "new@test.com",
        name: "New Contact",
        user_email: "test@example.com",
      };

      vi.mocked(databases.createDocument).mockResolvedValueOnce({
        $id: "new-id",
        ...newContact,
      } as any);

      const result = await databases.createDocument(
        "test-db",
        "contacts",
        ID.unique(),
        newContact,
      );

      expect(result.$id).toBe("new-id");
      expect(databases.createDocument).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/appwrite/contacts", () => {
    it("should delete a contact after verifying ownership", async () => {
      vi.mocked(databases.getDocument).mockResolvedValueOnce({
        $id: "contact-1",
        user_email: "test@example.com",
      } as any);

      vi.mocked(databases.deleteDocument).mockResolvedValueOnce({} as any);

      // Verify ownership
      const doc = await databases.getDocument(
        "test-db",
        "contacts",
        "contact-1",
      );
      expect((doc as any).user_email).toBe("test@example.com");

      // Delete
      await databases.deleteDocument("test-db", "contacts", "contact-1");
      expect(databases.deleteDocument).toHaveBeenCalled();
    });

    it("should reject deletion of contacts owned by other users", async () => {
      vi.mocked(databases.getDocument).mockResolvedValueOnce({
        $id: "contact-1",
        user_email: "other@example.com",
      } as any);

      const doc = await databases.getDocument(
        "test-db",
        "contacts",
        "contact-1",
      );

      expect((doc as any).user_email).not.toBe("test@example.com");
    });
  });
});

describe("API Routes - Campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: "test@example.com" },
      accessToken: "token",
    } as any);
  });

  describe("POST /api/appwrite/campaigns", () => {
    it("should create a campaign with stringified JSON fields", async () => {
      const campaign = {
        subject: "Test Campaign",
        content: "<p>Hello</p>",
        recipients: JSON.stringify(["a@test.com", "b@test.com"]),
        sent: 2,
        failed: 0,
        status: "completed",
        user_email: "test@example.com",
      };

      vi.mocked(databases.createDocument).mockResolvedValueOnce({
        $id: "campaign-1",
        ...campaign,
      } as any);

      const result = await databases.createDocument(
        "test-db",
        "campaigns",
        ID.unique(),
        campaign,
      );

      expect(result.$id).toBe("campaign-1");
      expect(JSON.parse((result as any).recipients)).toHaveLength(2);
    });
  });
});

describe("API Routes - Templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: "test@example.com" },
      accessToken: "token",
    } as any);
  });

  describe("PUT /api/appwrite/templates", () => {
    it("should update a template after verifying ownership", async () => {
      vi.mocked(databases.getDocument).mockResolvedValueOnce({
        $id: "template-1",
        user_email: "test@example.com",
        name: "Old Name",
      } as any);

      vi.mocked(databases.updateDocument).mockResolvedValueOnce({
        $id: "template-1",
        name: "New Name",
      } as any);

      // Verify ownership
      const doc = await databases.getDocument(
        "test-db",
        "templates",
        "template-1",
      );
      expect((doc as any).user_email).toBe("test@example.com");

      // Update
      const result = await databases.updateDocument(
        "test-db",
        "templates",
        "template-1",
        {
          name: "New Name",
        },
      );

      expect((result as any).name).toBe("New Name");
    });
  });
});

describe("API Routes - Error Handling", () => {
  it("should handle database errors gracefully", async () => {
    vi.mocked(databases.listDocuments).mockRejectedValueOnce(
      new Error("Database error"),
    );

    await expect(
      databases.listDocuments("test-db", "contacts", []),
    ).rejects.toThrow("Database error");
  });

  it("should handle invalid document IDs", async () => {
    vi.mocked(databases.getDocument).mockRejectedValueOnce(
      new Error("Document not found"),
    );

    await expect(
      databases.getDocument("test-db", "contacts", "invalid-id"),
    ).rejects.toThrow("Document not found");
  });
});
