import { describe, it, expect } from "vite-plus/test";

import {
  applyInlineStyles,
  wrapForGmail,
  ELEMENT_STYLES,
} from "../inline-styles";

describe("applyInlineStyles", () => {
  it("should return empty string for empty input", () => {
    expect(applyInlineStyles("")).toBe("");
  });

  it("should convert <p> tags to <div> with margin styles", () => {
    const input = "<p>Hello world</p>";
    const result = applyInlineStyles(input);
    expect(result).toContain("<div");
    expect(result).toContain("margin: 0.5em 0");
    expect(result).toContain("</div>");
    expect(result).not.toContain("<p>");
  });

  it("should convert empty divs to Gmail-style br divs", () => {
    const input = "<div></div>";
    const result = applyInlineStyles(input);
    expect(result).toBe("<div><br></div>");
  });

  it("should apply heading styles to h1", () => {
    const input = "<h1>Title</h1>";
    const result = applyInlineStyles(input);
    expect(result).toContain("font-size: 2em");
    expect(result).toContain("font-weight: bold");
  });

  it("should apply heading styles to h2", () => {
    const input = "<h2>Subtitle</h2>";
    const result = applyInlineStyles(input);
    expect(result).toContain("font-size: 1.5em");
  });

  it("should apply heading styles to h3", () => {
    const input = "<h3>Section</h3>";
    const result = applyInlineStyles(input);
    expect(result).toContain("font-size: 1.17em");
  });

  it("should apply blockquote styles", () => {
    const input = "<blockquote>Quote</blockquote>";
    const result = applyInlineStyles(input);
    expect(result).toContain("border-left:");
    expect(result).toContain("padding-left:");
    expect(result).toContain("font-style: italic");
  });

  it("should apply pre (code block) styles", () => {
    const input = "<pre>code</pre>";
    const result = applyInlineStyles(input);
    expect(result).toContain("font-family: monospace");
    expect(result).toContain("white-space: pre-wrap");
  });

  it("should apply inline code styles", () => {
    const input = "<code>inline code</code>";
    const result = applyInlineStyles(input);
    expect(result).toContain("font-family: monospace");
    expect(result).toContain("font-size: 0.9em");
  });

  it("should not override existing code styles", () => {
    const input = '<code style="color: red;">styled code</code>';
    const result = applyInlineStyles(input);
    expect(result).toContain('style="color: red;"');
    expect(result).not.toContain("font-family: monospace");
  });

  it("should apply horizontal rule styles", () => {
    const input = "<hr>";
    const result = applyInlineStyles(input);
    expect(result).toContain("border: none");
    expect(result).toContain("border-top:");
  });

  it("should apply unordered list styles", () => {
    const input = "<ul><li>Item</li></ul>";
    const result = applyInlineStyles(input);
    expect(result).toContain("list-style-type: disc");
    expect(result).toContain("padding-left:");
  });

  it("should apply ordered list styles", () => {
    const input = "<ol><li>Item</li></ol>";
    const result = applyInlineStyles(input);
    expect(result).toContain("list-style-type: decimal");
  });

  it("should apply list item styles", () => {
    const input = "<li>Item</li>";
    const result = applyInlineStyles(input);
    expect(result).toContain("margin: 0.25em 0");
  });

  it("should apply table styles", () => {
    const input = "<table><tr><td>Cell</td></tr></table>";
    const result = applyInlineStyles(input);
    expect(result).toContain("border-collapse: collapse");
  });

  it("should apply table header styles", () => {
    const input = "<th>Header</th>";
    const result = applyInlineStyles(input);
    expect(result).toContain("font-weight: bold");
    expect(result).toContain("border:");
  });

  it("should apply table cell styles", () => {
    const input = "<td>Cell</td>";
    const result = applyInlineStyles(input);
    expect(result).toContain("padding: 8px");
    expect(result).toContain("vertical-align: top");
  });

  it("should apply link styles", () => {
    const input = '<a href="https://example.com">Link</a>';
    const result = applyInlineStyles(input);
    expect(result).toContain("text-decoration: underline");
  });

  it("should not override existing link styles", () => {
    const input = '<a href="https://example.com" style="color: red;">Link</a>';
    const result = applyInlineStyles(input);
    expect(result).toContain('style="color: red;"');
  });

  it("should apply image styles", () => {
    const input = '<img src="image.png">';
    const result = applyInlineStyles(input);
    expect(result).toContain("max-width: 100%");
    expect(result).toContain("height: auto");
  });

  it("should apply mark/highlight styles with default color", () => {
    const input = "<mark>Highlighted</mark>";
    const result = applyInlineStyles(input);
    expect(result).toContain("background-color:");
    expect(result).toContain("border-radius:");
  });

  it("should apply mark/highlight styles with custom data-color", () => {
    const input = '<mark data-color="#ff0000">Red highlight</mark>';
    const result = applyInlineStyles(input);
    expect(result).toContain("background-color: #ff0000");
  });

  it("should preserve existing attributes", () => {
    const input = '<p id="test" class="custom">Content</p>';
    const result = applyInlineStyles(input);
    expect(result).toContain('id="test"');
    expect(result).toContain('class="custom"');
  });
});

describe("wrapForGmail", () => {
  it("should wrap content in div with dir=ltr", () => {
    const input = "<p>Content</p>";
    const result = wrapForGmail(input);
    expect(result).toContain('<div dir="ltr"');
    expect(result).toContain("</div>");
    expect(result).toContain("<p>Content</p>");
  });

  it("should apply Gmail wrapper styles", () => {
    const result = wrapForGmail("<p>Test</p>");
    expect(result).toContain("font-family: Arial, sans-serif");
    expect(result).toContain("font-size: 14px");
    expect(result).toContain("line-height: 1.5");
    expect(result).toContain("color: #222222");
  });

  it("should handle empty content", () => {
    const result = wrapForGmail("");
    expect(result).toContain('<div dir="ltr"');
    expect(result).toContain("</div>");
  });
});

describe("ELEMENT_STYLES", () => {
  it("should have paragraph styles", () => {
    expect(ELEMENT_STYLES.paragraph).toBeDefined();
    expect(ELEMENT_STYLES.paragraph.margin).toBe("0.5em 0");
  });

  it("should have heading styles", () => {
    expect(ELEMENT_STYLES.h1).toBeDefined();
    expect(ELEMENT_STYLES.h2).toBeDefined();
    expect(ELEMENT_STYLES.h3).toBeDefined();
    expect(ELEMENT_STYLES.h4).toBeDefined();
  });

  it("should have code styles", () => {
    expect(ELEMENT_STYLES.pre).toBeDefined();
    expect(ELEMENT_STYLES.code).toBeDefined();
    expect(ELEMENT_STYLES.pre.fontFamily).toBe("monospace");
    expect(ELEMENT_STYLES.code.fontFamily).toBe("monospace");
  });

  it("should have table styles", () => {
    expect(ELEMENT_STYLES.table).toBeDefined();
    expect(ELEMENT_STYLES.th).toBeDefined();
    expect(ELEMENT_STYLES.td).toBeDefined();
  });
});
