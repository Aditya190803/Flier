/**
 * Email Service
 *
 * A centralized service class for handling all email-related operations.
 * This extracts email sending logic from API routes and components into
 * a single, testable, and reusable service.
 *
 * @module services/email-service
 * @see {@link /docs/ADR/002-email-service-extraction.md} for architecture decision
 */

import { generateRecipientId } from "@/lib/analytics";
import { databases, config, ID } from "@/lib/appwrite-server";
import { fetchFileFromUrl } from "@/lib/attachment-fetcher";
import {
  sendEmailViaAPI,
  replacePlaceholders,
  preResolveAttachments,
  clearAttachmentCache,
  preBuildEmailTemplate,
  sendEmailWithTemplate,
  type AttachmentData,
} from "@/lib/gmail";
import { emailLogger } from "@/lib/logger";

import { VerificationService } from "./verification-service";

/**
 * Email recipient with personalization data
 */
export interface EmailRecipient {
  /** Email address of the recipient */
  email: string;
  /** Name of the recipient for personalization */
  name?: string;
  /** Additional custom fields for personalization */
  customFields?: Record<string, string>;
  /** Optional personalized attachment for this specific recipient */
  personalizedAttachment?: {
    url: string;
    fileName?: string;
  };
}

/**
 * Email content configuration
 */
export interface EmailContent {
  /** Email subject line (supports {{placeholders}}) */
  subject: string;
  /** HTML body of the email (supports {{placeholders}}) */
  body: string;
  /** Optional email signature to append */
  signature?: string;
  /** Optional CC addresses */
  cc?: string[];
  /** Optional BCC addresses */
  bcc?: string[];
}

/**
 * Email sending options
 */
export interface SendOptions {
  /** Array of file attachments */
  attachments?: AttachmentData[];
  /** Delay between emails in milliseconds (default: 1000) */
  delayBetweenEmails?: number;
  /** Whether to use bulk optimization for identical content */
  useBulkOptimization?: boolean;
  /** Tracking configuration */
  tracking?: {
    enabled: boolean;
    campaignId?: string;
    userEmail: string;
  };
  /** Optional callback to check if a recipient is unsubscribed */
  checkUnsubscribe?: (email: string) => Promise<boolean>;
  /** Whether to verify email addresses before sending */
  verifyBeforeSending?: boolean;
  /** Callback for progress updates */
  onProgress?: (sent: number, total: number, currentEmail: string) => void;
  /** Callback for individual email results */
  onEmailResult?: (email: string, success: boolean, error?: string) => void;
  /**
   * Absolute timestamp (`Date.now()`-based) after which no further email
   * should be *started*. Used for time-budgeted chunked sending so a caller
   * (e.g. a serverless function with a maxDuration limit) can stop before
   * being killed and resume in a later call. When omitted, the whole list
   * is processed with no time limit (existing behavior).
   */
  deadline?: number;
}

/**
 * Result of a single email send operation
 */
export interface EmailResult {
  email: string;
  status: "success" | "error" | "skipped";
  error?: string;
  messageId?: string;
}

/**
 * Summary of a campaign send operation
 */
export interface CampaignSummary {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: EmailResult[];
  /**
   * False when a `deadline` (see {@link SendOptions.deadline}) cut the run
   * short before every recipient was processed. Omitted/true means the
   * whole list passed in was processed. Callers doing chunked sends should
   * treat `done === false` as "call again to continue", filtering out
   * recipients already present in `results` on the retry.
   */
  done?: boolean;
}

/**
 * Personalized email ready for sending
 */
export interface PersonalizedEmail {
  to: string;
  subject: string;
  message: string;
  originalRowData: Record<string, string>;
  attachments?: AttachmentData[];
  personalizedAttachment?: {
    url: string;
    fileName?: string;
  };
  cc?: string[];
  bcc?: string[];
}

/**
 * EmailService - Centralized email operations handler
 *
 * This service encapsulates all email sending logic including:
 * - Single email sending
 * - Bulk email campaigns
 * - Personalization with placeholders
 * - Attachment handling
 * - Rate limiting and retry logic
 *
 * @example
 * ```typescript
 * const emailService = new EmailService(accessToken, session.user.email);
 *
 * // Send a single email
 * await emailService.sendSingle({
 *   email: 'user@example.com',
 *   name: 'John'
 * }, {
 *   subject: 'Hello {{name}}!',
 *   body: '<p>Welcome, {{name}}!</p>'
 * });
 *
 * // Send bulk campaign
 * const results = await emailService.sendCampaign(recipients, content, {
 *   onProgress: (sent, total) => console.log(`${sent}/${total} sent`)
 * });
 * ```
 */
