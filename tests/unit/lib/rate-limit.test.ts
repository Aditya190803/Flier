/**
 * Unit tests for lib/rate-limit.ts
 * Covers in-memory window logic, per-user/per-IP keys, response shape,
 * and the Upstash-backed async path (Redis mocked, no network).
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vite-plus/test";

const { mockRedisInstance, RedisCtor } = vi.hoisted(() => {
  const instance = {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  };
  // Must be a real constructible function (not an arrow fn) since
  // lib/rate-limit.ts calls `new Redis(...)`.
  function MockRedis() {
    return instance;
  }
  return {
    mockRedisInstance: instance,
    RedisCtor: vi.fn(
      MockRedis as unknown as new (...args: unknown[]) => unknown,
    ),
  };
});

vi.mock("@upstash/redis", () => ({
  Redis: RedisCtor,
}));

vi.mock("@/lib/logger", async () => {
  const { createMockLoggerModule } =
    await import("@/tests/helpers/mockLoggerModule");
  return createMockLoggerModule();
});

import {
  RATE_LIMITS,
  checkRateLimit,
  rateLimit,
  rateLimitResponse,
  addRateLimitHeaders,
  checkUserEmailRateLimit,
  rateLimitUserEmail,
} from "@/lib/rate-limit";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/test", { headers });
}

describe("RATE_LIMITS presets", () => {
  it("defines expected windows and caps", () => {
    expect(RATE_LIMITS.sendEmail).toEqual({
      windowMs: 60_000,
      maxRequests: 10,
    });
    expect(RATE_LIMITS.auth).toEqual({
      windowMs: 15 * 60_000,
      maxRequests: 100,
    });
    expect(RATE_LIMITS.api).toEqual({ windowMs: 60_000, maxRequests: 60 });
    expect(RATE_LIMITS.read).toEqual({ windowMs: 60_000, maxRequests: 120 });
    expect(RATE_LIMITS.public).toEqual({ windowMs: 60_000, maxRequests: 30 });
    expect(RATE_LIMITS.sendEmailPerUser).toEqual({
      windowMs: 60_000,
      maxRequests: 30,
      maxEmailsPerDay: 500,
    });
  });
});

describe("checkRateLimit (in-memory)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit and decrements remaining", () => {
    const config = { windowMs: 60_000, maxRequests: 3 };
    const key = "test-key-allow-1";

    const first = checkRateLimit(makeRequest(), config, key);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);

    const second = checkRateLimit(makeRequest(), config, key);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it("denies requests once the max is exceeded and sets retryAfter", () => {
    const config = { windowMs: 60_000, maxRequests: 2 };
    const key = "test-key-deny-1";

    checkRateLimit(makeRequest(), config, key);
    checkRateLimit(makeRequest(), config, key);
    const third = checkRateLimit(makeRequest(), config, key);

    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.retryAfter).toBeGreaterThan(0);
  });

  it("resets the window after windowMs elapses", () => {
    const config = { windowMs: 60_000, maxRequests: 1 };
    const key = "test-key-window-reset";

    const first = checkRateLimit(makeRequest(), config, key);
    expect(first.allowed).toBe(true);

    const second = checkRateLimit(makeRequest(), config, key);
    expect(second.allowed).toBe(false);

    // Advance past the window boundary so a new windowKey bucket is used.
    vi.advanceTimersByTime(61_000);

    const third = checkRateLimit(makeRequest(), config, key);
    expect(third.allowed).toBe(true);
  });

  it("derives the key from x-forwarded-for when no customKey given", () => {
    const config = { windowMs: 60_000, maxRequests: 1 };
    const req = makeRequest({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" });

    const first = checkRateLimit(req, config);
    expect(first.allowed).toBe(true);

    // Same IP again in the same window should now be denied.
    const second = checkRateLimit(
      makeRequest({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }),
      config,
    );
    expect(second.allowed).toBe(false);

    // A different IP is an independent bucket.
    const third = checkRateLimit(
      makeRequest({ "x-forwarded-for": "198.51.100.9" }),
      config,
    );
    expect(third.allowed).toBe(true);
  });

  it("falls back to x-real-ip, then unknown-ip, when no forwarded-for header", () => {
    const config = { windowMs: 60_000, maxRequests: 1 };

    const withRealIp = checkRateLimit(
      makeRequest({ "x-real-ip": "192.0.2.1" }),
      config,
    );
    expect(withRealIp.allowed).toBe(true);

    const noHeaders = checkRateLimit(makeRequest(), config);
    expect(noHeaders.allowed).toBe(true);
  });

  it("uses a custom keyGenerator over the IP when provided", () => {
    const config = {
      windowMs: 60_000,
      maxRequests: 1,
      keyGenerator: (req: Request) => req.headers.get("x-user-id") || "anon",
    };

    const first = checkRateLimit(
      makeRequest({ "x-user-id": "user-42", "x-forwarded-for": "1.1.1.1" }),
      config,
    );
    expect(first.allowed).toBe(true);

    // Different IP, same user id via keyGenerator -> should share the bucket.
    const second = checkRateLimit(
      makeRequest({ "x-user-id": "user-42", "x-forwarded-for": "2.2.2.2" }),
      config,
    );
    expect(second.allowed).toBe(false);
  });
});

describe("rateLimit() wrapper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when allowed", () => {
    const config = { windowMs: 60_000, maxRequests: 5 };
    const result = rateLimit(
      makeRequest({ "x-forwarded-for": "10.10.10.1" }),
      config,
    );
    expect(result).toBeNull();
  });

  it("returns a 429 Response when the limit is exceeded", () => {
    const config = { windowMs: 60_000, maxRequests: 1 };
    const req = () => makeRequest({ "x-forwarded-for": "10.10.10.2" });

    expect(rateLimit(req(), config)).toBeNull();
    const denied = rateLimit(req(), config);

    expect(denied).toBeInstanceOf(Response);
    expect(denied?.status).toBe(429);
  });
});

describe("rateLimitResponse", () => {
  it("shapes the 429 body and headers", async () => {
    const response = rateLimitResponse({
      allowed: false,
      remaining: 0,
      resetTime: 1_700_000_000_000,
      retryAfter: 42,
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("X-RateLimit-Reset")).toBe("1700000000000");

    const body = await response.json();
    expect(body.error).toBe("Too Many Requests");
    expect(body.retryAfter).toBe(42);
  });

  it("defaults Retry-After to 60 when not provided", () => {
    const response = rateLimitResponse({
      allowed: false,
      remaining: 0,
      resetTime: Date.now(),
    });

    expect(response.headers.get("Retry-After")).toBe("60");
  });
});

describe("addRateLimitHeaders", () => {
  it("adds rate-limit headers while preserving body and status", async () => {
    const original = new Response(JSON.stringify({ ok: true }), {
      status: 201,
      statusText: "Created",
      headers: { "Content-Type": "application/json" },
    });

    const withHeaders = addRateLimitHeaders(original, {
      allowed: true,
      remaining: 7,
      resetTime: 123456,
    });

    expect(withHeaders.status).toBe(201);
    expect(withHeaders.headers.get("X-RateLimit-Remaining")).toBe("7");
    expect(withHeaders.headers.get("X-RateLimit-Reset")).toBe("123456");
    expect(withHeaders.headers.get("Content-Type")).toBe("application/json");

    const body = await withHeaders.json();
    expect(body).toEqual({ ok: true });
  });
});

describe("checkUserEmailRateLimit / rateLimitUserEmail", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows sends under both the per-minute and daily caps", () => {
    const result = checkUserEmailRateLimit("user-a@example.com", 1);
    expect(result.allowed).toBe(true);
    expect(result.dailyRemaining).toBe(499);
    expect(result.dailyResetTime).toBeGreaterThan(Date.now());
  });

  it("denies once the per-minute cap (30) is exceeded", () => {
    const email = "user-b@example.com";
    // An increment exceeding the cap is denied even on a fresh window bucket.
    const first = checkUserEmailRateLimit(email, 31);
    expect(first.allowed).toBe(false);

    // Sends within the cap are allowed until the cap is consumed.
    const second = checkUserEmailRateLimit(email, 30);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    // A subsequent request in the same minute window is denied.
    const third = checkUserEmailRateLimit(email, 1);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("denies once the daily cap (500) would be exceeded", () => {
    const email = "user-c@example.com";
    // Use small increments spread across distinct minute windows so only
    // the daily cap is what trips, not the per-minute cap of 30.
    for (let i = 0; i < 25; i++) {
      const r = checkUserEmailRateLimit(email, 20);
      expect(r.allowed).toBe(true);
      vi.advanceTimersByTime(61_000); // move to a new minute window
    }
    // 25 * 20 = 500 already consumed; one more should be denied.
    const denied = checkUserEmailRateLimit(email, 1);
    expect(denied.allowed).toBe(false);
    expect(denied.dailyRemaining).toBe(0);
  });

  it("rateLimitUserEmail returns null when allowed and a 429 Response with daily info when not", async () => {
    const okEmail = "user-d@example.com";
    expect(rateLimitUserEmail(okEmail, 1)).toBeNull();

    const overEmail = "user-e@example.com";
    rateLimitUserEmail(overEmail, 30);
    const denied = rateLimitUserEmail(overEmail, 1);

    expect(denied).toBeInstanceOf(Response);
    expect(denied?.status).toBe(429);
    expect(denied?.headers.get("X-RateLimit-Daily-Remaining")).toBeDefined();

    const body = await denied?.json();
    expect(body.error).toBe("Too Many Emails");
  });
});

describe("rateLimitAsync / rateLimitUserEmailAsync (Upstash configured)", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    process.env.UPSTASH_REDIS_REST_URL =
      "https://real-upstash-instance.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    mockRedisInstance.incr.mockReset();
    mockRedisInstance.expire.mockReset();
    mockRedisInstance.ttl.mockReset();
    RedisCtor.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses Redis incr/expire and allows requests under the max", async () => {
    mockRedisInstance.incr.mockResolvedValueOnce(1);
    mockRedisInstance.expire.mockResolvedValueOnce(1);

    const { rateLimitAsync } = await import("@/lib/rate-limit");
    const result = await rateLimitAsync(
      makeRequest({ "x-forwarded-for": "1.2.3.4" }),
      {
        windowMs: 60_000,
        maxRequests: 5,
      },
    );

    expect(result).toBeNull();
    expect(mockRedisInstance.incr).toHaveBeenCalledTimes(1);
    expect(mockRedisInstance.expire).toHaveBeenCalledTimes(1);
  });

  it("returns a 429 Response using Redis ttl for retryAfter once over the max", async () => {
    mockRedisInstance.incr.mockResolvedValueOnce(6);
    mockRedisInstance.ttl.mockResolvedValueOnce(30);

    const { rateLimitAsync } = await import("@/lib/rate-limit");
    const result = await rateLimitAsync(
      makeRequest({ "x-forwarded-for": "1.2.3.5" }),
      {
        windowMs: 60_000,
        maxRequests: 5,
      },
    );

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(429);
    expect(result?.headers.get("Retry-After")).toBe("30");
  });

  it("fails open to in-memory limiting when Redis throws", async () => {
    mockRedisInstance.incr.mockRejectedValueOnce(
      new Error("connection refused"),
    );

    const { rateLimitAsync } = await import("@/lib/rate-limit");
    const result = await rateLimitAsync(
      makeRequest({ "x-forwarded-for": "1.2.3.6" }),
      {
        windowMs: 60_000,
        maxRequests: 5,
      },
    );

    // Falls back to the in-memory path, which allows the first request.
    expect(result).toBeNull();
  });

  it("rateLimitUserEmailAsync checks minute then daily Redis counters", async () => {
    mockRedisInstance.incr
      .mockResolvedValueOnce(1) // minute counter
      .mockResolvedValueOnce(1); // daily counter
    mockRedisInstance.expire.mockResolvedValue(1);

    const { rateLimitUserEmailAsync } = await import("@/lib/rate-limit");
    const result = await rateLimitUserEmailAsync("user@example.com", 1);

    expect(result).toBeNull();
    expect(mockRedisInstance.incr).toHaveBeenCalledTimes(2);
  });

  it("rateLimitUserEmailAsync denies with dailyRemaining 0 once the daily Redis counter is exceeded", async () => {
    mockRedisInstance.incr
      .mockResolvedValueOnce(1) // minute counter: allowed
      .mockResolvedValueOnce(501); // daily counter: over the 500 cap
    mockRedisInstance.expire.mockResolvedValue(1);
    mockRedisInstance.ttl.mockResolvedValueOnce(3600);

    const { rateLimitUserEmailAsync } = await import("@/lib/rate-limit");
    const result = await rateLimitUserEmailAsync("user2@example.com", 1);

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(429);
    expect(result?.headers.get("X-RateLimit-Daily-Remaining")).toBe("0");
  });
});
