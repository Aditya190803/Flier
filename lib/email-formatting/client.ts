"use client";

import { clientLogger } from "@/lib/client-logger";
import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "@/lib/constants";
import { getCookie } from "@/lib/utils";

/**
 * Client-side Email Formatting
 *
 * Client-safe functions for email preview and basic formatting.
 * This module can be safely imported in React components.
 *
 * For full email formatting (sending), use the server-side functions
 * via the API route or import from the main module in server components.
 */

// Re-export client-safe utilities
export {
  convertEmojisToUnicode,
  validateEmailContent,
  // Legacy aliases
} from "./utils";

export type { ValidationResult } from "./types";

// ============================================================================
// CLIENT-SIDE PREVIEW FUNCTIONS
// ============================================================================

/**
 * Fetches formatted email preview from the server
 *
 * This calls the API endpoint to get properly formatted HTML
 * using server-side formatting capabilities.
 *
 * @param html - Raw HTML content from the editor
 * @returns Formatted HTML from the server
 *
 * @example
 * ```tsx
 * const preview = await getEmailPreview(editorContent);
 * setPreviewHTML(preview);
 * ```
 */
export async function getEmailPreview(html: string): Promise<string> {
  try {
    const csrfToken = getCookie(CSRF_TOKEN_NAME);
    const response = await fetch("/api/format-email-preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
      },
      body: JSON.stringify({ htmlContent: html }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      return result.formattedHTML;
    } else {
      throw new Error(result.error || "Failed to format email");
    }
  } catch (error) {
    clientLogger.error("Failed to fetch email preview", error instanceof Error ? error : undefined);
    // Return basic fallback preview
    return getInstantPreview(html);
  }
}

/**
 * Gets instant local preview without server call
 *
 * This provides immediate feedback while the full server
 * preview is being fetched. Uses client-safe formatting only.
 *
 * @param html - Raw HTML content from the editor
 * @returns Basic preview HTML (not fully formatted)
 *
 * @example
 * ```tsx
 * // Show instant preview while fetching full preview
 * setPreviewHTML(getInstantPreview(content));
 * getEmailPreview(content).then(setPreviewHTML);
 * ```
 */
export function getInstantPreview(html: string): string {
  // Import dynamically to avoid SSR issues
  const { convertEmojisToUnicode } = require("./utils");

  const cleanedHTML = convertEmojisToUnicode(html);

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #666;">Email Preview</h3>
        <div style="background: white; padding: 20px; border-radius: 4px; border: 1px solid #ddd;">
          <div dir="ltr" style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #222222;">
            ${cleanedHTML}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Basic client-side HTML sanitization
 *
 * Removes obviously dangerous content for display purposes.
 * Note: This is NOT sufficient for email sending - use server-side
 * sanitization for that.
 *
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML safe for display
 */
export function sanitizeForDisplay(html: string): string {
  if (!html) {
    return "";
  }

  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s(on\w+)=["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}