export class EmailService {
  private accessToken: string;
  private fromEmail: string;
  private defaultDelayMs: number = 1000;

  /**
   * Create a new EmailService instance
   * @param accessToken - Gmail API OAuth access token
   * @param fromEmail - Sender address (session.user.email)
   */
  constructor(accessToken: string, fromEmail: string) {
    if (!accessToken) {
      throw new Error("Access token is required for EmailService");
    }
    if (!fromEmail?.trim()) {
      throw new Error("From email is required for EmailService");
    }
    this.accessToken = accessToken;
    this.fromEmail = fromEmail;
  }

  /**
   * Update the access token (e.g., after refresh)
   * @param newToken - New OAuth access token
   */
  updateAccessToken(newToken: string): void {
    this.accessToken = newToken;
  }

  /**
   * Verify a list of recipients
   * @param recipients - Array of recipients to verify
   * @returns Object with valid and invalid recipients
   */
  async verifyRecipients(recipients: EmailRecipient[]): Promise<{
    valid: EmailRecipient[];
    invalid: { recipient: EmailRecipient; reason: string }[];
  }> {
    const valid: EmailRecipient[] = [];
    const invalid: { recipient: EmailRecipient; reason: string }[] = [];

    const emails = recipients.map((r) => r.email);
    const verificationResults = await VerificationService.verifyBatch(emails);

    for (const recipient of recipients) {
      const result = verificationResults.get(recipient.email);
      if (result?.isValid) {
        valid.push(recipient);
      } else {
        invalid.push({
          recipient,
          reason: result?.reason || "Unknown verification error",
        });
      }
    }

    return { valid, invalid };
  }

