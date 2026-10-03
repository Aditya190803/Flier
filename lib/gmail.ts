import { encodeQuotedPrintable, encodeSubject, validateAndSanitizeEmail } from "./email/encoding";
import { buildGmailMimeBody } from "./email/mime-builder";
import { injectTracking, sanitizeHTML } from "./email-formatting";
import { emailLogger } from "./logger";

import type { AttachmentData } from "./email/attachment-manager";
export { clearAttachmentCache, preResolveAttachments } from "./email/attachment-manager";
export type { AttachmentData } from "./email/attachment-manager";
export { encodeQuotedPrintable } from "./email/encoding";

// Cache for pre-built email templates (for bulk sending)
interface EmailTemplate {
  fromEmail: string;
  subject: string;
  bodyParts: string; // Pre-built MIME body (everything after headers)
  totalSize: number;
}
let cachedEmailTemplate: EmailTemplate | null = null;

/**
 * Pre-build the email template ONCE before bulk sending.
 * This builds the entire MIME body (with attachments) once, so each send only needs to swap the To header.
 * This dramatically speeds up bulk sends with large attachments.
 */
export async function preBuildEmailTemplate(
  fromEmail: string,
  subject: string,
  htmlBody: string,
  attachments?: AttachmentData[],
): Promise<void> {
  if (!fromEmail?.trim()) {
    throw new Error("From email is required");
  }
  emailLogger.info("Pre-building email template for bulk send");

  // Build the MIME body parts (everything that stays constant)
  const sanitizedHtmlBody = sanitizeHTML(htmlBody);
  const zeroMarginCss =
    '<style type="text/css">html,body{margin:0!important;padding:0!important;width:100%!important;}table{border-collapse:collapse!important;border-spacing:0!important;}p{margin:0!important;padding:0!important;}*{margin:0!important;padding:0!important;}</style>';

  const formattedHtmlBody = [
    "<!doctype html>",
    "<html>",
    "<head>",
    zeroMarginCss,
    "</head>",
    '<body style="margin:0;padding:0;width:100%!important;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;border:0;border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%!important;">',
    '<tr><td style="margin:0;padding:0;border:0;">',
    sanitizedHtmlBody,
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");

  // Create plain text version
  const plainText = formattedHtmlBody
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const encodedPlainText = encodeQuotedPrintable(plainText);
  const encodedHtmlBody = encodeQuotedPrintable(formattedHtmlBody);

  const encodedSubject = encodeSubject(subject);

  const bodyString = buildGmailMimeBody({
    encodedPlainText,
    encodedHtmlBody,
    attachments,
  });

  cachedEmailTemplate = {
    fromEmail,
    subject: encodedSubject,
    bodyParts: bodyString,
    totalSize: bodyString.length,
  };

  emailLogger.info(`Email template pre-built`, {
    sizeMB: (cachedEmailTemplate.totalSize / 1024 / 1024).toFixed(2),
  });
}

/**
 * Send email using pre-built template (FAST - only swaps To header)
 * Call preBuildEmailTemplate() once before using this for bulk sends.
 */
export async function sendEmailWithTemplate(
  accessToken: string,
  to: string,
  tracking?: {
    campaignId: string;
    userEmail: string;
  },
  cc?: string[],
  bcc?: string[],
): Promise<any> {
  if (!cachedEmailTemplate) {
    throw new Error("No email template cached. Call preBuildEmailTemplate() first.");
  }

  const validatedTo = validateAndSanitizeEmail(to);
  const validatedCc = (cc ?? []).map(validateAndSanitizeEmail);
  const validatedBcc = (bcc ?? []).map(validateAndSanitizeEmail);

  // If tracking is requested for a templated email, we have a problem:
  // The template is pre-built and shared. Tracking needs recipient-specific URLs.
  // For now, we'll log a warning and skip tracking for templated sends,
  // OR we could suggest using personalized sending if tracking is required.
  if (tracking) {
    emailLogger.warn(
      "Tracking requested for templated email. Tracking is currently only supported for personalized sends.",
    );
  }

  // Build complete email with just header changes
  const email = [
    `From: ${cachedEmailTemplate.fromEmail}`,
    `To: ${validatedTo}`,
    ...(validatedCc.length ? [`Cc: ${validatedCc.join(", ")}`] : []),
    ...(validatedBcc.length ? [`Bcc: ${validatedBcc.join(", ")}`] : []),
    `Subject: ${cachedEmailTemplate.subject}`,
    `MIME-Version: 1.0`,
    cachedEmailTemplate.bodyParts,
  ].join("\r\n");

  // Encode for Gmail API
  const encodedEmail = Buffer.from(email, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Calculate timeout based on size
  const totalSize = cachedEmailTemplate.totalSize;
  const BASE_TIMEOUT = 60000;
  const TIMEOUT_PER_5MB = 60000;
  const MAX_TIMEOUT = 600000;
  const SEND_TIMEOUT = Math.min(
    BASE_TIMEOUT + Math.ceil(totalSize / (5 * 1024 * 1024)) * TIMEOUT_PER_5MB,
    MAX_TIMEOUT,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT);

  try {
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedEmail }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gmail API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    emailLogger.info(`Email sent`, { to: validatedTo, messageId: result.id });
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Timeout after ${SEND_TIMEOUT / 1000}s. Email may have been sent - check Gmail Sent folder.`,
      );
    }
    throw error;
  }
}

export async function sendEmailViaAPI(
  accessToken: string,
  fromEmail: string,
  to: string,
  subject: string,
  htmlBody: string,
  attachments?: AttachmentData[],
  tracking?: {
    campaignId: string;
    userEmail: string;
    enabled?: boolean;
  },
  isTransactional?: boolean,
  cc?: string[],
  bcc?: string[],
) {
  if (!fromEmail?.trim()) {
    throw new Error("From email is required");
  }

  // Validate and sanitize the recipient email
  const validatedTo = validateAndSanitizeEmail(to);
  const validatedCc = (cc ?? []).map(validateAndSanitizeEmail);
  const validatedBcc = (bcc ?? []).map(validateAndSanitizeEmail);

  // Check total attachment size - Gmail has a 25MB limit
  const GMAIL_ATTACHMENT_LIMIT = 25 * 1024 * 1024; // 25MB
  let totalAttachmentBytes = 0;
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.data && att.data !== "appwrite") {
        // base64 decodes to ~75% of its string length
        totalAttachmentBytes += Math.ceil(att.data.length * 0.75);
      }
    }

    if (totalAttachmentBytes > GMAIL_ATTACHMENT_LIMIT) {
      const sizeMB = (totalAttachmentBytes / 1024 / 1024).toFixed(2);
      throw new Error(
        `Total attachment size (${sizeMB}MB) exceeds Gmail's 25MB limit. Please use smaller attachments or share files via Google Drive.`,
      );
    }
  }

  emailLogger.debug("Sending email", {
    to: validatedTo,
    ccCount: validatedCc.length,
    bccCount: validatedBcc.length,
    subject,
    subjectLength: subject.length,
    hasSpecialChars: /[^\x00-\x7F]/.test(subject),
    bodyLength: htmlBody.length,
    attachmentCount: attachments ? attachments.length : 0,
  });

  // Timeout configuration - scale based on attachment size
  // Base timeout + extra time for large attachments
  const totalAttachmentSize =
    attachments?.reduce((sum, a) => {
      // Estimate size from base64 (base64 is ~1.37x the original size)
      const estimatedSize = a.data ? a.data.length * 0.75 : 0;
      return sum + estimatedSize;
    }, 0) || 0;

  // For sending: 60s base + 60s per 5MB of attachments, max 10 minutes
  // Gmail can be very slow to respond for large attachments even after successful upload
  const BASE_TIMEOUT = 60000; // 1 minute base
  const TIMEOUT_PER_5MB = 60000; // 1 minute per 5MB
  const MAX_TIMEOUT = 600000; // 10 minutes max
  const calculatedTimeout =
    BASE_TIMEOUT + Math.ceil(totalAttachmentSize / (5 * 1024 * 1024)) * TIMEOUT_PER_5MB;
  const SEND_TIMEOUT = Math.min(calculatedTimeout, MAX_TIMEOUT);

  emailLogger.debug(`Send timeout set`, {
    timeoutSec: SEND_TIMEOUT / 1000,
    attachmentSizeMB: (totalAttachmentSize / 1024 / 1024).toFixed(2),
  });

  // Helper function to create a request with timeout
  const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    customTimeout: number,
    isSendRequest: boolean = false,
  ) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), customTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        if (isSendRequest && totalAttachmentSize > 5 * 1024 * 1024) {
          // For large attachments, Gmail may have processed it even if we timeout
          throw new Error(
            `Request timeout after ${customTimeout / 1000}s. WARNING: The email may have been sent - please check your Gmail Sent folder before retrying.`,
          );
        }
        throw new Error(
          `Request timeout after ${customTimeout / 1000}s. Try reducing attachment size.`,
        );
      }
      throw error;
    }
  };

  // Properly encode the subject line to handle UTF-8 characters
  const encodedSubject = encodeSubject(subject);

  // Sanitize and preserve authoring-time formatting
  const sanitizedHtmlBody = sanitizeHTML(htmlBody);

  // Inject tracking if enabled
  let processedHtmlBody = sanitizedHtmlBody;
  if (tracking) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    processedHtmlBody = injectTracking(
      sanitizedHtmlBody,
      {
        campaignId: tracking.campaignId,
        recipientEmail: validatedTo,
        userEmail: tracking.userEmail,
        isTransactional: isTransactional,
        trackingEnabled: tracking.enabled !== false,
      },
      baseUrl,
    );
  }

  const zeroMarginCss =
    '<style type="text/css">html,body{margin:0!important;padding:0!important;width:100%!important;}table{border-collapse:collapse!important;border-spacing:0!important;}p{margin:0!important;padding:0!important;}*{margin:0!important;padding:0!important;}</style>';

  // Check if the body is already a full HTML document
  const hasHtmlTag = /<html/i.test(processedHtmlBody);
  const hasBodyTag = /<body/i.test(processedHtmlBody);

  let formattedHtmlBody: string;

  if (hasHtmlTag || hasBodyTag) {
    // If it's already a full document, just ensure the CSS is there
    if (processedHtmlBody.includes("</head>")) {
      formattedHtmlBody = processedHtmlBody.replace("</head>", `${zeroMarginCss}</head>`);
    } else {
      formattedHtmlBody = `${zeroMarginCss}${processedHtmlBody}`;
    }
  } else {
    // Wrap simple content in a full HTML structure with a layout table for better compatibility
    formattedHtmlBody = [
      "<!doctype html>",
      "<html>",
      "<head>",
      zeroMarginCss,
      "</head>",
      '<body style="margin:0;padding:0;">',
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:0;border:0;border-collapse:collapse;border-spacing:0;mso-table-lspace:0pt;mso-table-rspace:0pt;width:100%;">',
      '<tr><td style="margin:0;padding:0;border:0;">',
      processedHtmlBody,
      "</td></tr>",
      "</table>",
      "</body>",
      "</html>",
    ].join("\n");
  }

  // Create plain text version by stripping HTML
  const plainText = formattedHtmlBody
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const encodedPlainText = encodeQuotedPrintable(plainText);
  const encodedHtmlBody = encodeQuotedPrintable(formattedHtmlBody);

  const mimeBody = buildGmailMimeBody({
    encodedPlainText,
    encodedHtmlBody,
    attachments,
  });

  const email = [
    `From: ${fromEmail}`,
    `To: ${validatedTo}`,
    ...(validatedCc.length ? [`Cc: ${validatedCc.join(", ")}`] : []),
    ...(validatedBcc.length ? [`Bcc: ${validatedBcc.join(", ")}`] : []),
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    mimeBody,
  ];

  // Explicitly encode as UTF-8 to handle international characters properly
  const encodedEmail = Buffer.from(email.join("\r\n"), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  emailLogger.debug(`Sending email to Gmail API`, {
    timeoutSec: SEND_TIMEOUT / 1000,
  });

  const response = await fetchWithTimeout(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    },
    SEND_TIMEOUT,
    true,
  ); // Use send timeout, mark as send request

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetails = errorText;

    try {
      const errorJson = JSON.parse(errorText);
      errorDetails = errorJson.error?.message || errorText;

      // Provide specific error messages for common issues
      if (errorDetails.includes("Invalid To header")) {
        throw new Error(`Invalid email address: ${validatedTo}. Please check the email format.`);
      } else if (errorDetails.includes("rateLimitExceeded")) {
        throw new Error(`Gmail rate limit exceeded. Please wait before sending more emails.`);
      } else if (errorDetails.includes("quotaExceeded")) {
        throw new Error(`Gmail quota exceeded. Daily sending limit reached.`);
      }
    } catch (_parseError) {
      // If we can't parse the error, use the raw text
    }

    emailLogger.error(`Gmail API error for ${validatedTo}`, {
      status: response.status,
      statusText: response.statusText,
      error: errorDetails,
      originalTo: to,
    });
    throw new Error(`Gmail API error (${response.status}): ${errorDetails}`);
  }

  const result = await response.json();
  emailLogger.info(`Email sent successfully`, {
    to: validatedTo,
    messageId: result.id,
  });
  return result;
}

export { replacePlaceholders } from "./email/placeholders";
