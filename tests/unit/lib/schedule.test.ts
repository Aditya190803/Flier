import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

import { MIN_SCHEDULE_LEAD_MS } from "@/lib/constants";
import {
  parseDateTimeLocal,
  SCHEDULE_PRESETS,
  toDateTimeLocalValue,
  validateScheduleValue,
} from "@/lib/schedule";

describe("schedule helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // A Wednesday, so the "Monday 9 AM" preset has a non-trivial gap.
    vi.setSystemTime(new Date(2026, 6, 22, 14, 30, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("toDateTimeLocalValue", () => {
    it("formats local time, not UTC", () => {
      const date = new Date(2026, 0, 5, 9, 7);
      expect(toDateTimeLocalValue(date)).toBe("2026-01-05T09:07");
    });

    it("zero-pads single-digit components", () => {
      expect(toDateTimeLocalValue(new Date(2026, 8, 3, 4, 5))).toBe(
        "2026-09-03T04:05",
      );
    });

    it("round-trips through parseDateTimeLocal", () => {
      const original = new Date(2026, 10, 30, 23, 59);
      const parsed = parseDateTimeLocal(toDateTimeLocalValue(original));
      expect(parsed?.getTime()).toBe(original.getTime());
    });
  });

  describe("parseDateTimeLocal", () => {
    it("returns null for empty or unparseable input", () => {
      expect(parseDateTimeLocal("")).toBeNull();
      expect(parseDateTimeLocal("tomorrow")).toBeNull();
    });
  });

  describe("validateScheduleValue", () => {
    it("accepts a time comfortably in the future", () => {
      const future = new Date(Date.now() + 60 * 60 * 1000);
      const result = validateScheduleValue(toDateTimeLocalValue(future));
      expect(result.valid).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
    });

    it("rejects a time in the past", () => {
      const past = new Date(Date.now() - 60 * 60 * 1000);
      const result = validateScheduleValue(toDateTimeLocalValue(past));
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/minute from now/i);
    });

    it("rejects a time inside the minimum lead window", () => {
      const tooSoon = new Date(Date.now() + MIN_SCHEDULE_LEAD_MS / 2);
      expect(validateScheduleValue(toDateTimeLocalValue(tooSoon)).valid).toBe(
        false,
      );
    });

    it("rejects a time beyond the one-year horizon", () => {
      const farOut = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000);
      const result = validateScheduleValue(toDateTimeLocalValue(farOut));
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/within the next year/i);
    });

    it("rejects an empty value with a prompt to pick one", () => {
      const result = validateScheduleValue("");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/pick a date/i);
    });
  });

  describe("presets", () => {
    it("all resolve to valid future times", () => {
      for (const preset of SCHEDULE_PRESETS) {
        const value = toDateTimeLocalValue(preset.getDate());
        expect(
          validateScheduleValue(value),
          `${preset.label} should be schedulable`,
        ).toMatchObject({ valid: true });
      }
    });

    it("'Tomorrow 9 AM' lands at 09:00 the next day", () => {
      const date = SCHEDULE_PRESETS[1].getDate();
      expect(date.getDate()).toBe(23);
      expect(date.getHours()).toBe(9);
      expect(date.getMinutes()).toBe(0);
    });

    it("'Monday 9 AM' lands on the next Monday", () => {
      const date = SCHEDULE_PRESETS[2].getDate();
      expect(date.getDay()).toBe(1);
      expect(date.getHours()).toBe(9);
      expect(date.getTime()).toBeGreaterThan(Date.now());
    });

    it("'Monday 9 AM' skips to next week when today is Monday", () => {
      vi.setSystemTime(new Date(2026, 6, 20, 8, 0, 0));
      const date = SCHEDULE_PRESETS[2].getDate();
      expect(date.getDay()).toBe(1);
      expect(date.getDate()).toBe(27);
    });
  });
});
