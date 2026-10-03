import sanitizeHtmlLib, { type IOptions, type Transformer } from "sanitize-html";

import type { ValidationResult } from "./types";

const CLASS_FILTERS = [
  /^editor-/,
  /^ProseMirror/,
  /^code-block$/,
  /^blockquote$/,
  /^hr$/,
  /^email-table$/,
  /^selectedCell$/,
  /^m_\d+$/,
  /^prose$/,
  /^max-w-none$/,
];

function normalizeClassList(className?: string): string | undefined {
  if (!className) {
    return undefined;
  }

  const filtered = className
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !CLASS_FILTERS.some((pattern) => pattern.test(token)));

  return filtered.length > 0 ? filtered.join(" ") : undefined;
}

function transformGmailTableTag(tagName: string, attribs: Record<string, string>) {
  const className = attribs.class ?? "";
  const hasGmailClass = /\bm_\d+\b/.test(className);
  const normalizedClass = normalizeClassList(className);
  const nextAttribs = { ...attribs };

  if (normalizedClass) {
    nextAttribs.class = normalizedClass;
  } else {
    delete nextAttribs.class;
  }

  if (
    hasGmailClass &&
    (tagName === "table" || tagName === "tbody" || tagName === "tr" || tagName === "td")
  ) {
    return { tagName: "div", attribs: nextAttribs };
  }

  return { tagName, attribs: nextAttribs };
}

const SANITIZE_OPTIONS: IOptions = {
  disallowedTagsMode: "discard",
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
  parseStyleAttributes: false,
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowedTags: [
    "a",
    "abbr",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "div",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "li",
    "ol",
    "p",
    "pre",
    "span",
    "strong",
    "sub",
    "sup",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "u",
    "ul",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    table: ["width", "height", "cellpadding", "cellspacing", "border", "align"],
    td: ["width", "height", "colspan", "rowspan", "align", "valign"],
    th: ["width", "height", "colspan", "rowspan", "align", "valign"],
    "*": ["class"],
  },
  transformTags: {
    "*": ((tagName, attribs) => {
      const normalizedClass = normalizeClassList(attribs.class);
      const nextAttribs = { ...attribs };
      if (normalizedClass) {
        nextAttribs.class = normalizedClass;
      } else {
        delete nextAttribs.class;
      }
      return { tagName, attribs: nextAttribs };
    }) as Transformer,
    table: ((tagName, attribs) => transformGmailTableTag(tagName, attribs)) as Transformer,
    tbody: ((tagName, attribs) => transformGmailTableTag(tagName, attribs)) as Transformer,
    tr: ((tagName, attribs) => transformGmailTableTag(tagName, attribs)) as Transformer,
    td: ((tagName, attribs) => transformGmailTableTag(tagName, attribs)) as Transformer,
  },
};

export function sanitizeHtml(html: string): string {
  if (!html) {
    return "";
  }

  return sanitizeHtmlLib(html, SANITIZE_OPTIONS)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export const sanitizeHTML = sanitizeHtml;

export function validateEmailContent(html: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!html || html.trim() === "") {
    errors.push("Email content is empty");
    return { isValid: false, errors, warnings };
  }

  if (/<script/i.test(html)) {
    errors.push("Script tags are not allowed in email content");
  }

  if (/javascript:/i.test(html)) {
    errors.push("JavaScript URLs are not allowed in email content");
  }

  if (/\son\w+\s*=/i.test(html)) {
    warnings.push("Event handlers will be removed from email content");
  }

  if (/<iframe/i.test(html)) {
    warnings.push("Iframes are not supported in most email clients");
  }

  if (/<form/i.test(html)) {
    warnings.push("Forms are not supported in most email clients");
  }

  if (/<video|<audio/i.test(html)) {
    warnings.push("Video and audio elements are not supported in most email clients");
  }

  if (html.length > 100000) {
    warnings.push("Email content is very large and may be truncated by some email clients");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
