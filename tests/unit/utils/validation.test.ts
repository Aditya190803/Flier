/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from "vite-plus/test";

import {
  emailSchema,
  subjectSchema,
  messageSchema,
  sendSingleEmailSchema,
  scheduledCampaignSchema,
  isoDatetimeSchema,
  storedAttachmentSchema,
  contactSchema,
  templateSchema,
  sanitizeHTML,
  sanitizeText,
  validate,
} from "@/lib/validation";

describe("Validation Schemas", () => {
  describe("emailSchema", () => {
    it("should accept valid email addresses", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.org",
        "user+tag@company.co.uk",
        "USER@EXAMPLE.COM", // Should be lowercased
      ];

      validEmails.forEach((email) => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(email.toLowerCase().trim());
        }
      });
    });

    it("should reject invalid email addresses", () => {
      const invalidEmails = [
        "notanemail",
        "@nodomain.com",
        "missing@.com",
        "",
        " ",
        "a@b", // Too short TLD
      ];

      invalidEmails.forEach((email) => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      });
    });

    it("should reject emails that are too long", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      const result = emailSchema.safeParse(longEmail);
      expect(result.success).toBe(false);
    });
  });

  describe("subjectSchema", () => {
    it("should accept valid subjects", () => {
      const validSubjects = [
        "Hello!",
        "Order #12345 Confirmation",
        "🎉 Welcome to our service!",
        "Re: Your inquiry",
      ];

      validSubjects.forEach((subject) => {
        const result = subjectSchema.safeParse(subject);
        expect(result.success).toBe(true);
      });
    });

    it("should reject empty subjects", () => {
      const result = subjectSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject subjects that are too long", () => {
      const longSubject = "a".repeat(1000);
      const result = subjectSchema.safeParse(longSubject);
      expect(result.success).toBe(false);
    });
  });

  describe("messageSchema", () => {
    it("should accept valid messages", () => {
      const validMessages = [
        "<p>Hello!</p>",
        "Plain text message",
        "<div><h1>Welcome</h1><p>Content here</p></div>",
      ];

      validMessages.forEach((message) => {
        const result = messageSchema.safeParse(message);
        expect(result.success).toBe(true);
      });
    });

    it("should reject empty messages", () => {
      const result = messageSchema.safeParse("");
      expect(result.success).toBe(false);
    });
  });

  describe("sendSingleEmailSchema", () => {
    it("should accept valid email payloads", () => {
      const validPayload = {
        to: "test@example.com",
        subject: "Test Subject",
        message: "<p>Test message</p>",
      };

      const result = sendSingleEmailSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should accept optional cc/bcc arrays", () => {
      const result = sendSingleEmailSchema.safeParse({
        to: "test@example.com",
        subject: "Test Subject",
        message: "<p>Test message</p>",
        cc: ["cc@example.com"],
        bcc: ["bcc@example.com"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid cc addresses", () => {
      const result = sendSingleEmailSchema.safeParse({
        to: "test@example.com",
        subject: "Test Subject",
        message: "<p>Test message</p>",
        cc: ["not-an-email"],
      });
      expect(result.success).toBe(false);
    });

    it("should reject more than 50 cc addresses", () => {
      const result = sendSingleEmailSchema.safeParse({
        to: "test@example.com",
        subject: "Test Subject",
        message: "<p>Test message</p>",
        cc: Array.from({ length: 51 }, (_, i) => `cc${i}@example.com`),
      });
      expect(result.success).toBe(false);
    });

    it("should accept exactly 50 bcc addresses", () => {
      const result = sendSingleEmailSchema.safeParse({
        to: "test@example.com",
        subject: "Test Subject",
        message: "<p>Test message</p>",
        bcc: Array.from({ length: 50 }, (_, i) => `bcc${i}@example.com`),
      });
      expect(result.success).toBe(true);
    });

    it("should accept payloads with attachments", () => {
      const validPayload = {
        to: "test@example.com",
        subject: "Test Subject",
        message: "<p>Test message</p>",
        attachments: [
          {
            name: "test.pdf",
            type: "application/pdf",
            data: "base64data",
          },
        ],
      };

      const result = sendSingleEmailSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should reject invalid payloads", () => {
      const invalidPayload = {
        to: "invalid-email",
        subject: "",
        message: "<p>Test</p>",
      };

      const result = sendSingleEmailSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("contactSchema", () => {
    it("should accept valid contacts", () => {
      const validContact = {
        email: "contact@example.com",
        name: "John Doe",
        company: "Acme Inc",
      };

      const result = contactSchema.safeParse(validContact);
      expect(result.success).toBe(true);
    });

    it("should accept minimal contact with just email", () => {
      const minimalContact = {
        email: "contact@example.com",
      };

      const result = contactSchema.safeParse(minimalContact);
      expect(result.success).toBe(true);
    });

    it("should reject contacts without email", () => {
      const noEmailContact = {
        name: "John Doe",
      };

      const result = contactSchema.safeParse(noEmailContact);
      expect(result.success).toBe(false);
    });
  });

  describe("templateSchema", () => {
    it("should accept valid templates", () => {
      const validTemplate = {
        name: "Welcome Email",
        subject: "Welcome to {{company}}!",
        content: "<p>Hello {{name}}, welcome!</p>",
        variables: ["name", "company"],
      };

      const result = templateSchema.safeParse(validTemplate);
      expect(result.success).toBe(true);
    });

    it("should reject templates without name", () => {
      const invalidTemplate = {
        subject: "Test",
        content: "<p>Test</p>",
      };

      const result = templateSchema.safeParse(invalidTemplate);
      expect(result.success).toBe(false);
    });
  });
});

describe("Scheduled Campaign Validation", () => {
  describe("scheduledCampaignSchema", () => {
    const validCampaign = {
      subject: "Scheduled update",
      content: "Hello",
      recipients: ["reader@example.com"],
      scheduled_at: "2030-01-01T09:00:00.000Z",
    };

    it("accepts a stored campaign snapshot", () => {
      expect(scheduledCampaignSchema.safeParse(validCampaign).success).toBe(
        true,
      );
    });

    it("requires a timezone-qualified ISO send time", () => {
      expect(isoDatetimeSchema.safeParse("tomorrow morning").success).toBe(
        false,
      );
      expect(isoDatetimeSchema.safeParse("2030-01-01T09:00:00").success).toBe(
        false,
      );
    });

    it("matches Appwrite subject and content limits", () => {
      expect(
        scheduledCampaignSchema.safeParse({
          ...validCampaign,
          subject: "s".repeat(501),
        }).success,
      ).toBe(false);
      expect(
        scheduledCampaignSchema.safeParse({
          ...validCampaign,
          content: "c".repeat(100001),
        }).success,
      ).toBe(false);
    });

    it("requires stored attachments to have a retrievable reference", () => {
      expect(
        storedAttachmentSchema.safeParse({ fileName: "report.pdf" }).success,
      ).toBe(false);
      expect(
        storedAttachmentSchema.safeParse({
          fileName: "report.pdf",
          appwrite_file_id: "file-1",
        }).success,
      ).toBe(true);
    });
  });
});

describe("Sanitization Functions", () => {
  describe("sanitizeHTML", () => {
    it("should remove script tags", () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("<script>");
      expect(result).toContain("<p>Hello</p>");
    });

    it("should remove event handlers", () => {
      const input = '<a href="#" onclick="alert(1)">Click</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("onclick");
    });

    it("should remove javascript: URLs", () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain("javascript:");
    });

    it("should handle empty input", () => {
      const result = sanitizeHTML("");
      expect(result).toBe("");
    });

    it("should preserve safe HTML", () => {
      const input = "<p>Safe <strong>content</strong></p>";
      const result = sanitizeHTML(input);
      expect(result).toContain("<p>");
      expect(result).toContain("<strong>");
    });
  });

  describe("sanitizeText", () => {
    it("should trim whitespace", () => {
      const input = "  Hello World  ";
      const result = sanitizeText(input);
      expect(result).toBe("Hello World");
    });

    it("should remove null bytes", () => {
      const input = "Hello\0World";
      const result = sanitizeText(input);
      expect(result).not.toContain("\0");
    });

    it("should normalize whitespace", () => {
      const input = "Hello   World";
      const result = sanitizeText(input);
      expect(result).toBe("Hello World");
    });

    it("should handle empty input", () => {
      const result = sanitizeText("");
      expect(result).toBe("");
    });
  });
});

describe("validate helper", () => {
  it("should return success for valid data", () => {
    const result = validate(emailSchema, "test@example.com");
    expect(result.success).toBe(true);
    expect(result.data).toBe("test@example.com");
  });

  it("should return errors for invalid data", () => {
    const result = validate(emailSchema, "invalid");
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.message).toBeDefined();
  });
});
