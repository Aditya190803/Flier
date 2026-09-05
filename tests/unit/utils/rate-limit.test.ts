/**
 * Unit tests for rate limiting utilities
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vite-plus/test";

import {
  checkRateLimit,
  rateLimit,
  rateLimitResponse,
  addRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rate-limit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("RATE_LIMITS configuration", () => {
    it("should have correct sendEmail limits", () => {
      expect(RATE_LIMITS.sendEmail.windowMs).toBe(60 * 1000);
      expect(RATE_LIMITS.sendEmail.maxRequests).toBe(10);
    });

    it("should have correct auth limits", () => {
      expect(RATE_LIMITS.auth.windowMs).toBe(15 * 60 * 1000);
      expect(RATE_LIMITS.auth.maxRequests).toBe(100);
    });

    it("should have correct api limits", () => {
      expect(RATE_LIMITS.api.windowMs).toBe(60 * 1000);
      expect(RATE_LIMITS.api.maxRequests).toBe(60);
    });

    it("should have correct read limits", () => {
      expect(RATE_LIMITS.read.windowMs).toBe(60 * 1000);
      expect(RATE_LIMITS.read.maxRequests).toBe(120);
    });

    it("should have correct public limits", () => {
      expect(RATE_LIMITS.public.windowMs).toBe(60 * 1000);
      expect(RATE_LIMITS.public.maxRequests).toBe(30);
    });
  });

  describe("checkRateLimit", () => {
    it("should allow first request", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });

      const result = checkRateLimit(request, RATE_LIMITS.api);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59); // 60 - 1
    });

    it("should track requests correctly", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.1.2" },
      });

      // First request
      const result1 = checkRateLimit(request, {
        windowMs: 60000,
        maxRequests: 3,
      });

      // Second request
      const result2 = checkRateLimit(request, {
        windowMs: 60000,
        maxRequests: 3,
      });

      // Third request
      const result3 = checkRateLimit(request, {
        windowMs: 60000,
        maxRequests: 3,
      });

      expect(result1.remaining).toBe(2);
      expect(result2.remaining).toBe(1);
      expect(result3.remaining).toBe(0);
    });

    it("should block requests after limit exceeded", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.1.3" },
      });

      const config = { windowMs: 60000, maxRequests: 2 };

      checkRateLimit(request, config); // 1st
      checkRateLimit(request, config); // 2nd - at limit

      const result = checkRateLimit(request, config); // 3rd - exceeded

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should reset after window expires", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.1.4" },
      });

      const config = { windowMs: 60000, maxRequests: 2 };

      checkRateLimit(request, config);
      checkRateLimit(request, config);
      checkRateLimit(request, config); // Should be blocked

      // Advance time past the window
      vi.advanceTimersByTime(61000);

      const result = checkRateLimit(request, config);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it("should use custom key when provided", () => {
      const request1 = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.1.5" },
      });

      const request2 = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.1.6" },
      });

      const config = { windowMs: 60000, maxRequests: 2 };

      // Both requests use same custom key
      checkRateLimit(request1, config, "shared-key");
      checkRateLimit(request2, config, "shared-key");

      const result = checkRateLimit(request1, config, "shared-key");

      expect(result.allowed).toBe(false);
    });

    it("should track different IPs separately", () => {
      const request1 = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.1.7" },
      });

      const request2 = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.1.8" },
      });

      const config = { windowMs: 60000, maxRequests: 1 };

      checkRateLimit(request1, config);
      const result = checkRateLimit(request2, config);

      expect(result.allowed).toBe(true); // Different IP
    });

    it("should read x-real-ip header", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-real-ip": "10.0.0.1" },
      });

      const result = checkRateLimit(request, RATE_LIMITS.api);

      expect(result.allowed).toBe(true);
    });
  });

  describe("rateLimit middleware", () => {
    it("should return null when allowed", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.2.1" },
      });

      const result = rateLimit(request);

      expect(result).toBeNull();
    });

    it("should return Response when rate limited", () => {
      const request = new Request("http://localhost/api/test", {
        headers: { "x-forwarded-for": "192.168.2.2" },
      });

      const config = { windowMs: 60000, maxRequests: 1 };

      rateLimit(request, config); // Use up limit

      const result = rateLimit(request, config);

      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(429);
    });
  });

  describe("rateLimitResponse", () => {
    it("should create proper 429 response", async () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      };

      const response = rateLimitResponse(result);

      expect(response.status).toBe(429);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Retry-After")).toBe("60");

      const body = await response.json();
      expect(body.error).toBe("Too Many Requests");
    });

    it("should include rate limit headers", () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetTime: 1234567890,
        retryAfter: 30,
      };

      const response = rateLimitResponse(result);

      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response.headers.get("X-RateLimit-Reset")).toBe("1234567890");
    });
  });

  describe("addRateLimitHeaders", () => {
    it("should add rate limit headers to existing response", () => {
      const originalResponse = new Response("OK", { status: 200 });
      const result = {
        allowed: true,
        remaining: 59,
        resetTime: 1234567890,
      };

      const newResponse = addRateLimitHeaders(originalResponse, result);

      expect(newResponse.status).toBe(200);
      expect(newResponse.headers.get("X-RateLimit-Remaining")).toBe("59");
      expect(newResponse.headers.get("X-RateLimit-Reset")).toBe("1234567890");
    });

    it("should preserve original response properties", async () => {
      const originalResponse = new Response('{"data": "test"}', {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });

      const result = { allowed: true, remaining: 10, resetTime: Date.now() };
      const newResponse = addRateLimitHeaders(originalResponse, result);

      expect(newResponse.status).toBe(201);
      expect(newResponse.headers.get("Content-Type")).toBe("application/json");

      const body = await newResponse.json();
      expect(body.data).toBe("test");
    });
  });
});
