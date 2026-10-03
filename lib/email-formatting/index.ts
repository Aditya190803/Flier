/**
 * Email Formatting Module
 *
 * Main entry point for email formatting functionality.
 * Provides a clean, unified API for formatting HTML content for email.
 *
 * Architecture:
 * - types.ts: TypeScript interfaces and constants
 * - emoji.ts: Emoji image to unicode conversion
 * - sanitization.ts: HTML sanitization and validation
 * - tracking.ts: Open/click/unsubscribe tracking injection
 * - utils.ts: Backward-compatible re-export layer
 * - inline-styles.ts: CSS to inline style transformation
 * - client.ts: Client-safe preview functions
 *
 * Usage:
 * ```typescript
 * import { formatForEmail } from '@/lib/email-formatting';
 *
 * const formattedHTML = formatForEmail(userContent);
 * ```
 */

// Re-export types
export type {
  EmailFormatterOptions,
  FormattingResult,
  ValidationResult,
  ElementStyle,
  StyleMap,
  EmojiMap,
} from "./types";

export { DEFAULT_FORMATTER_OPTIONS, GMAIL_WRAPPER_STYLES, COLORS } from "./types";

// Re-export utilities
export { convertEmojisToUnicode, EMOJI_NAME_MAP } from "./emoji";
export { injectTracking } from "./tracking";
export { sanitizeHTML, validateEmailContent } from "./sanitization";

// Re-export inline styles
export { applyInlineStyles, wrapForGmail, ELEMENT_STYLES } from "./inline-styles";

// Import for internal use
import { convertEmojisToUnicode } from "./emoji";
import { applyInlineStyles, wrapForGmail } from "./inline-styles";
import { sanitizeHTML, validateEmailContent } from "./sanitization";
import {
  DEFAULT_FORMATTER_OPTIONS,
  type EmailFormatterOptions,
  type FormattingResult,
} from "./types";
import { apiLogger } from "../logger";

// ============================================================================
// MAIN FORMATTING FUNCTIONS
// ============================================================================

/**
 * Formats HTML content for email delivery
 *
 * This is the main entry point for email formatting.
 * Applies the full formatting pipeline:
 * 1. Convert emoji images to Unicode text
 * 2. Sanitize HTML (remove scripts, editor classes)
 * 3. Apply inline styles for email compatibility
 * 4. Wrap in Gmail-style container
 *
 * @param html - Raw HTML content from the editor
 * @param options - Optional formatting configuration
 * @returns Formatted HTML ready for email delivery
 *
 * @example
 * ```typescript
 * const formatted = formatForEmail('<p>Hello 👋</p>');
 * // Returns Gmail-compatible HTML with inline styles
 * ```
 */
export function formatForEmail(html: string, options: EmailFormatterOptions = {}): string {
  const opts = { ...DEFAULT_FORMATTER_OPTIONS, ...options };

  try {
    let result = html;

    // Step 1: Convert emoji images to Unicode
    if (opts.convertEmojis) {
      result = convertEmojisToUnicode(result);
    }

    // Step 2: Sanitize HTML
    if (opts.sanitize) {
      result = sanitizeHTML(result);
    }

    // Step 3: Apply inline styles
    if (opts.inlineStyles) {
      result = applyInlineStyles(result);
    }

    // Step 4: Wrap for Gmail
    if (opts.wrapForGmail) {
      result = wrapForGmail(result);
    }

    return result;
  } catch (error) {
    apiLogger.error("Email formatting failed", error instanceof Error ? error : undefined);
    // Fallback: at minimum wrap the content
    return wrapForGmail(html);
  }
}

/**
 * Formats HTML content with full result details
 *
 * Same as formatForEmail but returns additional metadata
 * about the formatting process for debugging.
 *
 * @param html - Raw HTML content from the editor
 * @param options - Optional formatting configuration
 * @returns FormattingResult with HTML and debug info
 */
export function formatForEmailWithDetails(
  html: string,
  options: EmailFormatterOptions = {},
): FormattingResult {
  const opts = { ...DEFAULT_FORMATTER_OPTIONS, ...options };
  const warnings: string[] = [];
  let emojisConverted = 0;

  try {
    let result = html;

    // Step 1: Convert emoji images to Unicode
    if (opts.convertEmojis) {
      const beforeEmoji = result;
      result = convertEmojisToUnicode(result);
      // Count emoji conversions by checking length difference
      const emojiImgMatches = beforeEmoji.match(/<img[^>]*emoji[^>]*>/gi);
      emojisConverted = emojiImgMatches ? emojiImgMatches.length : 0;
    }

    // Step 2: Validate and collect warnings
    const validation = validateEmailContent(result);
    warnings.push(...validation.warnings);

    // Step 3: Sanitize HTML
    if (opts.sanitize) {
      result = sanitizeHTML(result);
    }

    // Step 4: Apply inline styles
    if (opts.inlineStyles) {
      result = applyInlineStyles(result);
    }

    // Step 5: Wrap for Gmail
    if (opts.wrapForGmail) {
      result = wrapForGmail(result);
    }

    return {
      html: result,
      success: true,
      warnings,
      debug: {
        originalLength: html.length,
        formattedLength: result.length,
        emojisConverted,
        stylesInlined: opts.inlineStyles,
      },
    };
  } catch (error) {
    apiLogger.error("Email formatting failed", error instanceof Error ? error : undefined);
    return {
      html: wrapForGmail(html),
      success: false,
      warnings: [`Formatting failed: ${error instanceof Error ? error.message : "Unknown error"}`],
    };
  }
}

/**
 * Generates preview HTML for displaying in the UI
 *
 * Wraps formatted content in a preview container with
 * styling that shows how the email will appear.
 *
 * @param html - HTML content to preview (can be raw or pre-formatted)
 * @param preFormat - Whether to apply email formatting first (default: true)
 * @returns Preview-ready HTML with container styling
 */
export function formatForPreview(html: string, preFormat = true): string {
  const formattedContent = preFormat ? formatForEmail(html) : html;

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #666;">Email Preview</h3>
        <div style="background: white; padding: 20px; border-radius: 4px; border: 1px solid #ddd;">
          ${formattedContent}
        </div>
      </div>
    </div>
  `;
}