  /**
   * Send a single email with personalization
   *
   * @param recipient - Email recipient with optional personalization data
   * @param content - Email content (subject, body, signature)
   * @param attachments - Optional file attachments
   * @returns Result of the send operation
   */
  async sendSingle(
    recipient: EmailRecipient,
    content: EmailContent,
    attachments?: AttachmentData[],
    tracking?: {
      campaignId: string;
      userEmail: string;
      enabled?: boolean;
    },
    isTransactional?: boolean,
  ): Promise<EmailResult> {
    try {
      // Build personalization data from recipient
      const personalizationData: Record<string, string> = {
        email: recipient.email,
        name: recipient.name || "",
        ...recipient.customFields,
      };

      // Apply personalization to subject and body
      const personalizedSubject = replacePlaceholders(
        content.subject,
        personalizationData,
      );
      let personalizedBody = replacePlaceholders(
        content.body,
        personalizationData,
      );

      // Append signature if provided
      if (content.signature) {
        personalizedBody = `${personalizedBody}<br/><br/>${content.signature}`;
      }

      // Pre-resolve attachments if needed
      const resolvedAttachments = attachments
        ? await preResolveAttachments(attachments)
        : [];

      // Handle personalized attachment if present
      if (recipient.personalizedAttachment) {
        try {
          const fileData = await fetchFileFromUrl(
            recipient.personalizedAttachment.url,
          );
          resolvedAttachments.push({
            name: recipient.personalizedAttachment.fileName || "attachment",
            data: fileData.base64,
            type: fileData.mimeType,
          });
        } catch (error) {
          emailLogger.error("Failed to fetch personalized attachment", {
            url: recipient.personalizedAttachment.url,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue sending without the personalized attachment
        }
      }

      // Send the email
      const result = await sendEmailViaAPI(
        this.accessToken,
        this.fromEmail,
        recipient.email,
        personalizedSubject,
        personalizedBody,
        resolvedAttachments,
        tracking,
        isTransactional,
        content.cc,
        content.bcc,
      );

      // Record "sent" event
      await this.recordEvent("sent", recipient.email, tracking);

      emailLogger.info("Single email sent successfully", {
        to: recipient.email,
        messageId: result.id,
      });

      return {
        email: recipient.email,
        status: "success",
        messageId: result.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Record "failed" event
      await this.recordEvent("failed", recipient.email, tracking, errorMessage);

      emailLogger.error(
        "Failed to send single email",
        undefined,
        error instanceof Error ? error : undefined,
      );

      return {
        email: recipient.email,
        status: "error",
        error: errorMessage,
      };
    }
  }

  /**
   * Send a bulk email campaign with optimization
   *
   * For campaigns with identical content (no personalization), uses template
   * caching for significantly faster sending. For personalized content,
   * processes each email individually with placeholder replacement.
   *
   * @param recipients - Array of email recipients
   * @param content - Email content configuration
   * @param options - Sending options (attachments, callbacks, etc.)
   * @returns Campaign summary with all results
   */
  async sendCampaign(
    recipients: EmailRecipient[],
    content: EmailContent,
    options: SendOptions = {},
  ): Promise<CampaignSummary> {
    const {
      attachments = [],
      delayBetweenEmails = this.defaultDelayMs,
      useBulkOptimization = true,
      tracking,
      checkUnsubscribe,
      verifyBeforeSending = false,
      onProgress,
      onEmailResult,
    } = options;

    let activeRecipients = [...recipients];
    const results: EmailResult[] = [];

    // Verify recipients if requested
    if (verifyBeforeSending) {
      const { valid, invalid } = await this.verifyRecipients(recipients);
      activeRecipients = valid;

      // Add invalid recipients to results
      for (const item of invalid) {
        results.push({
          email: item.recipient.email,
          status: "skipped",
          error: `Verification failed: ${item.reason}`,
        });
        onEmailResult?.(
          item.recipient.email,
          false,
          `Verification failed: ${item.reason}`,
        );
      }

      emailLogger.info("Verification completed", {
        total: recipients.length,
        valid: valid.length,
        invalid: invalid.length,
      });
    }

    const total = recipients.length;

    emailLogger.info("Starting email campaign", {
      recipientCount: activeRecipients.length,
      hasAttachments: attachments.length > 0,
      useBulkOptimization,
    });

    try {
      // Pre-resolve attachments once for all emails
      const resolvedAttachments =
        attachments.length > 0 ? await preResolveAttachments(attachments) : [];

      // Check if we can use bulk optimization
      // (all emails have same subject/body with no placeholders)
      // ALSO if tracking is enabled, we can't use bulk optimization because each email needs a unique pixel/links
      // AND if we need to check unsubscribes per-recipient, we can't use bulk optimization
      const hasPlaceholders =
        content.subject.includes("{{") || content.body.includes("{{");

      const canUseBulkOptimization =
        useBulkOptimization &&
        !hasPlaceholders &&
        !tracking?.enabled &&
        !checkUnsubscribe;

      if (canUseBulkOptimization) {
        // Use template-based bulk sending for maximum efficiency
        await this.sendBulkWithTemplate(
          activeRecipients,
          content,
          resolvedAttachments,
          delayBetweenEmails,
          results,
          tracking,
          onProgress,
          onEmailResult,
        );
      } else {
        // Use individual sending for personalized content
        await this.sendBulkPersonalized(
          activeRecipients,
          content,
          resolvedAttachments,
          delayBetweenEmails,
          results,
          tracking,
          checkUnsubscribe,
          onProgress,
          onEmailResult,
        );
      }
    } finally {
      // Always clear cache after campaign
      clearAttachmentCache();
    }

    // Calculate summary
    const summary: CampaignSummary = {
      total,
      sent: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      results,
    };

    emailLogger.info("Campaign completed", {
      total: summary.total,
      sent: summary.sent,
      failed: summary.failed,
      skipped: summary.skipped,
    });

    return summary;
  }

  /**
   * Send a batch of pre-personalized emails
   *
   * @param emails - Array of personalized emails
   * @param options - Sending options
   * @returns Campaign summary
   */
  async sendPersonalizedBatch(
    emails: PersonalizedEmail[],
    options: SendOptions = {},
  ): Promise<CampaignSummary> {
    const {
      delayBetweenEmails = this.defaultDelayMs,
      tracking,
      checkUnsubscribe,
      verifyBeforeSending = false,
      onProgress,
      onEmailResult,
      deadline,
    } = options;

    let activeEmails = [...emails];
    const results: EmailResult[] = [];
    let timedOut = false;

    // Verify recipients if requested
    if (verifyBeforeSending) {
      const recipientsToVerify = emails.map((e) => ({ email: e.to }));
      const { invalid } = await this.verifyRecipients(recipientsToVerify);

      const invalidEmails = new Set(invalid.map((i) => i.recipient.email));
      activeEmails = emails.filter((e) => !invalidEmails.has(e.to));

      // Add invalid recipients to results
      for (const item of invalid) {
        results.push({
          email: item.recipient.email,
          status: "skipped",
          error: `Verification failed: ${item.reason}`,
        });
        onEmailResult?.(
          item.recipient.email,
          false,
          `Verification failed: ${item.reason}`,
        );
      }

      emailLogger.info("Verification completed", {
        total: emails.length,
        valid: activeEmails.length,
        invalid: invalid.length,
      });
    }

    const total = emails.length;

    emailLogger.info("Starting personalized email batch", {
      count: activeEmails.length,
    });

    try {
      for (let i = 0; i < activeEmails.length; i++) {
        // Stop starting new sends once the time budget is used up. The
        // caller (e.g. a time-boxed serverless function) is expected to
        // invoke this again with the remaining recipients.
        if (deadline !== undefined && Date.now() >= deadline) {
          timedOut = true;
          emailLogger.info("Personalized batch time budget exceeded", {
            processed: i,
            remaining: activeEmails.length - i,
          });
          break;
        }

        const email = activeEmails[i];

        // Check for unsubscribe if callback provided
        if (checkUnsubscribe) {
          const isUnsubscribed = await checkUnsubscribe(email.to);
          if (isUnsubscribed) {
            results.push({
              email: email.to,
              status: "skipped",
              error: "Recipient has unsubscribed",
            });
            onEmailResult?.(email.to, false, "Recipient has unsubscribed");
            onProgress?.(i + 1, total, email.to);
            continue;
          }
        }

        // Pre-resolve attachments for this specific email if any
        const resolvedAttachments = email.attachments
          ? await preResolveAttachments(email.attachments)
          : [];

        // Handle personalized attachment if present
        if (email.personalizedAttachment) {
          try {
            const fileData = await fetchFileFromUrl(
              email.personalizedAttachment.url,
            );
            resolvedAttachments.push({
              name: email.personalizedAttachment.fileName || "attachment",
              data: fileData.base64,
              type: fileData.mimeType,
            });
          } catch (error) {
            emailLogger.error("Failed to fetch personalized attachment", {
              url: email.personalizedAttachment.url,
              error: error instanceof Error ? error.message : String(error),
            });
            // Continue sending without the personalized attachment
          }
        }

        // Personalize. `sendSingle` does this via `customFields`; this batch
        // path used to skip it entirely, so every recipient on the chunked
        // `/api/send-email` route received literal `{{name}}` text.
        const personalizationData: Record<string, string> = {
          email: email.to,
          ...email.originalRowData,
        };
        const personalizedSubject = replacePlaceholders(
          email.subject,
          personalizationData,
        );
        const personalizedMessage = replacePlaceholders(
          email.message,
          personalizationData,
        );

        // Send the email
        try {
          const result = await sendEmailViaAPI(
            this.accessToken,
            this.fromEmail,
            email.to,
            personalizedSubject,
            personalizedMessage,
            resolvedAttachments,
            tracking?.enabled
              ? {
                  campaignId: tracking.campaignId || "bulk-send-" + Date.now(),
                  userEmail: tracking.userEmail,
                }
              : undefined,
            undefined,
            email.cc,
            email.bcc,
          );

          const emailResult: EmailResult = {
            email: email.to,
            status: "success",
            messageId: result.id,
          };
          results.push(emailResult);

          // Record "sent" event
          if (tracking?.enabled) {
            await this.recordEvent("sent", email.to, {
              campaignId: tracking.campaignId || "bulk-send-" + Date.now(),
              userEmail: tracking.userEmail,
            });
          }

          onEmailResult?.(email.to, true);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          results.push({
            email: email.to,
            status: "error",
            error: errorMessage,
          });

          // Record "failed" event
          if (tracking?.enabled) {
            await this.recordEvent(
              "failed",
              email.to,
              {
                campaignId: tracking.campaignId || "bulk-send-" + Date.now(),
                userEmail: tracking.userEmail,
              },
              errorMessage,
            );
          }

          onEmailResult?.(email.to, false, errorMessage);
        }
        onProgress?.(i + 1, total, email.to);

        // Delay between emails (except last)
        if (i < activeEmails.length - 1) {
          await this.delay(delayBetweenEmails);
        }
      }
    } finally {
      clearAttachmentCache();
    }

    return {
      total,
      sent: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      results,
      done: !timedOut,
    };
  }

  /**
   * Internal: Send bulk emails using pre-built template (fastest)
   */
  private async sendBulkWithTemplate(
    recipients: EmailRecipient[],
    content: EmailContent,
    attachments: AttachmentData[],
    delayMs: number,
    results: EmailResult[],
    tracking?: {
      enabled: boolean;
      campaignId?: string;
      userEmail: string;
    },
    onProgress?: (sent: number, total: number, email: string) => void,
    onEmailResult?: (email: string, success: boolean, error?: string) => void,
  ): Promise<void> {
    // Build body with signature
    let body = content.body;
    if (content.signature) {
      body = `${body}<br/><br/>${content.signature}`;
    }

    // Pre-build template once
    await preBuildEmailTemplate(
      this.fromEmail,
      content.subject,
      body,
      attachments,
    );

    // Send to each recipient
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      try {
        await sendEmailWithTemplate(
          this.accessToken,
          recipient.email,
          undefined,
          content.cc,
          content.bcc,
        );

        results.push({
          email: recipient.email,
          status: "success",
        });

        // Record "sent" event
        if (tracking?.enabled) {
          await this.recordEvent("sent", recipient.email, {
            campaignId: tracking.campaignId || "bulk-send-" + Date.now(),
            userEmail: tracking.userEmail,
          });
        }

        onEmailResult?.(recipient.email, true);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push({
          email: recipient.email,
          status: "error",
          error: errorMessage,
        });

        // Record "failed" event
        if (tracking?.enabled) {
          await this.recordEvent(
            "failed",
            recipient.email,
            {
              campaignId: tracking.campaignId || "bulk-send-" + Date.now(),
              userEmail: tracking.userEmail,
            },
            errorMessage,
          );
        }

        onEmailResult?.(recipient.email, false, errorMessage);
      }

      onProgress?.(i + 1, recipients.length, recipient.email);

      // Delay between emails (except last)
      if (i < recipients.length - 1) {
        await this.delay(delayMs);
      }
    }
  }

  /**
   * Internal: Send bulk emails with personalization (slower but customized)
   */
  private async sendBulkPersonalized(
    recipients: EmailRecipient[],
    content: EmailContent,
    attachments: AttachmentData[],
    delayMs: number,
    results: EmailResult[],
    tracking?: {
      enabled: boolean;
      campaignId?: string;
      userEmail: string;
    },
    checkUnsubscribe?: (email: string) => Promise<boolean>,
    onProgress?: (sent: number, total: number, email: string) => void,
    onEmailResult?: (email: string, success: boolean, error?: string) => void,
  ): Promise<void> {
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];

      // Check for unsubscribe if callback provided
      if (checkUnsubscribe) {
        const isUnsubscribed = await checkUnsubscribe(recipient.email);
        if (isUnsubscribed) {
          results.push({
            email: recipient.email,
            status: "skipped",
            error: "Recipient has unsubscribed",
          });
          onEmailResult?.(recipient.email, false, "Recipient has unsubscribed");
          onProgress?.(i + 1, recipients.length, recipient.email);
          continue;
        }
      }

      const result = await this.sendSingle(
        recipient,
        content,
        attachments,
        tracking?.enabled
          ? {
              campaignId: tracking.campaignId || "bulk-send-" + Date.now(),
              userEmail: tracking.userEmail,
            }
          : undefined,
      );
      results.push(result);

      onEmailResult?.(
        recipient.email,
        result.status === "success",
        result.error,
      );
      onProgress?.(i + 1, recipients.length, recipient.email);

      // Delay between emails (except last)
      if (i < recipients.length - 1) {
        await this.delay(delayMs);
      }
    }
  }

