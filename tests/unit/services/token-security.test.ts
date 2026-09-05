/**
 * Unit tests for Token Security Module
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vite-plus/test";

vi.mock("@/lib/logger", async () => {
  const { createMockLoggerModule, createSpyLogger } =
    await import("@/tests/helpers/mockLoggerModule");
  return createMockLoggerModule({
    authLogger: createSpyLogger(),
  });
});

import {
  validateToken,
  shouldAttemptRefresh,
  refreshAccessToken,
  refreshWithRetry,
  sanitizeTokenForLogging,
  type TokenInfo,
} from "@/lib/token-security";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Token Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("validateToken", () => {
    it("should return invalid for missing token", () => {
      const result = validateToken({
        accessToken: "",
        accessTokenExpires: Date.now() + 3600000,
      });

      expect(result.isValid).toBe(false);
      expect(result.needsRefresh).toBe(false);
      expect(result.error).toBe("No access token provided");
    });

    it("should return invalid for expired token", () => {
      const result = validateToken({
        accessToken: "token",
        accessTokenExpires: Date.now() - 1000, // 1 second ago
      });

      expect(result.isValid).toBe(false);
      expect(result.needsRefresh).toBe(true);
      expect(result.error).toBe("Token expired");
    });

    it("should return valid but needsRefresh when expiring soon", () => {
      const result = validateToken({
        accessToken: "token",
        accessTokenExpires: Date.now() + 2 * 60 * 1000, // 2 minutes from now
      });

      expect(result.isValid).toBe(true);
      expect(result.needsRefresh).toBe(true);
    });

    it("should return valid when token is not expiring soon", () => {
      const result = validateToken({
        accessToken: "token",
        accessTokenExpires: Date.now() + 30 * 60 * 1000, // 30 minutes from now
      });

      expect(result.isValid).toBe(true);
      expect(result.needsRefresh).toBe(false);
    });

    it("should calculate expiresIn correctly", () => {
      const expiresIn = 10 * 60 * 1000; // 10 minutes
      const result = validateToken({
        accessToken: "token",
        accessTokenExpires: Date.now() + expiresIn,
      });

      expect(result.expiresIn).toBe(expiresIn);
    });
  });

  describe("shouldAttemptRefresh", () => {
    it("should allow refresh when conditions are met", () => {
      const result = shouldAttemptRefresh({
        accessToken: "token",
        accessTokenExpires: Date.now(),
        refreshToken: "refresh-token",
        lastRefreshTime: Date.now() - 2 * 60 * 1000, // 2 minutes ago
        refreshAttempts: 0,
      });

      expect(result.shouldRefresh).toBe(true);
    });

    it("should block refresh when rate limited", () => {
      const result = shouldAttemptRefresh({
        accessToken: "token",
        accessTokenExpires: Date.now(),
        refreshToken: "refresh-token",
        lastRefreshTime: Date.now() - 30 * 1000, // 30 seconds ago
        refreshAttempts: 0,
      });

      expect(result.shouldRefresh).toBe(false);
      expect(result.reason).toContain("Rate limited");
    });

    it("should block refresh when max attempts exceeded", () => {
      const result = shouldAttemptRefresh({
        accessToken: "token",
        accessTokenExpires: Date.now(),
        refreshToken: "refresh-token",
        lastRefreshTime: Date.now() - 2 * 60 * 1000,
        refreshAttempts: 3,
      });

      expect(result.shouldRefresh).toBe(false);
      expect(result.reason).toBe("Maximum refresh attempts exceeded");
    });

    it("should block refresh when no refresh token", () => {
      const result = shouldAttemptRefresh({
        accessToken: "token",
        accessTokenExpires: Date.now(),
        refreshToken: undefined,
        lastRefreshTime: Date.now() - 2 * 60 * 1000,
        refreshAttempts: 0,
      });

      expect(result.shouldRefresh).toBe(false);
      expect(result.reason).toBe("No refresh token available");
    });
  });

  describe("refreshAccessToken", () => {
    it("should return success on valid refresh", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-token",
          expires_in: 3600,
          refresh_token: "new-refresh-token",
        }),
      });

      const result = await refreshAccessToken(
        "refresh-token",
        "client-id",
        "client-secret",
      );

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe("new-token");
      expect(result.refreshToken).toBe("new-refresh-token");
    });

    it("should return error on failed refresh", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: "invalid_grant",
          error_description: "Token has been expired or revoked",
        }),
      });

      const result = await refreshAccessToken(
        "refresh-token",
        "client-id",
        "client-secret",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Token has been expired or revoked");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await refreshAccessToken(
        "refresh-token",
        "client-id",
        "client-secret",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should reject missing credentials", async () => {
      const result = await refreshAccessToken("", "client-id", "client-secret");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Missing required credentials for token refresh",
      );
    });
  });

  describe("refreshWithRetry", () => {
    it("should succeed on first attempt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-token",
          expires_in: 3600,
        }),
      });

      const result = await refreshWithRetry(
        {
          accessToken: "old-token",
          accessTokenExpires: Date.now() - 1000,
          refreshToken: "refresh-token",
          lastRefreshTime: Date.now() - 2 * 60 * 1000,
          refreshAttempts: 0,
        },
        "client-id",
        "client-secret",
      );

      expect(result.success).toBe(true);
    });

    it("should not retry on invalid_grant error", async () => {
      // Use real timers for this test as it involves async operations
      vi.useRealTimers();
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "invalid_grant",
          error_description: "invalid_grant: Token has been revoked",
        }),
      });

      const result = await refreshWithRetry(
        {
          accessToken: "old-token",
          accessTokenExpires: Date.now() - 1000,
          refreshToken: "refresh-token",
          lastRefreshTime: Date.now() - 2 * 60 * 1000,
          refreshAttempts: 0,
        },
        "client-id",
        "client-secret",
      );

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Restore fake timers for other tests
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    it("should respect rate limiting", async () => {
      const result = await refreshWithRetry(
        {
          accessToken: "old-token",
          accessTokenExpires: Date.now() - 1000,
          refreshToken: "refresh-token",
          lastRefreshTime: Date.now() - 30 * 1000, // 30 seconds ago
          refreshAttempts: 0,
        },
        "client-id",
        "client-secret",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Rate limited");
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("sanitizeTokenForLogging", () => {
    it("should remove sensitive data but keep metadata", () => {
      const tokenInfo: TokenInfo = {
        accessToken: "super-secret-token-abc1234",
        accessTokenExpires: Date.now() + 3600000,
        refreshToken: "also-secret-refresh-token",
        lastRefreshTime: Date.now() - 1800000,
        refreshAttempts: 1,
      };

      const sanitized = sanitizeTokenForLogging(tokenInfo);

      expect(sanitized.hasAccessToken).toBe(true);
      expect(sanitized.accessTokenLength).toBe(26);
      expect(sanitized.hasRefreshToken).toBe(true);
      expect(sanitized).not.toHaveProperty("accessToken");
      expect(sanitized).not.toHaveProperty("refreshToken");
    });

    it("should handle missing tokens", () => {
      const tokenInfo: TokenInfo = {
        accessToken: "",
        accessTokenExpires: 0,
      };

      const sanitized = sanitizeTokenForLogging(tokenInfo);

      expect(sanitized.hasAccessToken).toBe(false);
      expect(sanitized.hasRefreshToken).toBe(false);
    });
  });
});
