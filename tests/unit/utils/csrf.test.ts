/**
 * Unit tests for CSRF protection utilities
 */

import { describe, it, expect, vi } from "vite-plus/test";

import {
  validateCSRFToken,
  createCSRFCookie,
  csrfProtection,
  generateCSRFForClient,
} from "@/lib/csrf";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "mock-token" }),
  }),
}));

describe("CSRF Protection", () => {
  describe("createCSRFCookie", () => {
    it("should create properly formatted cookie string", () => {
      const token = "test-token-12345";
      const cookie = createCSRFCookie(token);

      expect(cookie).toContain("csrf_token=test-token-12345");
      expect(cookie).toContain("Path=/");
      expect(cookie).toContain("SameSite=Strict");
      expect(cookie).toContain("Secure");
    });

    it("should not include HttpOnly (for JS access)", () => {
      const cookie = createCSRFCookie("token");
      expect(cookie).not.toContain("HttpOnly");
    });
  });

  describe("generateCSRFForClient", () => {
    it("should generate token and cookie pair", () => {
      const { token, cookie } = generateCSRFForClient();

      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes as hex = 64 chars
      expect(cookie).toContain(token);
    });

    it("should generate unique tokens", () => {
      const { token: token1 } = generateCSRFForClient();
      const { token: token2 } = generateCSRFForClient();

      expect(token1).not.toBe(token2);
    });
  });

  describe("validateCSRFToken", () => {
    it("should return true for matching tokens", async () => {
      const token = "matching-token-12345";
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          "x-csrf-token": token,
          cookie: `csrf_token=${token}; other=value`,
        },
      });

      const isValid = await validateCSRFToken(request);

      expect(isValid).toBe(true);
    });

    it("should return false for mismatched tokens", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          "x-csrf-token": "header-token",
          cookie: "csrf_token=cookie-token",
        },
      });

      const isValid = await validateCSRFToken(request);

      expect(isValid).toBe(false);
    });

    it("should return false when header token is missing", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          cookie: "csrf_token=cookie-token",
        },
      });

      const isValid = await validateCSRFToken(request);

      expect(isValid).toBe(false);
    });

    it("should return false when cookie token is missing", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          "x-csrf-token": "header-token",
        },
      });

      const isValid = await validateCSRFToken(request);

      expect(isValid).toBe(false);
    });

    it("should return false when no tokens present", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "POST",
      });

      const isValid = await validateCSRFToken(request);

      expect(isValid).toBe(false);
    });
  });

  describe("csrfProtection middleware", () => {
    it("should skip CSRF for GET requests", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "GET",
      });

      const result = await csrfProtection(request);

      expect(result).toBeNull();
    });

    it("should skip CSRF for HEAD requests", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "HEAD",
      });

      const result = await csrfProtection(request);

      expect(result).toBeNull();
    });

    it("should skip CSRF for OPTIONS requests", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "OPTIONS",
      });

      const result = await csrfProtection(request);

      expect(result).toBeNull();
    });

    it("should skip CSRF for Bearer token auth", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          authorization: "Bearer some-jwt-token",
        },
      });

      const result = await csrfProtection(request);

      expect(result).toBeNull();
    });

    it("should return 403 for invalid CSRF on POST", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "POST",
        headers: {
          "x-csrf-token": "invalid",
          cookie: "csrf_token=different",
        },
      });

      const result = await csrfProtection(request);

      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });

    it("should return error response with proper format", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "POST",
      });

      const result = await csrfProtection(request);

      expect(result).toBeInstanceOf(Response);
      if (result) {
        const body = await result.json();
        expect(body.error).toBe("CSRF Validation Failed");
        expect(body.message).toContain("Invalid or missing CSRF token");
      }
    });

    it("should validate CSRF for PUT requests", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "PUT",
      });

      const result = await csrfProtection(request);

      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });

    it("should validate CSRF for DELETE requests", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "DELETE",
      });

      const result = await csrfProtection(request);

      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });

    it("should validate CSRF for PATCH requests", async () => {
      const request = new Request("http://localhost/api/test", {
        method: "PATCH",
      });

      const result = await csrfProtection(request);

      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });
  });
});
