/**
 * Helpers for picking and describing campaign send times.
 *
 * The UI works in the user's local time via `<input type="datetime-local">`,
 * which has no timezone at all — everything crossing an API boundary is
 * converted to a UTC ISO string here so there is exactly one place where the
 * conversion can be wrong.
 *
 * @module schedule
 */

import { MAX_SCHEDULE_HORIZON_MS, MIN_SCHEDULE_LEAD_MS } from "./constants";

/** Pad to the two-digit form `datetime-local` requires. */
function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Format a Date as the `YYYY-MM-DDTHH:mm` string a `datetime-local` input
 * expects, in *local* time (never UTC — `toISOString()` would shift the clock).
 */
export function toDateTimeLocalValue(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Parse a `datetime-local` value as local time. Returns null if unparseable. */
export function parseDateTimeLocal(value: string): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The viewer's IANA timezone, e.g. `Asia/Kolkata`. */
export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Earliest value the picker should accept, as a `datetime-local` string. */
export function getMinScheduleValue(): string {
  return toDateTimeLocalValue(new Date(Date.now() + MIN_SCHEDULE_LEAD_MS));
}

/** Latest value the picker should accept, as a `datetime-local` string. */
export function getMaxScheduleValue(): string {
  return toDateTimeLocalValue(new Date(Date.now() + MAX_SCHEDULE_HORIZON_MS));
}

export interface ScheduleValidation {
  valid: boolean;
  /** User-facing reason the chosen time was rejected */
  error?: string;
  /** The parsed instant, present only when `valid` */
  date?: Date;
}

/**
 * Check a picked time against the same rules the API enforces, so the user
 * finds out before submitting rather than after.
 */
export function validateScheduleValue(value: string): ScheduleValidation {
  const date = parseDateTimeLocal(value);
  if (!date) {
    return { valid: false, error: "Pick a date and time to send" };
  }

  const now = Date.now();
  if (date.getTime() < now + MIN_SCHEDULE_LEAD_MS) {
    return {
      valid: false,
      error: "Choose a time at least a minute from now",
    };
  }
  if (date.getTime() > now + MAX_SCHEDULE_HORIZON_MS) {
    return { valid: false, error: "Choose a time within the next year" };
  }

  return { valid: true, date };
}

/** A one-tap send time offered next to the picker. */
export interface SchedulePreset {
  label: string;
  getDate: () => Date;
}

/**
 * Common send times. "Tomorrow morning" and "Monday morning" both land at
 * 9:00 local, the conventional slot for campaign delivery.
 */
export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    label: "In 1 hour",
    getDate: () => new Date(Date.now() + 60 * 60 * 1000),
  },
  {
    label: "Tomorrow 9 AM",
    getDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
      return date;
    },
  },
  {
    label: "Monday 9 AM",
    getDate: () => {
      const date = new Date();
      // 1 = Monday; always jump to the *next* Monday, never today.
      const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
      date.setDate(date.getDate() + daysUntilMonday);
      date.setHours(9, 0, 0, 0);
      return date;
    },
  },
];
