import { describe, it, expect } from "vite-plus/test";

import {
  formatForEmail,
  formatForEmailWithDetails,
  formatForPreview,
} from "../index";

describe("formatForEmail", () => {
  it("should format basic HTML content", () => {
    const input = "<p>Hello world</p>";
    const result = formatForEmail(input);

    // Should be wrapped in Gmail container
    expect(result).toContain('<div dir="ltr"');
    expect(result).toContain("font-family: Arial, sans-serif");

    // Should convert p to div with styles
    expect(result).toContain("<div");
    expect(result).toContain("margin: 0.5em 0");
  });

  it("should convert emoji images to Unicode", () => {
    const input = '<p>Hello <img class="emoji" alt="👋" src="/wave.png"></p>';
    const result = formatForEmail(input);

    expect(result).toContain("👋");
    expect(result).not.toContain("<img");
  });

  it("should sanitize dangerous content", () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = formatForEmail(input);

    expect(result).not.toContain("<script>");
    expect(result).toContain("Hello");
  });

  it("should remove editor classes", () => {
    const input = '<p class="editor-paragraph">Content</p>';
    const result = formatForEmail(input);

    expect(result).not.toContain("editor-paragraph");
    expect(result).toContain("Content");
  });

  it("should apply inline styles to elements", () => {
    const input = "<h1>Title</h1><blockquote>Quote</blockquote>";
    const result = formatForEmail(input);

    expect(result).toContain("font-size: 2em");
    expect(result).toContain("border-left:");
  });

  it("should handle empty content gracefully", () => {
    const result = formatForEmail("");
    expect(result).toContain('<div dir="ltr"');
  });

  it("should respect formatting options", () => {
    const input = '<p><img class="emoji" alt="😊"></p>';

    // Without emoji conversion
    const withEmojis = formatForEmail(input, { convertEmojis: false });
    expect(withEmojis).toContain("<img");

    // Without Gmail wrapper
    const noWrapper = formatForEmail(input, { wrapForGmail: false });
    expect(noWrapper).not.toContain('dir="ltr"');
  });

  it("should handle complex content with multiple elements", () => {
    const input = `
      <h1>Welcome</h1>
      <p>Hello world</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
      <blockquote>A quote</blockquote>
      <pre>code block</pre>
    `;
    const result = formatForEmail(input);

    expect(result).toContain("font-size: 2em"); // h1
    expect(result).toContain("list-style-type: disc"); // ul
    expect(result).toContain("border-left:"); // blockquote
    expect(result).toContain("font-family: monospace"); // pre
  });

  it("should handle tables", () => {
    const input = `
      <table>
        <tr>
          <th>Header</th>
        </tr>
        <tr>
          <td>Cell</td>
        </tr>
      </table>
    `;
    const result = formatForEmail(input);

    expect(result).toContain("border-collapse: collapse");
    expect(result).toContain("font-weight: bold");
  });
});

describe("formatForEmailWithDetails", () => {
  it("should return success with formatted HTML", () => {
    const input = "<p>Hello world</p>";
    const result = formatForEmailWithDetails(input);

    expect(result.success).toBe(true);
    expect(result.html).toContain('<div dir="ltr"');
  });

  it("should include debug information", () => {
    const input = "<p>Hello world</p>";
    const result = formatForEmailWithDetails(input);

    expect(result.debug).toBeDefined();
    expect(result.debug?.originalLength).toBe(input.length);
    expect(result.debug?.formattedLength).toBeGreaterThan(0);
    expect(result.debug?.stylesInlined).toBe(true);
  });

  it("should count emoji conversions", () => {
    const input =
      '<p><img class="emoji" alt="😊"><img class="emoji" alt="🎉"></p>';
    const result = formatForEmailWithDetails(input);

    expect(result.debug?.emojisConverted).toBe(2);
  });

  it("should collect validation warnings", () => {
    const input = '<p onclick="test">Hello</p>';
    const result = formatForEmailWithDetails(input);

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("formatForPreview", () => {
  it("should wrap content in preview container", () => {
    const input = "<p>Hello world</p>";
    const result = formatForPreview(input);

    expect(result).toContain("Email Preview");
    expect(result).toContain("max-width: 600px");
    expect(result).toContain("background: #f5f5f5");
  });

  it("should format content by default", () => {
    const input = "<p>Hello world</p>";
    const result = formatForPreview(input);

    expect(result).toContain('<div dir="ltr"');
  });

  it("should skip formatting when preFormat is false", () => {
    const input = "<p>Already formatted</p>";
    const result = formatForPreview(input, false);

    expect(result).toContain("<p>Already formatted</p>");
    expect(result).not.toContain("margin: 0.5em 0");
  });
});
