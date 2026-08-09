import { Redis } from "@upstash/redis";

import {
  DEFAULT_CACHE_TTL_SECONDS,
  LONG_CACHE_TTL_SECONDS,
  SHORT_CACHE_TTL_SECONDS,
} from "./constants";
import { apiLogger } from "./logger";

/**
 * Cache entry with metadata (for memory cache)
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  /** Default TTL in seconds */
  defaultTTL: number;
  /** Maximum entries for in-memory cache */
  maxEntries: number;
  /** Prefix for cache keys */
  keyPrefix: string;
}

/**
 * Cache interface for different implementations
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats?():
    | { size: number; maxEntries: number }
    | Promise<{ size: number; maxEntries: number }>;
}

/**
 * In-Memory Cache Implementation
 * Used as fallback when Upstash is not configured (development)
 */
class MemoryCache implements CacheProvider {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: DEFAULT_CACHE_TTL_SECONDS,
      maxEntries: 1000,
      keyPrefix: "flier:",
      ...config,
    };
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.expiresAt;
  }

  private evictExpired(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldest(): void {
    if (this.cache.size <= this.config.maxEntries) {
      return;
    }

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(fullKey);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const fullKey = this.getKey(key);
    const ttl = ttlSeconds ?? this.config.defaultTTL;

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl * 1000,
      createdAt: Date.now(),
    };

    this.cache.set(fullKey, entry);
    this.evictExpired();
    this.evictOldest();
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    this.cache.delete(fullKey);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  getStats(): { size: number; maxEntries: number } {
    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
    };
  }
}

/**
 * Upstash Redis Cache Implementation
 * Shared cache provider for multi-process Next.js deployments
 *
 * Required env variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */
class UpstashCache implements CacheProvider {
  private client: Redis;
  private config: CacheConfig;
  private isAvailable: boolean = true;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: DEFAULT_CACHE_TTL_SECONDS,
      maxEntries: 10000,
      keyPrefix: "flier:",
      ...config,
    };

    // Initialize Upstash Redis client
    // Uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env
    this.client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    // Check if URL is valid and not a placeholder
    if (process.env.UPSTASH_REDIS_REST_URL?.includes("your-region")) {
      this.isAvailable = false;
      apiLogger.warn(
        "[Cache] Upstash Redis URL is a placeholder. Caching disabled.",
      );
    } else {
      apiLogger.info("[Cache] Upstash Redis initialized");
    }
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable) {
      return null;
    }

    try {
      const fullKey = this.getKey(key);
      // Add a timeout to avoid long waits on network issues
      const value = await Promise.race([
        this.client.get<T>(fullKey),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error("Upstash timeout")), 2000),
        ),
      ]);
      return value;
    } catch (error: any) {
      apiLogger.error("[Cache] Upstash get error", {
        message: error.message || String(error),
      });

      // If it's a connection error, temporarily disable the cache
      if (
        error.code === "ENOTFOUND" ||
        error.message?.includes("ENOTFOUND") ||
        error.message?.includes("timeout")
      ) {
        this.isAvailable = false;
        apiLogger.warn(
          "[Cache] Upstash connection failed. Disabling cache for this instance.",
        );
        // Re-enable after 5 minutes
        setTimeout(
          () => {
            this.isAvailable = true;
          },
          5 * 60 * 1000,
        );
      }
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable) {
      return;
    }

    try {
      const fullKey = this.getKey(key);
      const ttl = ttlSeconds ?? this.config.defaultTTL;

      // Upstash setex: set with expiration
      await Promise.race([
        this.client.setex(fullKey, ttl, JSON.stringify(value)),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Upstash timeout")), 2000),
        ),
      ]);
    } catch (error: any) {
      apiLogger.error("[Cache] Upstash set error", {
        message: error.message || String(error),
      });

      if (
        error.code === "ENOTFOUND" ||
        error.message?.includes("ENOTFOUND") ||
        error.message?.includes("timeout")
      ) {
        this.isAvailable = false;
        apiLogger.warn(
          "[Cache] Upstash connection failed. Disabling cache for this instance.",
        );
        setTimeout(
          () => {
            this.isAvailable = true;
          },
          5 * 60 * 1000,
        );
      }
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isAvailable) {
      return;
    }

    try {
      const fullKey = this.getKey(key);
      await this.client.del(fullKey);
    } catch (error) {
      apiLogger.error(
        "[Cache] Upstash delete error",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const fullKey = this.getKey(key);
      const exists = await this.client.exists(fullKey);
      return exists === 1;
    } catch (error) {
      apiLogger.error(
        "[Cache] Upstash has error",
        error instanceof Error ? error : undefined,
      );
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable) {
      return;
    }

    try {
      // Use SCAN to find all keys with our prefix, then delete
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        // Delete in batches to avoid timeout
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await this.client.del(...batch);
        }
      }
    } catch (error) {
      apiLogger.error(
        "[Cache] Upstash clear error",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get cache info from Upstash
   */
  async getStats(): Promise<{ size: number; maxEntries: number }> {
    try {
      const keys = await this.client.keys(`${this.config.keyPrefix}*`);
      return {
        size: keys.length,
        maxEntries: this.config.maxEntries,
      };
    } catch {
      return { size: 0, maxEntries: this.config.maxEntries };
    }
  }

  /**
   * Increment a counter (useful for rate limiting, analytics)
   */
  async incr(key: string): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.client.incr(fullKey);
    } catch (error) {
      apiLogger.error(
        "[Cache] Upstash incr error",
        error instanceof Error ? error : undefined,
      );
      return 0;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      const result = await this.client.expire(fullKey, ttlSeconds);
      return result === 1;
    } catch (error) {
      apiLogger.error(
        "[Cache] Upstash expire error",
        error instanceof Error ? error : undefined,
      );
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      const fullKey = this.getKey(key);
      return await this.client.ttl(fullKey);
    } catch (error) {
      apiLogger.error(
        "[Cache] Upstash ttl error",
        error instanceof Error ? error : undefined,
      );
      return -1;
    }
  }
}