  /**
   * Validate an email address format
   * @param email - Email address to validate
   * @returns True if valid, false otherwise
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim().toLowerCase());
  }

  /**
   * Filter out invalid email addresses from a list
   * @param emails - Array of email addresses
   * @returns Object with valid and invalid emails
   */
  static filterValidEmails(emails: string[]): {
    valid: string[];
    invalid: string[];
  } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const email of emails) {
      if (EmailService.validateEmail(email)) {
        valid.push(email.trim().toLowerCase());
      } else {
        invalid.push(email);
      }
    }

    return { valid, invalid };
  }

  /**
   * Record a tracking event to Appwrite
   */
  private async recordEvent(
    eventType: "sent" | "failed",
    email: string,
    tracking?: { campaignId: string; userEmail: string },
    error?: string,
  ) {
    if (!tracking) {
      return;
    }
    try {
      await databases.createDocument(
        config.databaseId,
        config.trackingEventsCollectionId,
        ID.unique(),
        {
          campaign_id: tracking.campaignId,
          recipient_id: generateRecipientId(email),
          email: email,
          event_type: eventType,
          user_email: tracking.userEmail,
          created_at: new Date().toISOString(),
          metadata: error ? JSON.stringify({ error }) : undefined,
        },
      );
    } catch (err) {
      emailLogger.error(`Failed to record ${eventType} event`, { error: err });
    }
  }

  /**
   * Utility: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create an EmailService instance with the given access token
 * Factory function for convenience
 */
export function createEmailService(
  accessToken: string,
  fromEmail: string,
): EmailService {
  return new EmailService(accessToken, fromEmail);
}

export default EmailService;
