import { describe, it, expect } from "vite-plus/test";

import {
  convertEmojisToUnicode,
  sanitizeHTML,
  validateEmailContent,
  EMOJI_NAME_MAP,
} from "../utils";

describe("convertEmojisToUnicode", () => {
  it("should return empty string for empty input", () => {
    expect(convertEmojisToUnicode("")).toBe("");
    expect(convertEmojisToUnicode(null as unknown as string)).toBe("");
  });

  it("should convert emoji images with alt text and emoji class", () => {
    const input = '<img class="emoji" alt="😊" src="/emoji/smile.png">';
    expect(convertEmojisToUnicode(input)).toBe("😊");
  });

  it("should convert emoji images with class before alt", () => {
    const input = '<img alt="👍" class="emoji" src="/emoji/thumbs-up.png">';
    expect(convertEmojisToUnicode(input)).toBe("👍");
  });

  it("should convert emoji images with data-emoji attribute", () => {
    const input = '<img data-emoji="🔥" src="/emoji/fire.png">';
    expect(convertEmojisToUnicode(input)).toBe("🔥");
  });

  it("should convert emoji images with Unicode code point in filename", () => {
    const input = '<img src="/emoji/1f600.png">';
    expect(convertEmojisToUnicode(input)).toBe("😀");
  });

  it("should convert emoji images with u-prefix Unicode in filename", () => {
    const input = '<img src="/emoji/u1f389.png">';
    expect(convertEmojisToUnicode(input)).toBe("🎉");
  });

  it("should convert named emojis using lookup map", () => {
    const input = '<img src="/emoji/heart.png">';
    expect(convertEmojisToUnicode(input)).toBe("❤️");
  });

  it("should remove emoji images that cannot be converted", () => {
    const input = '<img class="emoji" src="/unknown.png">';
    expect(convertEmojisToUnicode(input)).toBe("");
  });

  it("should preserve non-emoji content", () => {
    const input = "<p>Hello world</p>";
    expect(convertEmojisToUnicode(input)).toBe("<p>Hello world</p>");
  });

  it("should handle mixed content with emojis and text", () => {
    const input =
      '<p>Hello <img class="emoji" alt="👋" src="/wave.png"> world</p>';
    expect(convertEmojisToUnicode(input)).toBe("<p>Hello 👋 world</p>");
  });

  it("should handle multiple emoji images", () => {
    const input = '<img class="emoji" alt="😊"><img class="emoji" alt="🎉">';
    expect(convertEmojisToUnicode(input)).toBe("😊🎉");
  });
});

describe("EMOJI_NAME_MAP", () => {
  it("should have common emoji mappings", () => {
    expect(EMOJI_NAME_MAP.smile).toBe("😊");
    expect(EMOJI_NAME_MAP.heart).toBe("❤️");
    expect(EMOJI_NAME_MAP.fire).toBe("🔥");
    expect(EMOJI_NAME_MAP.rocket).toBe("🚀");
    expect(EMOJI_NAME_MAP["thumbs-up"]).toBe("👍");
  });
});

describe("sanitizeHTML", () => {
  it("should return empty string for empty input", () => {
    expect(sanitizeHTML("")).toBe("");
    expect(sanitizeHTML(null as unknown as string)).toBe("");
  });

  it("should remove script tags", () => {
    const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
    expect(sanitizeHTML(input)).toBe("<p>Hello</p><p>World</p>");
  });

  it("should remove event handlers", () => {
    const input = '<button onclick="alert(1)">Click</button>';
    expect(sanitizeHTML(input)).not.toContain("onclick");
  });

  it("should remove javascript: URLs", () => {
    const input = '<a href="javascript:alert(1)">Link</a>';
    expect(sanitizeHTML(input)).not.toContain("javascript:");
  });

  it("should remove editor-specific classes", () => {
    const input = '<p class="editor-paragraph">Text</p>';
    expect(sanitizeHTML(input)).not.toContain("editor-paragraph");
  });

  it("should remove ProseMirror classes", () => {
    const input = '<div class="ProseMirror">Content</div>';
    expect(sanitizeHTML(input)).not.toContain("ProseMirror");
  });

  it("should remove code-block class", () => {
    const input = '<pre class="code-block">code</pre>';
    expect(sanitizeHTML(input)).not.toContain("code-block");
  });

  it("should preserve semantic HTML structure", () => {
    const input = "<h1>Title</h1><p>Content</p><ul><li>Item</li></ul>";
    expect(sanitizeHTML(input)).toBe(
      "<h1>Title</h1><p>Content</p><ul><li>Item</li></ul>",
    );
  });

  it("should clean up excessive whitespace", () => {
    const input = "<p>Hello    world</p>";
    expect(sanitizeHTML(input)).toBe("<p>Hello world</p>");
  });

  it("should handle Gmail-forwarded complex tables", () => {
    const input = '<table><td class="m_12345678">Content</td></table>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain("m_12345678");
  });
});

describe("validateEmailContent", () => {
  it("should return invalid for empty content", () => {
    const result = validateEmailContent("");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Email content is empty");
  });

  it("should return invalid for whitespace-only content", () => {
    const result = validateEmailContent("   \n\t  ");
    expect(result.isValid).toBe(false);
  });

  it("should return invalid for content with script tags", () => {
    const result = validateEmailContent("<p>Hello</p><script>bad</script>");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Script tags are not allowed in email content",
    );
  });

  it("should return invalid for content with javascript URLs", () => {
    const result = validateEmailContent(
      '<a href="javascript:void(0)">Link</a>',
    );
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "JavaScript URLs are not allowed in email content",
    );
  });

  it("should return valid for clean HTML content", () => {
    const result = validateEmailContent("<p>Hello world</p>");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should warn about event handlers", () => {
    const result = validateEmailContent(
      '<button onclick="test">Click</button>',
    );
    expect(result.warnings).toContain(
      "Event handlers will be removed from email content",
    );
  });

  it("should warn about iframes", () => {
    const result = validateEmailContent(
      '<iframe src="https://example.com"></iframe>',
    );
    expect(result.warnings).toContain(
      "Iframes are not supported in most email clients",
    );
  });

  it("should warn about forms", () => {
    const result = validateEmailContent("<form><input type='text'></form>");
    expect(result.warnings).toContain(
      "Forms are not supported in most email clients",
    );
  });

  it("should warn about video/audio elements", () => {
    const result = validateEmailContent('<video src="video.mp4"></video>');
    expect(result.warnings).toContain(
      "Video and audio elements are not supported in most email clients",
    );
  });

  it("should warn about large content", () => {
    const largeContent = "<p>" + "x".repeat(100001) + "</p>";
    const result = validateEmailContent(largeContent);
    expect(result.warnings).toContain(
      "Email content is very large and may be truncated by some email clients",
    );
  });
});
