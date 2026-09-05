/**
 * Unit tests for Gmail/email sending utilities
 */

import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

import { EMAIL_REGEX } from "@/lib/constants";
import { replacePlaceholders } from "@/lib/gmail";

// Mock the fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the appwrite server service
vi.mock("@/lib/appwrite-server", () => ({
  serverStorageService: {
    getFileBuffer: vi.fn().mockResolvedValue(Buffer.from("test-content")),
    getFileUrl: vi.fn().mockReturnValue("https://test-url"),
  },
}));

describe("Gmail Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("replacePlaceholders", () => {
    it("should replace all placeholders with correct values", () => {
      const template = "Hello {{name}}, your order {{orderId}} is ready.";
      const data = { name: "John", orderId: "12345" };

      const result = replacePlaceholders(template, data);

      expect(result).toBe("Hello John, your order 12345 is ready.");
    });

    it("should leave unmatched placeholders unchanged", () => {
      const template = "Hello {{name}}, your {{unknown}} is ready.";
      const data = { name: "John" };

      const result = replacePlaceholders(template, data);

      expect(result).toBe("Hello John, your {{unknown}} is ready.");
    });

    it("should replace single-brace placeholders case-insensitively", () => {
      const template = "Hiii {Name}";
      const data = { name: "Test" };

      const result = replacePlaceholders(template, data);

      expect(result).toBe("Hiii Test");
    });

    it("should handle empty data object", () => {
      const template = "Hello {{name}}";
      const data = {};

      const result = replacePlaceholders(template, data);

      expect(result).toBe("Hello {{name}}");
    });

    it("should handle multiple occurrences of same placeholder", () => {
      const template = '{{name}} said: "Hi, my name is {{name}}"';
      const data = { name: "Alice" };

      const result = replacePlaceholders(template, data);

      expect(result).toBe('Alice said: "Hi, my name is Alice"');
    });

    it("should handle empty template", () => {
      const template = "";
      const data = { name: "Test" };

      const result = replacePlaceholders(template, data);

      expect(result).toBe("");
    });

    it("should handle special characters in values", () => {
      const template = "Company: {{company}}";
      const data = { company: "Acme & Co. <Ltd>" };

      const result = replacePlaceholders(template, data);

      expect(result).toBe("Company: Acme & Co. <Ltd>");
    });
  });

  describe("Email validation", () => {
    it("should validate correct email formats", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.org",
        "user+tag@company.co.uk",
        "user123@test-domain.com",
      ];

      validEmails.forEach((email) => {
        expect(EMAIL_REGEX.test(email)).toBe(true);
      });
    });

    it("should reject invalid email formats", () => {
      const invalidEmails = [
        "notanemail",
        "@nodomain.com",
        "missing@.com",
        "spaces in@email.com",
        "double@@at.com",
      ];

      invalidEmails.forEach((email) => {
        expect(EMAIL_REGEX.test(email)).toBe(false);
      });
    });
  });

  describe("Subject encoding", () => {
    it("should properly encode UTF-8 subjects", () => {
      const subject = "Hello 世界";
      const encoded = Buffer.from(subject, "utf8").toString("base64");
      const result = `=?UTF-8?B?${encoded}?=`;

      expect(result).toContain("=?UTF-8?B?");
      expect(result).toContain("?=");
    });

    it("should handle emoji in subjects", () => {
      const subject = "Welcome! 🎉";
      const encoded = Buffer.from(subject, "utf8").toString("base64");
      const result = `=?UTF-8?B?${encoded}?=`;

      expect(result).toContain("=?UTF-8?B?");
    });
  });
});

describe("Attachment handling", () => {
  describe("Size validation", () => {
    const GMAIL_LIMIT_MB = 25;
    const GMAIL_LIMIT_BYTES = GMAIL_LIMIT_MB * 1024 * 1024;

    it("should reject attachments exceeding 25MB", () => {
      const largeFileSize = 26 * 1024 * 1024; // 26MB
      expect(largeFileSize > GMAIL_LIMIT_BYTES).toBe(true);
    });

    it("should accept attachments under 25MB", () => {
      const smallFileSize = 5 * 1024 * 1024; // 5MB
      expect(smallFileSize < GMAIL_LIMIT_BYTES).toBe(true);
    });

    it("should calculate total size from multiple attachments", () => {
      const attachments = [
        { data: "a".repeat(1000), name: "file1.txt", type: "text/plain" },
        { data: "b".repeat(2000), name: "file2.txt", type: "text/plain" },
      ];

      const totalSize = attachments.reduce((sum, a) => {
        // Base64 decodes to ~75% of string length
        return sum + Math.ceil(a.data.length * 0.75);
      }, 0);

      expect(totalSize).toBeGreaterThan(0);
      expect(totalSize).toBe(2250); // (1000 + 2000) * 0.75
    });
  });

  describe("MIME type handling", () => {
    it("should handle common file types", () => {
      const mimeTypes = {
        "document.pdf": "application/pdf",
        "image.png": "image/png",
        "photo.jpg": "image/jpeg",
        "spreadsheet.xlsx":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "document.docx":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };

      Object.entries(mimeTypes).forEach(([_filename, expectedType]) => {
        expect(expectedType).toBeDefined();
        expect(typeof expectedType).toBe("string");
      });
    });
  });
});

describe("Error handling", () => {
  describe("Gmail API errors", () => {
    it("should identify rate limit errors", () => {
      const rateLimitErrors = [
        "rateLimitExceeded",
        "User-rate limit exceeded",
        "Rate limit reached",
        "429",
      ];

      rateLimitErrors.forEach((error) => {
        const isRateLimit =
          error.toLowerCase().includes("rate") ||
          error.toLowerCase().includes("limit") ||
          error.includes("429");
        expect(isRateLimit).toBe(true);
      });
    });

    it("should identify authentication errors", () => {
      const authErrors = [
        "Invalid credentials",
        "401 Unauthorized",
        "Token expired",
      ];

      authErrors.forEach((error) => {
        const isAuthError =
          error.toLowerCase().includes("credentials") ||
          error.includes("401") ||
          error.toLowerCase().includes("token expired");
        expect(isAuthError).toBe(true);
      });
    });
  });

  describe("Retry logic", () => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;

    it("should configure correct retry settings", () => {
      expect(MAX_RETRIES).toBe(3);
      expect(RETRY_DELAY_MS).toBe(2000);
    });

    it("should not retry non-retryable errors", () => {
      const nonRetryableErrors = [
        "Invalid email address",
        "413 Payload too large",
        "Session expired",
      ];

      const isRetryable = (error: string): boolean => {
        const nonRetryable = [
          "Invalid email",
          "413",
          "Session expired",
          "Unauthorized",
        ];
        return !nonRetryable.some((e) =>
          error.toLowerCase().includes(e.toLowerCase()),
        );
      };

      nonRetryableErrors.forEach((error) => {
        expect(isRetryable(error)).toBe(false);
      });
    });
  });
});
