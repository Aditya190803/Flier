/**
 * Rate limiting for API routes.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + TOKEN are set;
 * falls back to in-memory (single instance only).
 */

import { Redis } from "@upstash/redis";

import { logger } from "@/lib/logger";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  maxEmailsPerDay?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const userDailyEmailCount = new Map<string, { count: number; resetTime: number }>();

let cleanupInterval: NodeJS.Timeout | null = null;
let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) {
    return redis;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token && !url.includes("your-region") && !url.includes("placeholder")) {
    redis = new Redis({ url, token });
  } else {
    redis = null;
  }
  return redis;
}

function startCleanup() {
  if (cleanupInterval || getRedis()) {
    return;
  }
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
    for (const [key, entry] of userDailyEmailCount.entries()) {
      if (now > entry.resetTime) {
        userDailyEmailCount.delete(key);
      }
    }
  }, 60000);
}

export const RATE_LIMITS = {
  sendEmail: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  sendEmailPerUser: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    maxEmailsPerDay: 500,
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  },
  api: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
  read: {
    windowMs: 60 * 1000,
    maxRequests: 120,
  },
  public: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
} as const;

function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown-ip";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface UserRateLimitResult extends RateLimitResult {
  dailyRemaining?: number;
  dailyResetTime?: number;
}

function memoryCheck(windowKey: string, config: RateLimitConfig, increment = 1): RateLimitResult {
  startCleanup();
  const now = Date.now();
  const entry = rateLimitStore.get(windowKey);

  if (!entry) {
    const resetTime = now + config.windowMs;
    if (increment > config.maxRequests) {
      rateLimitStore.set(windowKey, { count: 0, resetTime });
      return {
        allowed: false,
        remaining: config.maxRequests,
        resetTime,
        retryAfter: Math.ceil(config.windowMs / 1000),
      };
    }
    rateLimitStore.set(windowKey, { count: increment, resetTime });
    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - increment),
      resetTime,
    };
  }

  if (entry.count + increment > config.maxRequests) {
    return {
      allowed: false,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count += increment;
  return {
    allowed: true,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

async function redisIncr(
  key: string,
  windowMs: number,
  max: number,
  increment = 1,
): Promise<RateLimitResult> {
  const client = getRedis();
  if (!client) {
    return memoryCheck(key, { windowMs, maxRequests: max }, increment);
  }

  const fullKey = `rl:${key}`;
  const now = Date.now();
  const resetTime = now + windowMs;
  const ttlSec = Math.ceil(windowMs / 1000);

  try {
    let count = 0;
    for (let i = 0; i < increment; i++) {
      count = await client.incr(fullKey);
      if (count === 1) {
        await client.expire(fullKey, ttlSec);
      }
    }

    if (count > max) {
      const ttl = await client.ttl(fullKey);
      const retryAfter = ttl > 0 ? ttl : ttlSec;
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + retryAfter * 1000,
        retryAfter,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, max - count),
      resetTime,
    };
  } catch (error) {
    // Fail open to memory on Redis errors so send path still works, but this
    // degrades to per-instance limits — log so outages are visible.
    logger.warn("Redis rate limit unavailable, falling back to in-memory", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return memoryCheck(key, { windowMs, maxRequests: max }, increment);
  }
}

/** Sync in-memory check (tests + edge proxy fallback). */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  customKey?: string,
): RateLimitResult {
  const key = customKey || config.keyGenerator?.(request) || getClientIP(request);
  const windowKey = `${key}:${Math.floor(Date.now() / config.windowMs)}`;
  return memoryCheck(windowKey, config, 1);
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter || 60),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetTime),
      },
    },
  );
}

/** Sync memory-only (proxy / tests). Prefer rateLimitAsync in route handlers. */
export function rateLimit(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.api,
): Response | null {
  const result = checkRateLimit(request, config);
  return result.allowed ? null : rateLimitResponse(result);
}

/** Async rate limit — uses Upstash when configured. */
export async function rateLimitAsync(
  request: Request,
  config: RateLimitConfig = RATE_LIMITS.api,
): Promise<Response | null> {
  const key = config.keyGenerator?.(request) || getClientIP(request);
  const windowKey = `${key}:${Math.floor(Date.now() / config.windowMs)}`;
  const result = await redisIncr(windowKey, config.windowMs, config.maxRequests, 1);
  return result.allowed ? null : rateLimitResponse(result);
}

export function addRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(result.resetTime));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Sync memory per-user email limit (tests). */
export function checkUserEmailRateLimit(
  userEmail: string,
  emailCount: number = 1,
): UserRateLimitResult {
  startCleanup();
  const now = Date.now();
  const config = RATE_LIMITS.sendEmailPerUser;
  const minuteKey = `user:${userEmail}:minute:${Math.floor(now / config.windowMs)}`;
  const minuteResult = memoryCheck(minuteKey, config, emailCount);
  if (!minuteResult.allowed) {
    return minuteResult;
  }

  const dayKey = `user:${userEmail}:daily`;
  let dailyEntry = userDailyEmailCount.get(dayKey);
  if (!dailyEntry) {
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    dailyEntry = { count: 0, resetTime: tomorrow.getTime() };
  }
  const maxDaily = config.maxEmailsPerDay || 500;
  if (dailyEntry.count + emailCount > maxDaily) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: dailyEntry.resetTime,
      retryAfter: Math.ceil((dailyEntry.resetTime - now) / 1000),
      dailyRemaining: Math.max(0, maxDaily - dailyEntry.count),
      dailyResetTime: dailyEntry.resetTime,
    };
  }
  dailyEntry.count += emailCount;
  userDailyEmailCount.set(dayKey, dailyEntry);

  return {
    ...minuteResult,
    dailyRemaining: maxDaily - dailyEntry.count,
    dailyResetTime: dailyEntry.resetTime,
  };
}

export function rateLimitUserEmail(userEmail: string, emailCount: number = 1): Response | null {
  const result = checkUserEmailRateLimit(userEmail, emailCount);
  if (!result.allowed) {
    return userEmailLimitResponse(result);
  }
  return null;
}

function userEmailLimitResponse(result: UserRateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too Many Emails",
      message:
        result.dailyRemaining === 0
          ? `Daily email limit reached. You can send more emails after ${new Date(result.dailyResetTime!).toLocaleString()}.`
          : "Email rate limit exceeded. Please slow down and try again.",
      retryAfter: result.retryAfter,
      dailyRemaining: result.dailyRemaining,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter || 60),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Daily-Remaining": String(result.dailyRemaining || 0),
      },
    },
  );
}

/** Async per-user email limit — Upstash when configured. */
export async function rateLimitUserEmailAsync(
  userEmail: string,
  emailCount: number = 1,
): Promise<Response | null> {
  const config = RATE_LIMITS.sendEmailPerUser;
  const now = Date.now();
  const minuteKey = `user:${userEmail}:minute:${Math.floor(now / config.windowMs)}`;
  const minuteResult = await redisIncr(minuteKey, config.windowMs, config.maxRequests, emailCount);
  if (!minuteResult.allowed) {
    return userEmailLimitResponse(minuteResult);
  }

  const maxDaily = config.maxEmailsPerDay || 500;
  const dayKey = `user:${userEmail}:daily:${new Date().toISOString().slice(0, 10)}`;
  const dayResult = await redisIncr(dayKey, 24 * 60 * 60 * 1000, maxDaily, emailCount);
  if (!dayResult.allowed) {
    return userEmailLimitResponse({
      ...dayResult,
      dailyRemaining: 0,
      dailyResetTime: dayResult.resetTime,
    });
  }

  return null;
}
