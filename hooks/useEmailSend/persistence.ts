import {
  STORAGE_KEY_CAMPAIGN_LOCK,
  STORAGE_KEY_CAMPAIGN_STATE,
  STORAGE_KEY_TAB_ID,
} from "@/lib/constants";
import type { CampaignState } from "@/types/campaign";

export const CAMPAIGN_STATE_KEY = STORAGE_KEY_CAMPAIGN_STATE;
export const CAMPAIGN_LOCK_KEY = STORAGE_KEY_CAMPAIGN_LOCK;

export const generateCampaignId = () => {
  return `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

export const getTabId = (): string => {
  if (typeof window === "undefined") {
    return "server";
  }

  let tabId = sessionStorage.getItem(STORAGE_KEY_TAB_ID);
  if (!tabId) {
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem(STORAGE_KEY_TAB_ID, tabId);
  }

  return tabId;
};

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const acquireLock = (): boolean => {
  const existingLock = localStorage.getItem(CAMPAIGN_LOCK_KEY);
  const currentTabId = getTabId();
  const now = Date.now();

  if (existingLock) {
    try {
      const lock = JSON.parse(existingLock);
      // Lock is valid if it's ours or if it hasn't expired
      if (now - lock.timestamp < LOCK_TIMEOUT_MS && lock.tabId !== currentTabId) {
        return false;
      }
    } catch {
      // Corrupted lock data, proceed to acquire
    }
  }

  // Attempt to acquire lock atomically
  const newLock = {
    tabId: currentTabId,
    timestamp: now,
  };

  localStorage.setItem(CAMPAIGN_LOCK_KEY, JSON.stringify(newLock));

  // Verify we actually acquired the lock (mitigate TOCTOU race condition)
  // Note: For robust cross-tab sync, consider using BroadcastChannel or storage events
  try {
    const verifyLock = localStorage.getItem(CAMPAIGN_LOCK_KEY);
    if (!verifyLock) {
      return false;
    }
    const lock = JSON.parse(verifyLock);
    if (lock.tabId !== currentTabId || lock.timestamp !== now) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
};

export const releaseLock = () => {
  const existingLock = localStorage.getItem(CAMPAIGN_LOCK_KEY);

  if (existingLock) {
    try {
      const lock = JSON.parse(existingLock);
      if (lock.tabId === getTabId()) {
        localStorage.removeItem(CAMPAIGN_LOCK_KEY);
      }
    } catch {
      // Corrupted lock data, remove it
      localStorage.removeItem(CAMPAIGN_LOCK_KEY);
    }
  }
};

export const refreshLock = (): boolean => {
  const currentTabId = getTabId();
  const existingLock = localStorage.getItem(CAMPAIGN_LOCK_KEY);

  if (existingLock) {
    try {
      const lock = JSON.parse(existingLock);
      // Must be our lock and not expired
      if (lock.tabId !== currentTabId) {
        return false; // Not our lock to refresh
      }
      if (Date.now() - lock.timestamp >= LOCK_TIMEOUT_MS) {
        return false; // Lock has expired
      }
    } catch {
      // Corrupted lock data
      return false;
    }
  } else {
    // No lock exists - we can't refresh what doesn't exist
    return false;
  }

  localStorage.setItem(
    CAMPAIGN_LOCK_KEY,
    JSON.stringify({
      tabId: currentTabId,
      timestamp: Date.now(),
    }),
  );

  return true;
};

export const saveCampaignStateToStorage = (state: CampaignState) => {
  localStorage.setItem(CAMPAIGN_STATE_KEY, JSON.stringify(state));
};

export const clearCampaignStateFromStorage = () => {
  localStorage.removeItem(CAMPAIGN_STATE_KEY);
};

export const loadSavedCampaignState = (): CampaignState | null => {
  const saved = localStorage.getItem(CAMPAIGN_STATE_KEY);
  if (!saved) {
    return null;
  }
  try {
    return JSON.parse(saved) as CampaignState;
  } catch {
    // Clear corrupted state
    localStorage.removeItem(CAMPAIGN_STATE_KEY);
    return null;
  }
};
