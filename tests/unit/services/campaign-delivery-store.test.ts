import { describe, expect, it, vi } from "vite-plus/test";
import { isUncertainDeliveryError } from "@/lib/services/campaign-delivery-store";

vi.mock("@/lib/db", () => ({ dbQuery: vi.fn() }));

describe("delivery uncertainty", () => {
  it.each([
    "Request timeout. Email may have been sent",
    "fetch failed",
    "Gmail API error (503): unavailable",
    "Unknown error",
  ])("holds ambiguous outcome: %s", (error) => {
    expect(isUncertainDeliveryError(error)).toBe(true);
  });
  it.each([
    "Gmail API error (401): unauthorized",
    "Gmail API error (429): rate limited",
    "Invalid email address",
    "Gmail quota exceeded. Daily sending limit reached.",
  ])("allows confirmed rejection recovery: %s", (error) => {
    expect(isUncertainDeliveryError(error)).toBe(false);
  });
});
