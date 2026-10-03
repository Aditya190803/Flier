/**
 * Email Inline Styles
 *
 * Transforms HTML elements to use inline styles for email client compatibility.
 * Email clients don't support external or internal stylesheets, so all styles
 * must be inlined directly on elements.
 */

import { COLORS, GMAIL_WRAPPER_STYLES } from "./types";

// ============================================================================
// STYLE MAPS
// ============================================================================

/**
 * Inline styles for each HTML element type
 * These match Gmail's native email styling
 */
export const ELEMENT_STYLES = {
  // Paragraphs (converted to divs for Gmail compatibility)
  paragraph: {
    margin: "0.5em 0",
    padding: "0",
  },

  // Headings
  h1: {
    fontSize: "2em",
    fontWeight: "bold",
    margin: "0.67em 0",
  },
  h2: {
    fontSize: "1.5em",
    fontWeight: "bold",
    margin: "0.75em 0",
  },
  h3: {
    fontSize: "1.17em",
    fontWeight: "bold",
    margin: "0.83em 0",
  },
  h4: {
    fontSize: "1em",
    fontWeight: "bold",
    margin: "1em 0",
  },

  // Blockquote
  blockquote: {
    borderLeft: `3px solid ${COLORS.borderBlockquote}`,
    margin: "1em 0",
    paddingLeft: "1em",
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },

  // Code blocks
  pre: {
    background: COLORS.bgCode,
    color: "#333",
    fontFamily: "monospace",
    padding: "12px 16px",
    borderRadius: "8px",
    overflowX: "auto",
    margin: "1em 0",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
  },

  // Inline code
  code: {
    background: COLORS.bgCodeInline,
    color: COLORS.codeText,
    padding: "0.2em 0.4em",
    borderRadius: "0.25em",
    fontFamily: "monospace",
    fontSize: "0.9em",
  },

  // Horizontal rule
  hr: {
    border: "none",
    borderTop: `2px solid ${COLORS.borderLight}`,
    margin: "1.5em 0",
  },

  // Lists
  ul: {
    paddingLeft: "1.5em",
    margin: "0.5em 0",
    listStyleType: "disc",
  },
  ol: {
    paddingLeft: "1.5em",
    margin: "0.5em 0",
    listStyleType: "decimal",
  },
  li: {
    margin: "0.25em 0",
  },

  // Tables
  table: {
    borderCollapse: "collapse",
    margin: "1em 0",
    width: "100%",
  },
  th: {
    border: `1px solid ${COLORS.borderMedium}`,
    padding: "8px",
    background: COLORS.bgTableHeader,
    fontWeight: "bold",
    textAlign: "left",
  },
  td: {
    border: `1px solid ${COLORS.borderMedium}`,
    padding: "8px",
    verticalAlign: "top",
  },

  // Links
  a: {
    color: COLORS.link,
    textDecoration: "underline",
  },

  // Images
  img: {
    maxWidth: "100%",
    height: "auto",
  },

  // Highlights/marks
  mark: {
    backgroundColor: COLORS.bgHighlight,
    borderRadius: "0.25em",
    padding: "0.1em 0.2em",
  },
} as const;

// ============================================================================
// STYLE APPLICATION
// ============================================================================

/**
 * Converts a style object to a CSS string
 */