// ============================================
// Cache Factory
// ============================================

/**
 * Check if Upstash is configured
 */
function isUpstashConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Create a cache instance based on environment
 * Priority: Upstash > Memory (fallback)
 */
function createCache(): CacheProvider {
  if (isUpstashConfigured()) {
    apiLogger.info("[Cache] Using Upstash Redis (production)");
    return new UpstashCache();
  }

  apiLogger.info("[Cache] Using in-memory cache (development fallback)");
  return new MemoryCache();
}

// Export singleton cache instance
export const cache = createCache();

// Export cache class for custom instances
export { MemoryCache, UpstashCache };

// ============================================
// Cache Helper Functions
// ============================================

/**
 * Get or set cache value with automatic fallback
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds?: number,
): Promise<T> {
  const cached = await cache.get<T>(key);

  if (cached !== null) {
    return cached;
  }

  const value = await fetcher();
  await cache.set(key, value, ttlSeconds);

  return value;
}

/**
 * Cache decorator for async functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttlSeconds: number = DEFAULT_CACHE_TTL_SECONDS,
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    return getOrSet(key, () => fn(...args), ttlSeconds);
  }) as T;
}

/**
 * Invalidate cache entries matching a pattern
 */
export async function invalidatePattern(_pattern: string): Promise<void> {
  // For memory cache, we need to iterate
  // For Redis, this uses KEYS command (use with caution in production)
  await cache.clear(); // Simplified: clear all for now
}

// ============================================
// Specialized Cache Functions
// ============================================

/**
 * Cache keys for common data types
 */
export const CacheKeys = {
  userContacts: (userEmail: string) => `contacts:${userEmail}`,
  userCampaigns: (userEmail: string) => `campaigns:${userEmail}`,
  userTemplates: (userEmail: string) => `templates:${userEmail}`,
  userSignatures: (userEmail: string) => `signatures:${userEmail}`,
  campaign: (campaignId: string) => `campaign:${campaignId}`,
  template: (templateId: string) => `template:${templateId}`,
  userSettings: (userEmail: string) => `settings:${userEmail}`,
};

/**
 * Cache TTL presets
 */
export const CacheTTL = {
  SHORT: SHORT_CACHE_TTL_SECONDS,
  DEFAULT: DEFAULT_CACHE_TTL_SECONDS,
  LONG: LONG_CACHE_TTL_SECONDS,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
};
