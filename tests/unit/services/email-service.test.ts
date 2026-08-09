import { describe, it, expect, vi, beforeEach } from "vitest";

import * as gmail from "@/lib/gmail";
import { EmailService } from "@/lib/services/email-service";
import { VerificationService } from "@/lib/services/verification-service";

const { verifyEmailLikeReal } = vi.hoisted(() => {
  const verifyEmailLikeReal = async (email: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(trimmedEmail)) {
      return {
        isValid: false,
        reason: "Invalid syntax",
        score: 0,
      };
    }

    const [localPart, domain] = trimmedEmail.split("@");
    const isDisposable = new Set([
      "mailinator.com",
      "guerrillamail.com",
      "tempmail.com",
      "10minutemail.com",
      "throwawaymail.com",
      "yopmail.com",
      "sharklasers.com",
      "guerrillamailblock.com",
      "pokemail.net",
      "grr.la",
    ]).has(domain);
    const isRoleBased = new Set([
      "admin",
      "administrator",
      "webmaster",
      "hostmaster",
      "postmaster",
      "info",
      "support",
      "contact",
      "sales",
      "marketing",
      "billing",
      "noreply",
      "no-reply",
      "jobs",
      "hr",
    ]).has(localPart);

    let score = 100;
    if (isDisposable) {
      score -= 50;
    }
    if (isRoleBased) {
      score -= 20;
    }

    return {
      isValid: score > 0,
      reason: isDisposable
        ? "Disposable email domain"
        : isRoleBased
          ? "Role-based email"
          : undefined,
      isDisposable,
      isRoleBased,
      score,
    };
  };
  return { verifyEmailLikeReal };
});

// Mock dependencies
vi.mock("@/lib/gmail", () => ({
  sendEmailViaAPI: vi.fn(),
  replacePlaceholders: vi.fn(
    (text: string, data: Record<string, string> = {}) =>
      text.replace(/{{(.*?)}}/g, (match, key) => data[key.trim()] ?? match),
  ),
  preResolveAttachments: vi.fn(async (attachments) => attachments),
  clearAttachmentCache: vi.fn(),
  preBuildEmailTemplate: vi.fn((subject, body) => ({ subject, body })),
  sendEmailWithTemplate: vi.fn(),
}));

vi.mock("@/lib/attachment-fetcher", () => ({
  fetchFileFromUrl: vi.fn(),
}));

vi.mock("@/lib/services/verification-service", () => {
  const verifyEmail = vi.fn(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
      return { isValid: false, reason: "Invalid syntax", score: 0 };
    }
    return { isValid: true, score: 100 };
  });
  return {
    VerificationService: {
      verifyEmail,
      verifyBatch: vi.fn(async (emails: string[]) => {
        const results = new Map();
        for (const e of emails) {
          results.set(e, await verifyEmail(e));
        }
        return results;
      }),
    },
  };
});

