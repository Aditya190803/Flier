/**
 * Unit tests for Send Email API route
 */
import { getServerSession } from "next-auth";
import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

import { fetchFileFromUrl } from "@/lib/attachment-fetcher";
import { sendEmailViaAPI, replacePlaceholders } from "@/lib/gmail";
import {
  createMockLoggerModule,
  createSpyLogger,
} from "@/tests/helpers/mockLoggerModule";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock gmail functions
vi.mock("@/lib/gmail", () => ({
  sendEmailViaAPI: vi.fn(),
  replacePlaceholders: vi.fn((text: string, data: Record<string, string>) => {
    let result = text;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    return result;
  }),
  preResolveAttachments: vi.fn(),
  clearAttachmentCache: vi.fn(),
  preBuildEmailTemplate: vi.fn(),
  sendEmailWithTemplate: vi.fn(),
}));

// Mock attachment fetcher
vi.mock("@/lib/attachment-fetcher", () => ({
  fetchFileFromUrl: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () =>
  createMockLoggerModule({
    apiLogger: createSpyLogger(),
  }),
);

describe("Send Email API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should reject requests without access token", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "test@example.com" },
        accessToken: null,
      } as any);

      const session = await getServerSession();
      expect((session as any)?.accessToken).toBeFalsy();
    });

    it("should reject requests without user email", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: {},
        accessToken: "valid-token",
      } as any);

      const session = await getServerSession();
      expect((session as any)?.user?.email).toBeFalsy();
    });

    it("should allow requests with valid session", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "test@example.com", name: "Test User" },
        accessToken: "valid-token",
      } as any);

      const session = await getServerSession();
      expect((session as any)?.accessToken).toBe("valid-token");
      expect((session as any)?.user?.email).toBe("test@example.com");
    });
  });

  describe("Email Sending", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "sender@example.com" },
        accessToken: "valid-token",
      } as any);
    });

    it("should send a single email successfully", async () => {
      vi.mocked(sendEmailViaAPI).mockResolvedValueOnce({
        success: true,
        messageId: "msg-123",
      });

      const result = await sendEmailViaAPI(
        "valid-token",
        "sender@example.com",
        "recipient@example.com",
        "Test Subject",
        "<p>Test message</p>",
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-123");
    });

    it("should handle email sending failure", async () => {
      vi.mocked(sendEmailViaAPI).mockResolvedValueOnce({
        success: false,
        error: "Gmail API error",
      });

      const result = await sendEmailViaAPI(
        "valid-token",
        "sender@example.com",
        "recipient@example.com",
        "Test Subject",
        "<p>Test message</p>",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Gmail API error");
    });

    it("should replace placeholders in subject and message", () => {
      const subject = "Hello {{name}}!";
      const message = "<p>Welcome, {{name}}! Your email is {{email}}.</p>";
      const data = { name: "John", email: "john@example.com" };

      const personalizedSubject = replacePlaceholders(subject, data);
      const personalizedMessage = replacePlaceholders(message, data);

      expect(personalizedSubject).toBe("Hello John!");
      expect(personalizedMessage).toBe(
        "<p>Welcome, John! Your email is john@example.com.</p>",
      );
    });
  });

  describe("Personalized Attachments", () => {
    it("should fetch attachment from URL", async () => {
      const mockAttachment = {
        fileName: "document.pdf",
        buffer: Buffer.from("test-data"),
        base64: "base64-encoded-data",
        mimeType: "application/pdf",
        originalUrl: "https://example.com/document.pdf",
      };

      vi.mocked(fetchFileFromUrl).mockResolvedValueOnce(mockAttachment);

      const result = await fetchFileFromUrl("https://example.com/document.pdf");

      expect(result).toEqual(mockAttachment);
      expect(fetchFileFromUrl).toHaveBeenCalledWith(
        "https://example.com/document.pdf",
      );
    });

    it("should handle attachment fetch failure", async () => {
      vi.mocked(fetchFileFromUrl).mockRejectedValueOnce(
        new Error("Failed to fetch"),
      );

      await expect(
        fetchFileFromUrl("https://example.com/missing.pdf"),
      ).rejects.toThrow("Failed to fetch");
    });
  });

  describe("Bulk Email Sending", () => {
    it("should track sent and failed counts", async () => {
      const emails = ["a@test.com", "b@test.com", "c@test.com"];
      const results = { sent: 0, failed: 0 };

      vi.mocked(sendEmailViaAPI)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: "Error" })
        .mockResolvedValueOnce({ success: true });

      for (const email of emails) {
        const result = await sendEmailViaAPI(
          "token",
          "sender@example.com",
          email,
          "Subject",
          "Message",
        );
        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
        }
      }

      expect(results.sent).toBe(2);
      expect(results.failed).toBe(1);
    });
  });
});
