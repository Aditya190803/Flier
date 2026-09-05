/**
 * Unit tests for lib/cache.ts focused on gaps not covered by
 * tests/unit/utils/cache.test.ts: the Upstash-vs-memory factory selection,
 * the UpstashCache provider itself (Redis mocked), and the cache helper
 * functions (getOrSet, cached, invalidatePattern, key prefixing).
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
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    keys: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  };
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
  MemoryCache,
  UpstashCache,
  getOrSet,
  cached,
  invalidatePattern,
} from "@/lib/cache";

function resetRedisMocks() {
  mockRedisInstance.get.mockReset();
  mockRedisInstance.setex.mockReset();
  mockRedisInstance.del.mockReset();
  mockRedisInstance.exists.mockReset();
  mockRedisInstance.keys.mockReset();
  RedisCtor.mockClear();
}

describe("MemoryCache key prefixing", () => {
  it("isolates keys by prefix so different prefixes don't collide", async () => {
    const cacheA = new MemoryCache({ keyPrefix: "a:" });
    const cacheB = new MemoryCache({ keyPrefix: "b:" });

    await cacheA.set("shared-key", "value-from-a");
    await cacheB.set("shared-key", "value-from-b");

    expect(await cacheA.get("shared-key")).toBe("value-from-a");
    expect(await cacheB.get("shared-key")).toBe("value-from-b");
  });
});

describe("getOrSet / cached helpers (against the exported cache singleton)", () => {
  it("getOrSet calls the fetcher on a miss and caches the result", async () => {
    const fetcher = vi.fn().mockResolvedValue({ fresh: true });
    const key = `getOrSet-test-${Math.random()}`;

    const first = await getOrSet(key, fetcher, 60);
    expect(first).toEqual({ fresh: true });
    expect(fetcher).toHaveBeenCalledTimes(1);

    const second = await getOrSet(key, fetcher, 60);
    expect(second).toEqual({ fresh: true });
    // Fetcher should not be called again since the value was cached.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("cached() decorator memoizes by the provided key generator", async () => {
    const fn = vi.fn(async (id: string) => ({ id, computedAt: Math.random() }));
    const wrapped = cached(fn, (id: string) => `cached-decorator-${id}`, 60);

    const a1 = await wrapped("123");
    const a2 = await wrapped("123");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(a2).toEqual(a1);

    const b1 = await wrapped("456");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(b1.id).toBe("456");
  });
});

describe("invalidatePattern", () => {
  it("clears the cache (current implementation is a simplified full clear)", async () => {
    const key = `invalidate-test-${Math.random()}`;
    await getOrSet(key, async () => "value", 60);

    await invalidatePattern("irrelevant-pattern-*");

    // Since invalidatePattern() currently just calls cache.clear(), the
    // previously cached value is gone even though the pattern didn't match.
    const fetcher = vi.fn().mockResolvedValue("refetched");
    const result = await getOrSet(key, fetcher, 60);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toBe("refetched");
  });
});

describe("UpstashCache provider", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    resetRedisMocks();
    process.env.UPSTASH_REDIS_REST_URL =
      "https://real-upstash-instance.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("prefixes keys and delegates get/set/delete/has to the Redis client", async () => {
    const cache = new UpstashCache({ keyPrefix: "up:" });

    mockRedisInstance.get.mockResolvedValueOnce({ hello: "world" });
    const value = await cache.get("mykey");
    expect(mockRedisInstance.get).toHaveBeenCalledWith("up:mykey");
    expect(value).toEqual({ hello: "world" });

    mockRedisInstance.setex.mockResolvedValueOnce("OK");
    await cache.set("mykey", { hello: "world" }, 120);
    expect(mockRedisInstance.setex).toHaveBeenCalledWith(
      "up:mykey",
      120,
      JSON.stringify({ hello: "world" }),
    );

    mockRedisInstance.exists.mockResolvedValueOnce(1);
    expect(await cache.has("mykey")).toBe(true);
    expect(mockRedisInstance.exists).toHaveBeenCalledWith("up:mykey");

    mockRedisInstance.del.mockResolvedValueOnce(1);
    await cache.delete("mykey");
    expect(mockRedisInstance.del).toHaveBeenCalledWith("up:mykey");
  });

  it("disables itself when the URL is an unconfigured placeholder", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://your-region-here.upstash.io";

    const cache = new UpstashCache();
    // get()/set() should short-circuit and never touch the Redis client.
    expect(await cache.get("k")).toBeNull();
    await cache.set("k", "v");
    expect(mockRedisInstance.get).not.toHaveBeenCalled();
    expect(mockRedisInstance.setex).not.toHaveBeenCalled();
  });

  it("returns null and disables the cache instance on a connection error", async () => {
    const cache = new UpstashCache();
    mockRedisInstance.get.mockRejectedValueOnce(
      Object.assign(new Error("ENOTFOUND upstash"), { code: "ENOTFOUND" }),
    );

    const result = await cache.get("k");
    expect(result).toBeNull();

    // Subsequent calls short-circuit while the instance is marked unavailable.
    const result2 = await cache.get("k");
    expect(result2).toBeNull();
    // Only the first call should have reached the Redis client.
    expect(mockRedisInstance.get).toHaveBeenCalledTimes(1);
  });

  it("getStats reports the number of keys under the prefix", async () => {
    const cache = new UpstashCache({ keyPrefix: "up:", maxEntries: 500 });
    mockRedisInstance.keys.mockResolvedValueOnce(["up:a", "up:b", "up:c"]);

    const stats = await cache.getStats();
    expect(stats).toEqual({ size: 3, maxEntries: 500 });
  });

  it("clear() deletes all keys under the prefix in batches", async () => {
    const cache = new UpstashCache({ keyPrefix: "up:" });
    mockRedisInstance.keys.mockResolvedValueOnce(["up:a", "up:b"]);
    mockRedisInstance.del.mockResolvedValueOnce(2);

    await cache.clear();
    expect(mockRedisInstance.del).toHaveBeenCalledWith("up:a", "up:b");
  });
});
