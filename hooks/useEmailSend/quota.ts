import { STORAGE_KEY_GMAIL_QUOTA } from "@/lib/constants";
import type { QuotaInfo } from "@/types/campaign";

/** Gmail free-account ceiling — Pro plan max, not Free default */
export const GMAIL_DAILY_LIMIT = 500;
/** Free-tier default until /api/billing/plan loads */
export const DEFAULT_PLAN_DAILY_LIMIT = 100;
export const QUOTA_STORAGE_KEY = STORAGE_KEY_GMAIL_QUOTA;

export const loadInitialQuota = (): QuotaInfo => {
  if (typeof window === "undefined") {
    return {
      dailyLimit: DEFAULT_PLAN_DAILY_LIMIT,
      estimatedUsed: 0,
      estimatedRemaining: DEFAULT_PLAN_DAILY_LIMIT,
      lastUpdated: null,
    };
  }

  try {
    const stored = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const lastUpdated = new Date(parsed.lastUpdated);
      const now = new Date();

      if (lastUpdated.toDateString() !== now.toDateString()) {
        const limit = parsed.dailyLimit || DEFAULT_PLAN_DAILY_LIMIT;
        return {
          dailyLimit: limit,
          estimatedUsed: 0,
          estimatedRemaining: limit,
          lastUpdated: null,
        };
      }

      return {
        ...parsed,
        lastUpdated,
      };
    }
  } catch {
    // Fall through to defaults when quota cannot be parsed.
  }

  return {
    dailyLimit: DEFAULT_PLAN_DAILY_LIMIT,
    estimatedUsed: 0,
    estimatedRemaining: DEFAULT_PLAN_DAILY_LIMIT,
    lastUpdated: null,
  };
};

/** Merge server plan usage into local quota display */
export async function syncQuotaFromBilling(): Promise<QuotaInfo | null> {
  try {
    const res = await fetch("/api/billing/plan");
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    const dailyLimit = data.plan?.emailsPerDay ?? DEFAULT_PLAN_DAILY_LIMIT;
    const used = data.usage?.emailsToday ?? 0;
    const quota: QuotaInfo = {
      dailyLimit,
      estimatedUsed: used,
      estimatedRemaining: Math.max(0, dailyLimit - used),
      lastUpdated: new Date(),
    };
    persistQuota(quota);
    return quota;
  } catch {
    return null;
  }
}

export const persistQuota = (quotaInfo: QuotaInfo) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quotaInfo));
};

export const clearQuota = () => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(QUOTA_STORAGE_KEY);
};
