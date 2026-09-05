import { convertEmojisToUnicode } from "@/lib/email-formatting/client";

import type { Editor } from "@tiptap/react";

const ALLOWED_ANCHOR_PROTOCOLS = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
]);

function isSafeAnchorHref(href: string): boolean {
  const trimmedHref = href.trim();
  if (!trimmedHref) {
    return false;
  }

  if (trimmedHref.startsWith("#")) {
    return true;
  }

  try {
    const parsed = new URL(trimmedHref, "https://example.com");
    return ALLOWED_ANCHOR_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeAnchorTags(html: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const container = document.body.firstElementChild;

  if (!container) {
    return html;
  }

  const anchors = Array.from(container.querySelectorAll("a"));
  anchors.forEach((anchor) => {
    const href = anchor.getAttribute("href") ?? "";
    if (!isSafeAnchorHref(href)) {
      anchor.replaceWith(...Array.from(anchor.childNodes));
      return;
    }

    if (!anchor.hasAttribute("target")) {
      anchor.setAttribute("target", "_blank");
    }
    if (!anchor.hasAttribute("rel")) {
      anchor.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });

  return container.innerHTML;
}

export function createEditorPasteHandler(getEditor: () => Editor | null) {
  return (_view: unknown, event: ClipboardEvent) => {
    const editor = getEditor();
    const htmlData = event.clipboardData?.getData("text/html") || "";
    const textData = event.clipboardData?.getData("text/plain") || "";

    if (htmlData) {
      const pasteToken = `__FLIER_BLANK_LINE_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
      let cleanedHtml = convertEmojisToUnicode(htmlData);

      cleanedHtml = cleanedHtml
        .replace(/^[\s\S]*?<body[^>]*>/i, "")
        .replace(/<\/body>[\s\S]*$/i, "")
        .replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<meta[^>]*>/gi, "")
        .replace(/class="Mso[^"]*"/gi, "")
        .replace(/mso-[^;:"]+:[^;:"]+;?/gi, "")
        .replace(/class="gmail_[^"]*"/gi, "")
        .replace(/<table[^>]*>[\s\S]*?<tbody[^>]*>/gi, "")
        .replace(/<\/tbody>[\s\S]*?<\/table>/gi, "")
        .replace(/<\/?table[^>]*>/gi, "")
        .replace(/<\/?tbody[^>]*>/gi, "")
        .replace(/<\/?thead[^>]*>/gi, "")
        .replace(/<\/?tfoot[^>]*>/gi, "")
        .replace(/<\/?tr[^>]*>/gi, "")
        .replace(/<\/?td[^>]*>/gi, "")
        .replace(/<\/?th[^>]*>/gi, "")
        .replace(/(<br\s*\/?>\s*)+<\/div>/gi, "</div>")
        .replace(/(<br\s*\/?>\s*)+<\/p>/gi, "</p>")
        .replace(/<p[^>]*>\s*(<br\s*\/?>\s*)+<\/p>/gi, pasteToken)
        .replace(/<\/div>\s*<div[^>]*>/gi, "\n")
        .replace(/<div[^>]*>\s*<\/div>/gi, "\n")
        .replace(/<\/?div[^>]*>/gi, "")
        .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
        .replace(/<\/?p[^>]*>/gi, "")
        .replace(new RegExp(pasteToken, "g"), "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/\n\s+\n/g, "\n\n")
        .replace(/\n{2,}/g, "\n\n")
        .replace(/^\n+/, "")
        .replace(/\n+$/, "");

      cleanedHtml = sanitizeAnchorTags(cleanedHtml).trim();

      if (cleanedHtml) {
        if (!editor) {
          return false;
        }
        const lines = cleanedHtml.split("\n");

        if (lines.length === 1) {
          editor.commands.insertContent(cleanedHtml);
        } else {
          const content = lines
            .map((line, index) => {
              if (index === lines.length - 1) {
                return line;
              }
              return line + "<br>";
            })
            .join("");

          editor.commands.insertContent(content);
        }
        return true;
      }
    }

    if (textData && !htmlData) {
      const urlRegex = /^(https?:\/\/[^\s]+)$/i;
      if (urlRegex.test(textData.trim())) {
        return false;
      }

      const sanitized = textData
        .normalize("NFC")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/[\u2026]/g, "...")
        .replace(/\r\n/g, "\n");

      const urlPattern = /(https?:\/\/[^\s<]+)/gi;

      // Sanitize URL for use as HTML attribute - only allow http/https schemes
      const sanitizeUrl = (url: string): string | null => {
        try {
          const urlObj = new URL(url);
          if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
            return null;
          }
          return urlObj.toString();
        } catch {
          // If URL parsing fails, check if it's a simple http/https URL
          if (/^https?:\/\/[\w\-_.~!$&'()*+,;=:@/?#[\]]+$/i.test(url)) {
            return url;
          }
          return null;
        }
      };

      const escapeHtml = (str: string) =>
        str
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

      const lines = sanitized.split("\n");
      const content = lines
        .map((line, index) => {
          const linkedLine = line.replace(urlPattern, (url) => {
            const safeHref = sanitizeUrl(url);
            if (!safeHref) {
              // Not a safe URL, return escaped text only
              return escapeHtml(url);
            }
            const displayUrl = escapeHtml(url);
            return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer nofollow">${displayUrl}</a>`;
          });
          if (index === lines.length - 1) {
            return linkedLine;
          }
          return linkedLine + "<br>";
        })
        .join("");

      if (!editor) {
        return false;
      }
      editor.commands.insertContent(content);
      return true;
    }

    return false;
  };
}
