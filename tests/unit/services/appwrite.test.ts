/**
 * Unit tests for Appwrite services
 * Tests all CRUD operations for contacts, campaigns, templates, etc.
 */

import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

// Mock the fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import services after mocking
import {
  contactsService,
  campaignsService,
  templatesService,
  contactGroupsService,
  draftEmailsService,
  signaturesService,
  unsubscribesService,
} from "@/lib/appwrite";

describe("Contacts Service", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("listByUser", () => {
    it("should fetch contacts for authenticated user", async () => {
      const mockContacts = {
        total: 2,
        documents: [
          {
            $id: "1",
            email: "john@example.com",
            name: "John",
            user_email: "test@example.com",
          },
          {
            $id: "2",
            email: "jane@example.com",
            name: "Jane",
            user_email: "test@example.com",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockContacts,
      });

      const result = await contactsService.listByUser("test@example.com");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/appwrite/contacts",
        expect.any(Object),
      );
      expect(result.total).toBe(2);
      expect(result.documents).toHaveLength(2);
    });

    it("should handle empty contacts list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 0, documents: [] }),
      });

      const result = await contactsService.listByUser("test@example.com");

      expect(result.total).toBe(0);
      expect(result.documents).toHaveLength(0);
    });
  });

  describe("create", () => {
    it("should create a new contact", async () => {
      const newContact = {
        email: "new@example.com",
        name: "New User",
        company: "Test Corp",
        phone: "123-456-7890",
        user_email: "test@example.com",
      };

      const mockResponse = {
        $id: "123",
        ...newContact,
        created_at: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await contactsService.create(newContact);

      expect(mockFetch).toHaveBeenCalledWith("/api/appwrite/contacts", {
        method: "POST",
        body: JSON.stringify(newContact),
        headers: { "Content-Type": "application/json" },
      });
      expect(result.email).toBe("new@example.com");
    });

    it("should handle creation error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Failed to create contact" }),
      });

      await expect(
        contactsService.create({
          email: "test@example.com",
          user_email: "test@example.com",
        }),
      ).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("should delete a contact", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await contactsService.delete("contact-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/appwrite/contacts?id=contact-123",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );
    });
  });
});

describe("Campaigns Service", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("listByUser", () => {
    it("should fetch campaigns with parsed JSON fields", async () => {
      const mockCampaigns = {
        total: 1,
        documents: [
          {
            $id: "1",
            subject: "Test Campaign",
            content: "<p>Hello</p>",
            recipients: ["a@test.com", "b@test.com"],
            sent: 2,
            failed: 0,
            status: "completed",
            created_at: new Date().toISOString(),
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCampaigns,
      });

      const result = await campaignsService.listByUser("test@example.com");

      expect(result.total).toBe(1);
      expect(result.documents[0].subject).toBe("Test Campaign");
    });
  });

  describe("create", () => {
    it("should create a new campaign", async () => {
      const newCampaign = {
        subject: "Newsletter",
        content: "<p>Content</p>",
        recipients: ["user@example.com"],
        sent: 1,
        failed: 0,
        status: "completed" as const,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          $id: "123",
          ...newCampaign,
          created_at: new Date().toISOString(),
        }),
      });

      const result = await campaignsService.create(newCampaign);

      expect(result.subject).toBe("Newsletter");
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/appwrite/campaigns",
        expect.any(Object),
      );
    });
  });
});

describe("Templates Service", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("listByUser", () => {
    it("should fetch templates", async () => {
      const mockTemplates = {
        total: 2,
        documents: [
          {
            $id: "1",
            name: "Welcome",
            subject: "Welcome!",
            content: "<p>Hello</p>",
          },
          {
            $id: "2",
            name: "Follow Up",
            subject: "Following up",
            content: "<p>Hi</p>",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTemplates,
      });

      const result = await templatesService.listByUser("test@example.com");

      expect(result.total).toBe(2);
    });
  });

  describe("create", () => {
    it("should create a new template", async () => {
      const newTemplate = {
        name: "New Template",
        subject: "Subject Line",
        content: "<p>Template content</p>",
        user_email: "test@example.com",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ $id: "123", ...newTemplate }),
      });

      const result = await templatesService.create(newTemplate);

      expect(result.name).toBe("New Template");
    });
  });

  describe("update", () => {
    it("should update an existing template", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ $id: "123", name: "Updated Template" }),
      });

      const result = await templatesService.update("123", {
        name: "Updated Template",
      });

      expect(result.name).toBe("Updated Template");
    });
  });

  describe("delete", () => {
    it("should delete a template", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await templatesService.delete("template-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/appwrite/templates?id=template-123",
        expect.any(Object),
      );
    });
  });
});

