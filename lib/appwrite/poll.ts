/**
 * Change notification for collections read through API routes.
 *
 * Appwrite's realtime channels need a client-side Appwrite session. This app
 * authenticates with NextAuth and reaches Appwrite only through server routes
 * holding the API key, so there is no socket to subscribe to. The
 * `subscribeToUser*` helpers used to return `() => {}` and silently deliver
 * nothing — callers believed they were live.
 *
 * Polling is what's actually available, so this makes it explicit and cheap:
 * ticks are skipped while the tab is hidden, and a hidden tab refreshes once
 * on becoming visible so it catches up rather than waiting out a full period.
 *
 * @module appwrite/poll
 */

/** Default gap between refreshes. Deliberately slow — this is not realtime. */
export const DEFAULT_POLL_INTERVAL_MS = 60_000;

export interface PollOptions {
  /** Milliseconds between refreshes. Defaults to {@link DEFAULT_POLL_INTERVAL_MS}. */
  intervalMs?: number;
}

/**
 * Invoke `onChange` periodically while the tab is visible.
 *
 * @returns An unsubscribe function, matching the contract call sites already
 *   use in their `useEffect` cleanups.
 */
export function pollForUpdates(
  onChange: () => void,
  options: PollOptions = {},
): () => void {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  // Server render / non-DOM environment: nothing to poll from.
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const tick = () => {
    if (document.visibilityState === "hidden") {
      return;
    }
    onChange();
  };

  const interval = setInterval(tick, intervalMs);

  // A tab backgrounded for an hour would otherwise show stale data until its
  // next scheduled tick; refresh as soon as the user looks at it again.
  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      onChange();
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}
