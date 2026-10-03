import { describe, expect, it } from "vite-plus/test";

import { replacePlaceholders } from "@/lib/email/placeholders";
import { reviewCampaign, type PreflightInput } from "@/lib/email/preflight";

const campaign = (overrides: Partial<PreflightInput> = {}): PreflightInput => ({
  subject: "Hello {{name}}",
  content: "<p>Welcome</p>",
  recipients: ["a@example.com"],
  recipientFields: { "a@example.com": { name: "Ada" } },
  attachments: [],
  ...overrides,
});

describe("campaign preflight", () => {
  it("normalizes recipients, removes duplicates, and excludes suppressed recipients", () => {
    const result = reviewCampaign(
      campaign({ recipients: [" A@example.com ", "a@example.com", "b@example.com"] }),
      ["B@example.com"],
    );
    expect(result).toEqual({
      recipients: ["a@example.com"],
      duplicates: 1,
      suppressed: ["b@example.com"],
      issues: [],
    });
  });
  it("identifies unresolved values per recipient", () => {
    const result = reviewCampaign(campaign({ recipients: ["b@example.com"] }));
    expect(result.issues).toContainEqual({
      recipient: "b@example.com",
      message: "Missing values: name.",
    });
  });
  it("rejects invalid addresses and an empty rich-text body", () => {
    const result = reviewCampaign(campaign({ recipients: ["invalid"], content: "<p>&nbsp;</p>" }));
    expect(result.issues.map((issue) => issue.message)).toContain("Invalid email address.");
    expect(result.issues.map((issue) => issue.message)).toContain("Add email content.");
  });
  it("checks pending attachments and combined size", () => {
    const result = reviewCampaign(
      campaign({
        attachments: [{ name: "report.pdf", data: "processing", fileSize: 26 * 1024 * 1024 }],
      }),
    );
    expect(result.issues).toHaveLength(2);
  });
  it("requires each personalized attachment URL", () => {
    expect(
      reviewCampaign(campaign({ personalizedAttachmentColumn: "pdf" })).issues[0].recipient,
    ).toBe("a@example.com");
  });
  it("matches mixed-case field names and ignores inherited properties", () => {
    expect(replacePlaceholders("{{firstname}} {FIRSTNAME}", { FirstName: "Ada" })).toBe("Ada Ada");
    expect(replacePlaceholders("{{constructor}}", {})).toBe("{{constructor}}");
  });
});
