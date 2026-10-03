import {
  STORAGE_KEY_CAMPAIGN_LOCK,
  STORAGE_KEY_CAMPAIGN_STATE,
  STORAGE_KEY_COMPOSE_DRAFT,
  STORAGE_KEY_GMAIL_QUOTA,
  STORAGE_KEY_TAB_ID,
  STORAGE_KEY_THEME,
} from "@/lib/constants";

const MIGRATIONS: [string, string][] = [
  ["echomail-theme", STORAGE_KEY_THEME],
  ["echomail_draft", STORAGE_KEY_COMPOSE_DRAFT],
  ["echomail_campaign_state", STORAGE_KEY_CAMPAIGN_STATE],
  ["echomail_campaign_lock", STORAGE_KEY_CAMPAIGN_LOCK],
  ["echomail_tab_id", STORAGE_KEY_TAB_ID],
  ["echomail_gmail_quota", STORAGE_KEY_GMAIL_QUOTA],
];

/** ponytail: one-time copy from EchoMail keys; safe to keep across releases */
export function migrateLegacyStorageKeys(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const [oldKey, newKey] of MIGRATIONS) {
    const fromLocal = localStorage.getItem(oldKey);
    if (fromLocal != null && localStorage.getItem(newKey) == null) {
      localStorage.setItem(newKey, fromLocal);
    }
    const fromSession = sessionStorage.getItem(oldKey);
    if (fromSession != null && sessionStorage.getItem(newKey) == null) {
      sessionStorage.setItem(newKey, fromSession);
    }
  }
}
