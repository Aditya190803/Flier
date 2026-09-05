import { describe, it, expect } from "vite-plus/test";

import { getRecipientsArray } from "@/lib/activity/recipients";

describe("getRecipientsArray", () => {
  it("returns the array as-is when already an array of strings", () => {
    expect(getRecipientsArray(["a@example.com", "b@example.com"])).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("filters out non-string entries from an array", () => {
    expect(
      getRecipientsArray(["a@example.com", 42, null, "b@example.com"]),
    ).toEqual(["a@example.com", "b@example.com"]);
  });

  it("parses a JSON-encoded array string", () => {
    expect(
      getRecipientsArray(JSON.stringify(["a@example.com", "b@example.com"])),
    ).toEqual(["a@example.com", "b@example.com"]);
  });

  it("filters non-string entries from a parsed JSON array", () => {
    expect(
      getRecipientsArray(JSON.stringify(["a@example.com", 1, true])),
    ).toEqual(["a@example.com"]);
  });

  it("falls back to delimiter splitting when the string is not valid JSON", () => {
    expect(
      getRecipientsArray("a@example.com, b@example.com; c@example.com"),
    ).toEqual(["a@example.com", "b@example.com", "c@example.com"]);
  });

  it("splits on newlines too and trims whitespace", () => {
    expect(getRecipientsArray("a@example.com\n b@example.com \n")).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("returns an empty array for empty string input", () => {
    expect(getRecipientsArray("")).toEqual([]);
  });

  it("returns an empty array for non-array, non-string input", () => {
    expect(getRecipientsArray(null)).toEqual([]);
    expect(getRecipientsArray(undefined)).toEqual([]);
    expect(getRecipientsArray(42)).toEqual([]);
    expect(getRecipientsArray({ foo: "bar" })).toEqual([]);
  });

  it("returns an empty array when JSON parses to a non-array", () => {
    // '"a string"' is valid JSON but parses to a string, not an array —
    // current implementation falls through to the delimiter split since
    // the JSON.parse succeeds (doesn't throw), so this exercises the
    // `Array.isArray(parsed)` false branch, which returns [] without
    // falling back to delimiter splitting.
    expect(getRecipientsArray('"a@example.com"')).toEqual([]);
  });
});