describe("Contact Groups Service", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("listByUser", () => {
    it("should fetch contact groups", async () => {
      const mockGroups = {
        total: 1,
        documents: [
          {
            $id: "1",
            name: "VIP Clients",
            contact_ids: ["c1", "c2"],
            color: "#ff0000",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGroups,
      });

      const result = await contactGroupsService.listByUser("test@example.com");

      expect(result.documents[0].name).toBe("VIP Clients");
    });
  });

  describe("addContacts", () => {
    it("should add contacts to a group", async () => {
      // First call for getting the group
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total: 1,
          documents: [{ $id: "g1", name: "Test", contact_ids: ["c1"] }],
        }),
      });

      // Second call for updating
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          $id: "g1",
          name: "Test",
          contact_ids: ["c1", "c2"],
        }),
      });

      const _result = await contactGroupsService.addContacts("g1", ["c2"]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe("Draft Emails Service", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("create", () => {
    it("should create a draft email", async () => {
      const draftEmail = {
        subject: "Draft Newsletter",
        content: "<p>Content</p>",
        recipients: ["user@example.com"],
        saved_at: new Date(Date.now() + 86400000).toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ $id: "123", ...draftEmail, status: "pending" }),
      });

      const result = await draftEmailsService.create(draftEmail);

      expect(result.status).toBe("pending");
    });
  });

  describe("cancel", () => {
    it("should cancel a draft email", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ $id: "123", status: "cancelled" }),
      });

      const result = await draftEmailsService.cancel("123");

      expect(result.status).toBe("cancelled");
    });
  });
});

describe("Signatures Service", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("create", () => {
    it("should create a new signature", async () => {
      const signature = {
        name: "Professional",
        content: "<p>Best regards,<br>John</p>",
        is_default: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ $id: "123", ...signature }),
      });

      const result = await signaturesService.create(signature);

      expect(result.name).toBe("Professional");
      expect(result.is_default).toBe(true);
    });
  });

  describe("getDefault", () => {
    it("should fetch the default signature", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total: 1,
          documents: [{ $id: "1", name: "Default Sig", is_default: true }],
        }),
      });

      const result = await signaturesService.getDefault("test@example.com");

      expect(result?.is_default).toBe(true);
    });

    it("should return null if no default signature", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 0, documents: [] }),
      });

      const result = await signaturesService.getDefault("test@example.com");

      expect(result).toBeNull();
    });
  });
});

describe("Unsubscribes Service", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("isUnsubscribed", () => {
    it("should check if email is unsubscribed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ isUnsubscribed: true }),
      });

      const result = await unsubscribesService.isUnsubscribed(
        "test@example.com",
        "unsubscribed@example.com",
      );

      expect(result).toBe(true);
    });
  });

  describe("filterUnsubscribed", () => {
    it("should filter out unsubscribed emails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          emails: ["active1@example.com", "active2@example.com"],
        }),
      });

      const emails = [
        "active1@example.com",
        "unsubscribed@example.com",
        "active2@example.com",
      ];
      const result = await unsubscribesService.filterUnsubscribed(
        "test@example.com",
        emails,
      );

      expect(result).toHaveLength(2);
      expect(result).not.toContain("unsubscribed@example.com");
    });
  });

  describe("create", () => {
    it("should add an unsubscribe", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          $id: "123",
          email: "unsub@example.com",
          reason: "Not interested",
        }),
      });

      const result = await unsubscribesService.create({
        email: "unsub@example.com",
        reason: "Not interested",
        user_email: "test@example.com",
      });

      expect(result.email).toBe("unsub@example.com");
    });
  });
});
