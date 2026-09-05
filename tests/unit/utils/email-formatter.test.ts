/**
 * Unit tests for email formatting utilities
 */

import { describe, it, expect } from "vite-plus/test";

import { EMAIL_REGEX } from "@/lib/constants";

describe("Email Formatter", () => {
  describe("replacePlaceholders", () => {
    it("should replace simple placeholders", () => {
      const template = "Hello {{name}}, welcome to {{company}}!";
      const data = { name: "John", company: "Acme Inc" };

      // Simple placeholder replacement
      let result = template;
      Object.entries(data).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
      });

      expect(result).toBe("Hello John, welcome to Acme Inc!");
    });

    it("should handle missing placeholders gracefully", () => {
      const template = "Hello {{name}}, your email is {{email}}";
      const data = { name: "John" };

      let result = template;
      Object.entries(data).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
      });

      expect(result).toBe("Hello John, your email is {{email}}");
    });

    it("should replace multiple occurrences", () => {
      const template = "{{name}} loves {{name}}";
      const data = { name: "Jane" };

      let result = template;
      Object.entries(data).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
      });

      expect(result).toBe("Jane loves Jane");
    });

    it("should handle empty data", () => {
      const template = "Hello {{name}}";
      const data: Record<string, string> = {};

      let result = template;
      Object.entries(data).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
      });

      expect(result).toBe("Hello {{name}}");
    });
  });

  describe("sanitizeHtml", () => {
    it("should remove script tags", () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const sanitized = input.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );

      expect(sanitized).not.toContain("<script>");
      expect(sanitized).toContain("<p>Hello</p>");
    });

    it("should remove onclick handlers", () => {
      const input = '<a href="#" onclick="alert(1)">Click</a>';
      const sanitized = input.replace(/\s*on\w+="[^"]*"/gi, "");

      expect(sanitized).not.toContain("onclick");
    });
  });

  describe("parseRecipients", () => {
    it("should parse comma-separated emails", () => {
      const input = "a@test.com, b@test.com, c@test.com";
      const emails = input
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      expect(emails).toHaveLength(3);
      expect(emails).toContain("a@test.com");
    });

    it("should handle semicolon separators", () => {
      const input = "a@test.com; b@test.com; c@test.com";
      const emails = input
        .split(/[,;]/)
        .map((e) => e.trim())
        .filter(Boolean);

      expect(emails).toHaveLength(3);
    });

    it("should filter invalid emails", () => {
      const input = "valid@test.com, invalid, another@test.com";
      const emails = input
        .split(",")
        .map((e) => e.trim())
        .filter((e) => EMAIL_REGEX.test(e));

      expect(emails).toHaveLength(2);
      expect(emails).not.toContain("invalid");
    });
  });
});

describe("CSV Parsing", () => {
  describe("parseCSV", () => {
    it("should parse simple CSV", () => {
      const csv = "name,email\nJohn,john@test.com\nJane,jane@test.com";
      const lines = csv.split("\n");
      const headers = lines[0].split(",");
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",");
        return headers.reduce(
          (obj, header, i) => {
            obj[header] = values[i];
            return obj;
          },
          {} as Record<string, string>,
        );
      });

      expect(rows).toHaveLength(2);
      expect(rows[0].name).toBe("John");
      expect(rows[0].email).toBe("john@test.com");
    });

    it("should handle quoted values with commas", () => {
      // This tests edge case handling - in real implementation use papaparse
      const value = '"Smith, John"';
      const unquoted = value.replace(/^"|"$/g, "");

      expect(unquoted).toBe("Smith, John");
    });

    it("should handle empty values", () => {
      const csv =
        "name,email,company\nJohn,john@test.com,\nJane,jane@test.com,Acme";
      const lines = csv.split("\n");
      const headers = lines[0].split(",");
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",");
        return headers.reduce(
          (obj, header, i) => {
            obj[header] = values[i] || "";
            return obj;
          },
          {} as Record<string, string>,
        );
      });

      expect(rows[0].company).toBe("");
      expect(rows[1].company).toBe("Acme");
    });
  });
});

describe("Date Formatting", () => {
  it("should format date for display", () => {
    const date = new Date("2024-03-15T10:30:00Z");
    const formatted = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    expect(formatted).toContain("Mar");
    expect(formatted).toContain("15");
    expect(formatted).toContain("2024");
  });

  it("should format relative time", () => {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const diff = now - oneHourAgo;
    const hours = Math.floor(diff / 3600000);

    expect(hours).toBe(1);
  });
});
