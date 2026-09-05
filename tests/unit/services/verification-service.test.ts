import { describe, it, expect } from "vite-plus/test";

import { VerificationService } from "@/lib/services/verification-service";

describe("VerificationService", () => {
  describe("verifyEmail", () => {
    it("should validate a correct email address", async () => {
      const result = await VerificationService.verifyEmail("test@example.com");
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(100);
    });

    it("should reject an invalid email syntax", async () => {
      const result = await VerificationService.verifyEmail("invalid-email");
      expect(result.isValid).toBe(false);
      expect(result.reason).toBe("Invalid syntax");
      expect(result.score).toBe(0);
    });

    it("should identify disposable email domains", async () => {
      const result = await VerificationService.verifyEmail(
        "test@mailinator.com",
      );
      expect(result.isDisposable).toBe(true);
      expect(result.score).toBeLessThan(100);
    });

    it("should identify role-based email addresses", async () => {
      const result = await VerificationService.verifyEmail("admin@example.com");
      expect(result.isRoleBased).toBe(true);
      expect(result.score).toBeLessThan(100);
    });
  });

  describe("verifyBatch", () => {
    it("should verify a batch of emails", async () => {
      const emails = [
        "test@example.com",
        "invalid-email",
        "admin@mailinator.com",
      ];
      const results = await VerificationService.verifyBatch(emails);

      expect(results.size).toBe(3);
      expect(results.get("test@example.com")?.isValid).toBe(true);
      expect(results.get("invalid-email")?.isValid).toBe(false);
      expect(results.get("admin@mailinator.com")?.isDisposable).toBe(true);
    });
  });
});