function styleObjectToString(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${cssKey}: ${value}`;
    })
    .join("; ");
}

/**
 * Pre-compiled regex patterns for style application
 */
const STYLE_PATTERNS = {
  // Paragraphs to divs
  pOpen: /<p(\b[^>]*)>/gi,
  pClose: /<\/p>/gi,

  // Empty divs to br (Gmail style)
  emptyDiv: /<div><\/div>/gi,
  whitespaceDiv: /<div>\s*<\/div>/gi,

  // Headings
  h1: /<h1([^>]*)>/gi,
  h2: /<h2([^>]*)>/gi,
  h3: /<h3([^>]*)>/gi,
  h4: /<h4([^>]*)>/gi,

  // Block elements
  blockquote: /<blockquote([^>]*)>/gi,
  pre: /<pre([^>]*)>/gi,
  hr: /<hr([^>]*)>/gi,

  // Lists
  ul: /<ul([^>]*)>/gi,
  ol: /<ol([^>]*)>/gi,
  li: /<li([^>]*)>/gi,

  // Tables
  table: /<table([^>]*)>/gi,
  th: /<th([^>]*)>/gi,
  td: /<td([^>]*)>/gi,

  // Whitespace cleanup
  multipleSpaces: /[ \t]+/g,
} as const;

/**
 * Applies inline styles to HTML elements for email compatibility
 *
 * Transforms semantic HTML to use inline styles that work in email clients.
 * Email clients strip <style> tags and don't support external CSS.
 *
 * @param html - HTML content to transform
 * @returns HTML with inline styles applied
 */
export function applyInlineStyles(html: string): string {
  if (!html) {
    return "";
  }

  let result = html;

  // Convert <p> to <div> with styling (Gmail uses divs, not paragraphs)
  result = result
    .replace(
      STYLE_PATTERNS.pOpen,
      `<div$1 style="${styleObjectToString(ELEMENT_STYLES.paragraph)}">`,
    )
    .replace(STYLE_PATTERNS.pClose, "</div>");

  // Convert empty lines to Gmail-style <div><br></div>
  result = result
    .replace(STYLE_PATTERNS.emptyDiv, "<div><br></div>")
    .replace(STYLE_PATTERNS.whitespaceDiv, "<div><br></div>");

  // Apply heading styles
  result = result
    .replace(STYLE_PATTERNS.h1, `<h1$1 style="${styleObjectToString(ELEMENT_STYLES.h1)}">`)
    .replace(STYLE_PATTERNS.h2, `<h2$1 style="${styleObjectToString(ELEMENT_STYLES.h2)}">`)
    .replace(STYLE_PATTERNS.h3, `<h3$1 style="${styleObjectToString(ELEMENT_STYLES.h3)}">`)
    .replace(STYLE_PATTERNS.h4, `<h4$1 style="${styleObjectToString(ELEMENT_STYLES.h4)}">`);

  // Apply blockquote styles
  result = result.replace(
    STYLE_PATTERNS.blockquote,
    `<blockquote$1 style="${styleObjectToString(ELEMENT_STYLES.blockquote)}">`,
  );

  // Apply code block styles
  result = result.replace(
    STYLE_PATTERNS.pre,
    `<pre$1 style="${styleObjectToString(ELEMENT_STYLES.pre)}">`,
  );

  // Apply inline code styles (only if not already styled)
  result = result.replace(/<code([^>]*)>/gi, (match, attrs: string) => {
    if (attrs.includes("style=")) {
      return match;
    }
    return `<code${attrs} style="${styleObjectToString(ELEMENT_STYLES.code)}">`;
  });

  // Apply horizontal rule styles
  result = result.replace(
    STYLE_PATTERNS.hr,
    `<hr$1 style="${styleObjectToString(ELEMENT_STYLES.hr)}">`,
  );

  // Apply list styles
  result = result
    .replace(STYLE_PATTERNS.ul, `<ul$1 style="${styleObjectToString(ELEMENT_STYLES.ul)}">`)
    .replace(STYLE_PATTERNS.ol, `<ol$1 style="${styleObjectToString(ELEMENT_STYLES.ol)}">`)
    .replace(STYLE_PATTERNS.li, `<li$1 style="${styleObjectToString(ELEMENT_STYLES.li)}">`);

  // Apply table styles
  result = result
    .replace(STYLE_PATTERNS.table, `<table$1 style="${styleObjectToString(ELEMENT_STYLES.table)}">`)
    .replace(STYLE_PATTERNS.th, `<th$1 style="${styleObjectToString(ELEMENT_STYLES.th)}">`)
    .replace(STYLE_PATTERNS.td, `<td$1 style="${styleObjectToString(ELEMENT_STYLES.td)}">`);

  // Apply link styles - ensure all links are styled and have proper attributes
  result = result.replace(
    /<a\s+([^>]*href="([^"]*)"[^>]*)>/gi,
    (match, allAttrs: string, _href: string) => {
      // Skip if already has inline styles
      if (allAttrs.includes("style=")) {
        return match;
      }

      // Build proper link with styles
      let attrs = allAttrs;

      // Ensure target="_blank" for external links
      if (!attrs.includes("target=")) {
        attrs += ' target="_blank"';
      }

      // Add styles
      return `<a ${attrs} style="${styleObjectToString(ELEMENT_STYLES.a)}">`;
    },
  );

  // Apply image styles (only if not already styled)
  result = result.replace(/<img([^>]*)>/gi, (match, attrs: string) => {
    if (attrs.includes("style=")) {
      return match;
    }
    return `<img${attrs} style="${styleObjectToString(ELEMENT_STYLES.img)}">`;
  });

  // Apply mark/highlight styles with data-color support
  result = result.replace(/<mark([^>]*)>/gi, (match, attrs: string) => {
    const colorMatch = attrs.match(/data-color="([^"]*)"/);
    const bgColor = colorMatch ? colorMatch[1] : COLORS.bgHighlight;
    return `<mark${attrs} style="background-color: ${bgColor}; border-radius: 0.25em; padding: 0.1em 0.2em;">`;
  });

  // Clean up extra whitespace
  result = result.replace(STYLE_PATTERNS.multipleSpaces, " ").trim();

  return result;
}

/**
 * Wraps content in Gmail-style container
 *
 * Gmail sends emails wrapped in a <div dir="ltr"> with specific font styles.
 * This wrapper ensures our emails look identical to native Gmail emails.
 *
 * @param html - HTML content to wrap
 * @returns Wrapped HTML in Gmail-style container
 */
export function wrapForGmail(html: string): string {
  const wrapperStyles = styleObjectToString({
    fontFamily: GMAIL_WRAPPER_STYLES.fontFamily,
    fontSize: GMAIL_WRAPPER_STYLES.fontSize,
    lineHeight: GMAIL_WRAPPER_STYLES.lineHeight,
    color: GMAIL_WRAPPER_STYLES.color,
  });

  return `<div dir="ltr" style="${wrapperStyles}">${html}</div>`;
}