describe("EmailService", () => {
  let emailService: EmailService;
  const mockAccessToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
    (gmail.replacePlaceholders as any).mockImplementation(
      (text: string, data: Record<string, string> = {}) =>
        text.replace(/{{(.*?)}}/g, (match, key) => data[key.trim()] ?? match),
    );
    (VerificationService.verifyEmail as any).mockImplementation(
      verifyEmailLikeReal,
    );
    (VerificationService.verifyBatch as any).mockImplementation(
      async (emails: string[]) => {
        const results = new Map();
        for (const email of emails) {
          results.set(email, await verifyEmailLikeReal(email));
        }
        return results;
      },
    );
    emailService = new EmailService(mockAccessToken, "sender@example.com");
  });

  describe("sendCampaign", () => {
    it("should send emails to all recipients", async () => {
      const recipients = [
        { email: "test1@example.com", name: "Test 1" },
        { email: "test2@example.com", name: "Test 2" },
      ];
      const content = { subject: "Hello {{name}}", body: "World" };

      (gmail.sendEmailViaAPI as any).mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const summary = await emailService.sendCampaign(recipients, content, {
        delayBetweenEmails: 0,
      });

      expect(summary.total).toBe(2);
      expect(summary.sent).toBe(2);
      expect(gmail.sendEmailViaAPI).toHaveBeenCalledTimes(2);
    });

    it("should skip invalid emails if verifyBeforeSending is true", async () => {
      const recipients = [
        { email: "valid@example.com" },
        { email: "invalid@example.com" },
      ];
      const content = { subject: "Hello {{name}}", body: "World" };

      (VerificationService.verifyBatch as any).mockResolvedValue(
        new Map([
          [
            "valid@example.com",
            {
              isValid: true,
              score: 100,
              isDisposable: false,
              isRoleBased: false,
            },
          ],
          [
            "invalid@example.com",
            {
              isValid: false,
              score: 0,
              isDisposable: false,
              isRoleBased: false,
              reason: "Invalid syntax",
            },
          ],
        ]),
      );

      (gmail.sendEmailViaAPI as any).mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const summary = await emailService.sendCampaign(recipients, content, {
        verifyBeforeSending: true,
        delayBetweenEmails: 0,
      });

      expect(summary.total).toBe(2);
      expect(summary.sent).toBe(1);
      expect(summary.skipped).toBe(1);
      expect(gmail.sendEmailViaAPI).toHaveBeenCalledTimes(1);
    });

    it("should handle individual send failures", async () => {
      const recipients = [{ email: "fail@example.com" }];
      const content = { subject: "Hello {{name}}", body: "World" };

      (gmail.sendEmailViaAPI as any).mockRejectedValue(new Error("SMTP Error"));

      const summary = await emailService.sendCampaign(recipients, content, {
        delayBetweenEmails: 0,
      });

      expect(summary.sent).toBe(0);
      expect(summary.failed).toBe(1);
      expect(summary.results[0].status).toBe("error");
    });
  });

  describe("sendPersonalizedBatch — chunked/time-budgeted sending", () => {
    const makeEmails = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        to: `recipient${i}@example.com`,
        subject: "Subject",
        message: "Message",
        originalRowData: {},
      }));

    it("processes the whole list and reports done: true when there is no deadline", async () => {
      (gmail.sendEmailViaAPI as any).mockResolvedValue({
        success: true,
        messageId: "msg-1",
      });

      const emails = makeEmails(3);
      const summary = await emailService.sendPersonalizedBatch(emails, {
        delayBetweenEmails: 0,
      });

      expect(summary.done).toBe(true);
      expect(summary.results).toHaveLength(3);
      expect(summary.sent).toBe(3);
    });

    it("stops early and reports done: false once the deadline has passed", async () => {
      (gmail.sendEmailViaAPI as any).mockResolvedValue({
        success: true,
        messageId: "msg-1",
      });

      const emails = makeEmails(5);
      // Deadline already in the past — nothing should be processed after
      // the very first iteration's check.
      const summary = await emailService.sendPersonalizedBatch(emails, {
        delayBetweenEmails: 0,
        deadline: Date.now() - 1,
      });

      expect(summary.done).toBe(false);
      expect(summary.results).toHaveLength(0);
      expect(gmail.sendEmailViaAPI).not.toHaveBeenCalled();
    });

    it("processes a partial chunk before the deadline cuts it off", async () => {
      (gmail.sendEmailViaAPI as any).mockResolvedValue({
        success: true,
        messageId: "msg-1",
      });

      const emails = makeEmails(5);
      // Real-timer based: the inter-email delay (20ms) is longer than the
      // remaining budget (15ms), so the deadline check before the second
      // iteration should trip, leaving 4 recipients unprocessed.
      const summary = await emailService.sendPersonalizedBatch(emails, {
        delayBetweenEmails: 20,
        deadline: Date.now() + 15,
      });

      expect(summary.done).toBe(false);
      expect(summary.results.length).toBeGreaterThan(0);
      expect(summary.results.length).toBeLessThan(5);
    });

    it("substitutes placeholders from originalRowData", async () => {
      (gmail.sendEmailViaAPI as any).mockResolvedValue({
        success: true,
        messageId: "msg-1",
      });

      await emailService.sendPersonalizedBatch(
        [
          {
            to: "ada@example.com",
            subject: "Hello {{name}}",
            message: "<p>You work at {{company}}, {{name}}.</p>",
            originalRowData: { name: "Ada", company: "Analytical Engines" },
          },
        ],
        { delayBetweenEmails: 0 },
      );

      const call = (gmail.sendEmailViaAPI as any).mock.calls[0];
      expect(call[3]).toBe("Hello Ada");
      expect(call[4]).toBe("<p>You work at Analytical Engines, Ada.</p>");
    });

    it("exposes the recipient address as an {{email}} placeholder", async () => {
      (gmail.sendEmailViaAPI as any).mockResolvedValue({
        success: true,
        messageId: "msg-1",
      });

      await emailService.sendPersonalizedBatch(
        [
          {
            to: "ada@example.com",
            subject: "Receipt",
            message: "Sent to {{email}}",
            originalRowData: {},
          },
        ],
        { delayBetweenEmails: 0 },
      );

      expect((gmail.sendEmailViaAPI as any).mock.calls[0][4]).toBe(
        "Sent to ada@example.com",
      );
    });

    it("leaves unmatched placeholders untouched rather than blanking them", async () => {
      (gmail.sendEmailViaAPI as any).mockResolvedValue({
        success: true,
        messageId: "msg-1",
      });

      await emailService.sendPersonalizedBatch(
        [
          {
            to: "ada@example.com",
            subject: "Hi {{nickname}}",
            message: "Body",
            originalRowData: { name: "Ada" },
          },
        ],
        { delayBetweenEmails: 0 },
      );

      expect((gmail.sendEmailViaAPI as any).mock.calls[0][3]).toBe(
        "Hi {{nickname}}",
      );
    });

    it("forwards per-message cc and bcc to the sender", async () => {
      (gmail.sendEmailViaAPI as any).mockResolvedValue({
        success: true,
        messageId: "msg-1",
      });

      await emailService.sendPersonalizedBatch(
        [
          {
            to: "ada@example.com",
            subject: "Subject",
            message: "Message",
            originalRowData: {},
            cc: ["cc@example.com"],
            bcc: ["bcc@example.com"],
          },
        ],
        { delayBetweenEmails: 0 },
      );

      const call = (gmail.sendEmailViaAPI as any).mock.calls[0];
      expect(call[8]).toEqual(["cc@example.com"]);
      expect(call[9]).toEqual(["bcc@example.com"]);
    });
  });
});
