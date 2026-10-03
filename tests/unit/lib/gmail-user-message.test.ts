import { describe, expect, it } from "vite-plus/test";

import { formatSendResultLabel } from "@/lib/gmail-user-message";

describe("formatSendResultLabel", () => {
  it("labels cancelled distinctly from failed", () => {
    expect(formatSendResultLabel("cancelled")).toBe("Cancelled");
    expect(formatSendResultLabel("error")).toBe("Failed");
  });
});
