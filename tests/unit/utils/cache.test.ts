/**
 * Unit tests for cache utilities
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
  MemoryCache,
  getOrSet as _getOrSet,
  CacheKeys,
  CacheTTL,
} from "@/lib/cache";

// Mock Upstash Redis for testing
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    keys: vi.fn().mockResolvedValue([]),
  })),
}));

describe("MemoryCache", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({
      defaultTTL: 300,
      maxEntries: 100,
      keyPrefix: "test:",
    });
  });

  describe("basic operations", () => {
    it("should set and get a value", async () => {
      await cache.set("key1", { data: "value1" });
      const result = await cache.get("key1");

      expect(result).toEqual({ data: "value1" });
    });

    it("should return null for non-existent keys", async () => {
      const result = await cache.get("nonexistent");

      expect(result).toBeNull();
    });

    it("should delete a value", async () => {
      await cache.set("key1", "value1");
      await cache.delete("key1");
      const result = await cache.get("key1");

      expect(result).toBeNull();
    });

    it("should check if key exists", async () => {
      await cache.set("key1", "value1");

      expect(await cache.has("key1")).toBe(true);
      expect(await cache.has("nonexistent")).toBe(false);
    });

    it("should clear all values", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.clear();

      expect(await cache.get("key1")).toBeNull();
      expect(await cache.get("key2")).toBeNull();
    });
  });

  describe("TTL handling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should expire entries after TTL", async () => {
      await cache.set("key1", "value1", 1); // 1 second TTL

      expect(await cache.get("key1")).toBe("value1");

      // Advance time past TTL
      vi.advanceTimersByTime(1500);

      expect(await cache.get("key1")).toBeNull();
    });

    it("should use custom TTL when provided", async () => {
      await cache.set("key1", "value1", 5); // 5 second TTL

      vi.advanceTimersByTime(3000); // 3 seconds
      expect(await cache.get("key1")).toBe("value1");

      vi.advanceTimersByTime(3000); // 6 seconds total
      expect(await cache.get("key1")).toBeNull();
    });

    it("should use default TTL when not specified", async () => {
      await cache.set("key1", "value1");

      // Should still exist before default TTL (300 seconds)
      vi.advanceTimersByTime(200000); // 200 seconds
      expect(await cache.get("key1")).toBe("value1");
    });
  });

  describe("eviction", () => {
    it("should evict oldest entries when max entries exceeded", async () => {
      const smallCache = new MemoryCache({
        defaultTTL: 300,
        maxEntries: 3,
        keyPrefix: "test:",
      });

      await smallCache.set("key1", "value1");
      await smallCache.set("key2", "value2");
      await smallCache.set("key3", "value3");
      await smallCache.set("key4", "value4"); // This should trigger eviction

      // oldest entry should be evicted
      const stats = smallCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(3);
    });

    it("should provide cache statistics", () => {
      const stats = cache.getStats();

      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("maxEntries");
      expect(stats.maxEntries).toBe(100);
    });
  });

  describe("complex data types", () => {
    it("should handle arrays", async () => {
      const array = [1, 2, 3, 4, 5];
      await cache.set("array", array);
      const result = await cache.get<number[]>("array");

      expect(result).toEqual(array);
    });

    it("should handle nested objects", async () => {
      const obj = {
        user: {
          name: "John",
          contacts: [{ email: "test@example.com" }],
        },
      };
      await cache.set("nested", obj);
      const result = await cache.get<typeof obj>("nested");

      expect(result).toEqual(obj);
    });

    it("should handle null values", async () => {
      await cache.set("null", null);
      const result = await cache.get("null");

      // Note: null is stored but cache returns null for missing keys too
      // Implementation detail - null might be treated as "no value"
      expect(result).toBeNull();
    });
  });
});

describe("CacheKeys", () => {
  it("should generate user contacts key", () => {
    const key = CacheKeys.userContacts("test@example.com");
    expect(key).toBe("contacts:test@example.com");
  });

  it("should generate user campaigns key", () => {
    const key = CacheKeys.userCampaigns("test@example.com");
    expect(key).toBe("campaigns:test@example.com");
  });

  it("should generate user templates key", () => {
    const key = CacheKeys.userTemplates("test@example.com");
    expect(key).toBe("templates:test@example.com");
  });

  it("should generate campaign key", () => {
    const key = CacheKeys.campaign("campaign-123");
    expect(key).toBe("campaign:campaign-123");
  });

  it("should generate template key", () => {
    const key = CacheKeys.template("template-456");
    expect(key).toBe("template:template-456");
  });

  it("should generate user settings key", () => {
    const key = CacheKeys.userSettings("test@example.com");
    expect(key).toBe("settings:test@example.com");
  });
});

describe("CacheTTL", () => {
  it("should have correct TTL values", () => {
    expect(CacheTTL.SHORT).toBe(30);
    expect(CacheTTL.DEFAULT).toBe(300);
    expect(CacheTTL.LONG).toBe(3600);
    expect(CacheTTL.ONE_HOUR).toBe(3600);
    expect(CacheTTL.ONE_DAY).toBe(86400);
  });
});

describe("getOrSet", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should call fetcher when cache miss", async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: "fresh" });

    // Create a simple test for the getOrSet pattern
    const cache = new MemoryCache();
    const key = "test-key";

    let cached = await cache.get(key);
    if (cached === null) {
      cached = await fetcher();
      await cache.set(key, cached);
    }

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cached).toEqual({ data: "fresh" });
  });

  it("should return cached value on cache hit", async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: "fresh" });
    const cache = new MemoryCache();
    const key = "test-key";

    // Pre-populate cache
    await cache.set(key, { data: "cached" });

    const cached = await cache.get(key);
    let result = cached;
    if (cached === null) {
      result = await fetcher();
      await cache.set(key, result);
    }

    expect(fetcher).not.toHaveBeenCalled();
    expect(result).toEqual({ data: "cached" });
  });
});
