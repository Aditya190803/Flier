/**
 * Email usage counters (daily + monthly).
 * In-memory by default; Upstash when configured via cache.incr.
 */

import { cache, UpstashCache } from "@/lib/cache";

import type { UsageSnapshot } from "./types";

// Fallback when Redis is unavailable
const memoryDaily = new Map<string, { count: number; resetAt: number }>();
const memoryMonthly = new Map<string, { count: number; resetAt: number }>();

function dayKey(userEmail: string, d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `usage:emails:day:${userEmail.toLowerCase()}:${y}-${m}-${day}`;
}

function monthKey(userEmail: string, d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `usage:emails:month:${userEmail.toLowerCase()}:${y}-${m}`;
}

function endOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0));
}

function endOfUtcMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0));
}

function secondsUntil(date: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
}

function isRedis(): boolean {
  return cache instanceof UpstashCache;
}

async function getCount(
  key: string,
  mem: Map<string, { count: number; resetAt: number }>,
): Promise<number> {
  if (isRedis()) {
    const n = await cache.get<number>(key);
    return typeof n === "number" ? n : 0;
  }
  const entry = mem.get(key);
  if (!entry || Date.now() > entry.resetAt) {
    return 0;
  }
  return entry.count;
}

async function addCount(
  key: string,
  amount: number,
  resetAt: Date,
  mem: Map<string, { count: number; resetAt: number }>,
): Promise<number> {
  if (isRedis() && amount === 1) {
    const next = await (cache as UpstashCache).incr(key);
    if (next === 1) {
      await (cache as UpstashCache).expire(key, secondsUntil(resetAt));
    }
    return next;
  }

  if (isRedis() && amount > 1) {
    // incr by looping — fine for batch sizes we send
    let last = 0;
    for (let i = 0; i < amount; i++) {
      last = await (cache as UpstashCache).incr(key);
      if (last === 1) {
        await (cache as UpstashCache).expire(key, secondsUntil(resetAt));
      }
    }
    return last;
  }

  const now = Date.now();
  const entry = mem.get(key);
  if (!entry || now > entry.resetAt) {
    mem.set(key, { count: amount, resetAt: resetAt.getTime() });
    return amount;
  }
  entry.count += amount;
  mem.set(key, entry);
  return entry.count;
}

export async function getEmailUsage(userEmail: string): Promise<{
  today: number;
  month: number;
  dailyResetAt: Date;
  monthlyResetAt: Date;
}> {
  const dailyResetAt = endOfUtcDay();
  const monthlyResetAt = endOfUtcMonth();
  const [today, month] = await Promise.all([
    getCount(dayKey(userEmail), memoryDaily),
    getCount(monthKey(userEmail), memoryMonthly),
  ]);
  return { today, month, dailyResetAt, monthlyResetAt };
}

export async function incrementEmailUsage(userEmail: string, count: number): Promise<void> {
  if (count <= 0) {
    return;
  }
  const dailyResetAt = endOfUtcDay();
  const monthlyResetAt = endOfUtcMonth();
  await Promise.all([
    addCount(dayKey(userEmail), count, dailyResetAt, memoryDaily),
    addCount(monthKey(userEmail), count, monthlyResetAt, memoryMonthly),
  ]);
}

export async function buildUsageSnapshot(
  userEmail: string,
  emailsPerDay: number,
  emailsPerMonth: number,
): Promise<UsageSnapshot> {
  const { today, month, dailyResetAt, monthlyResetAt } = await getEmailUsage(userEmail);
  return {
    emailsToday: today,
    emailsThisMonth: month,
    dailyRemaining: Math.max(0, emailsPerDay - today),
    monthlyRemaining: Math.max(0, emailsPerMonth - month),
    dailyResetAt: dailyResetAt.toISOString(),
    monthlyResetAt: monthlyResetAt.toISOString(),
  };
}
