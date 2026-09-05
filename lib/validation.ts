/**
 * Input validation and sanitization utilities
 * Using Zod for schema validation
 */

import { z } from "zod";

import { EMAIL_REGEX } from "./constants";

// ============================================
// Simple Validation Helpers
// ============================================

/**
 * Quick email validation using centralized regex
 * For Zod-based validation, use emailSchema instead
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

// ============================================
// Common Validation Schemas
// ============================================

/**
 * Email address validation
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .min(5, "Email too short")
  .max(254, "Email too long")
  .toLowerCase()
  .trim();

/**
 * Multiple email addresses
 */
export const emailArraySchema = z
  .array(emailSchema)
  .min(1, "At least one email required")
  .max(1000, "Too many recipients (max 1000)");

/**
 * Email subject validation
 */
export const subjectSchema = z
  .string()
  .min(1, "Subject is required")
  .max(998, "Subject too long (max 998 characters)")
  .trim();

/**
 * Email message/content validation
 */
export const messageSchema = z
  .string()
  .min(1, "Message is required")
  .max(1000000, "Message too long"); // ~1MB limit

/**
 * File attachment validation
 */
export const attachmentSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  data: z.string(), // base64 encoded or "appwrite" placeholder
  appwriteUrl: z.union([z.string().url(), z.literal("")]).optional(),
  appwriteFileId: z.string().optional(),
  fileSize: z
    .number()
    .nonnegative()
    .max(25 * 1024 * 1024)
    .optional(), // 25MB max
});

/**
 * Personalized attachment validation
 */
export const personalizedAttachmentSchema = z.object({
  url: z.string().url("Invalid attachment URL"),
  fileName: z.string().max(255).optional(),
});

// ============================================
// API Request Schemas
// ============================================

/**
 * Send single email request
 */
export const sendSingleEmailSchema = z.object({
  to: emailSchema,
  subject: subjectSchema,
  message: messageSchema,
  originalRowData: z.record(z.string(), z.string()).optional(),
  attachments: z.array(attachmentSchema).optional(),
  personalizedAttachment: personalizedAttachmentSchema.optional(),
  cc: z.array(emailSchema).max(50).optional(),
  bcc: z.array(emailSchema).max(50).optional(),
});

/**
 * Send bulk email request
 */
export const sendBulkEmailSchema = z.object({
  emails: z
    .array(
      z.object({
        to: emailSchema,
        subject: subjectSchema,
        message: messageSchema,
        originalRowData: z.record(z.string(), z.string()).optional(),
        attachments: z.array(attachmentSchema).optional(),
      }),
    )
    .min(1)
    .max(1000),
});

/**
 * Send-email API body (personalized batch or A/B recipients)
 */
export const sendEmailRequestSchema = z
  .object({
    campaignId: z.string().max(200).optional(),
    trackingEnabled: z.boolean().optional(),
    isTransactional: z.boolean().optional(),
    abTestId: z.string().max(200).optional(),
    subject: subjectSchema.optional(),
    content: messageSchema.optional(),
    recipients: emailArraySchema.optional(),
    variants: z
      .array(
        z.object({
          subject: subjectSchema.optional(),
          content: messageSchema.optional(),
        }),
      )
      .max(10)
      .optional(),
    // Campaign-level Cc/Bcc, applied to every message that doesn't set its own
    cc: z.array(emailSchema).max(50).optional(),
    bcc: z.array(emailSchema).max(50).optional(),
    personalizedEmails: z
      .array(
        z.object({
          to: emailSchema,
          subject: subjectSchema,
          message: messageSchema,
          originalRowData: z.record(z.string(), z.string()).optional(),
          attachments: z.array(attachmentSchema).optional(),
          cc: z.array(emailSchema).max(50).optional(),
          bcc: z.array(emailSchema).max(50).optional(),
        }),
      )
      .min(1)
      .max(1000)
      .optional(),
  })
  .refine(
    (d) =>
      (d.personalizedEmails && d.personalizedEmails.length > 0) ||
      (d.recipients && d.recipients.length > 0),
    { message: "No emails provided" },
  );

/**
 * Scheduled campaign create/update (POST|PUT /api/scheduled-campaigns)
 *
 * The send time is validated for *shape* here; whether it's far enough in the
 * future is checked in the route, where "now" is unambiguous.
 */
export const isoDatetimeSchema = z
  .string()
  .max(40)
  .datetime({ offset: true, message: "Must be a valid ISO-8601 datetime" });

/** Attachment as stored on a campaign document (already uploaded to Appwrite) */
export const storedAttachmentSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    fileUrl: z.string().url().max(2000).optional(),
    fileSize: z
      .number()
      .nonnegative()
      .max(25 * 1024 * 1024)
      .optional(),
    appwrite_file_id: z.string().max(255).optional(),
  })
  .refine((attachment) => attachment.appwrite_file_id || attachment.fileUrl, {
    message: "Stored attachment requires a file reference",
  });

export const scheduledCampaignSchema = z.object({
  // These limits mirror the Appwrite scheduled_campaigns attributes.
  subject: subjectSchema.max(500, "Subject too long (max 500 characters)"),
  content: messageSchema.max(
    100000,
    "Message too long (max 100000 characters)",
  ),
  recipients: emailArraySchema,
  scheduled_at: isoDatetimeSchema,
  timezone: z.string().max(100).optional(),
  attachments: z.array(storedAttachmentSchema).max(25).optional(),
  csv_data: z.array(z.record(z.string(), z.string())).max(1000).optional(),
  cc: z.array(emailSchema).max(50).optional(),
  bcc: z.array(emailSchema).max(50).optional(),
  tracking_enabled: z.boolean().optional(),
  is_marketing: z.boolean().optional(),
  has_personalized_attachments: z.boolean().optional(),
  personalized_attachment_column: z.string().max(255).optional(),
});

/** Reschedule or cancel a campaign that has not started sending. */
export const updateScheduledCampaignSchema = z.object({
  id: z.string().min(1, "Campaign ID is required"),
  scheduled_at: isoDatetimeSchema.optional(),
  timezone: z.string().max(100).optional(),
  status: z.enum(["scheduled", "cancelled"]).optional(),
});

/**
 * Contact creation/update
 */
export const contactSchema = z.object({
  email: emailSchema,
  name: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  customFields: z.record(z.string(), z.string().max(1000)).optional(),
});

/**
 * Template creation/update
 */
export const templateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: subjectSchema,
  content: messageSchema,
  category: z.string().max(100).optional(),
  variables: z.array(z.string().max(50)).optional(),
});

/**
 * Unsubscribe request
 */
export const unsubscribeSchema = z.object({
  email: emailSchema,
  campaignId: z.string().optional(),
  reason: z.string().max(500).optional(),
});

/**
 * Tracking event
 */
export const trackingEventSchema = z.object({
  type: z.enum(["open", "click", "bounce", "complaint"]),
  campaignId: z.string(),
  email: emailSchema.optional(),
  url: z.string().url().optional(),
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Team roles (excludes "owner", which cannot be assigned directly)
 */
export const teamMemberRoleSchema = z.enum(["admin", "member", "viewer"]);

/**
 * Create team request (POST /api/teams)
 */
export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(200).trim(),
  description: z.string().max(2000).trim().optional(),
});

/**
 * Update team request (PUT /api/teams)
 */
export const updateTeamSchema = z.object({
  id: z.string().min(1, "Team ID is required"),
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  settings: z
    .object({
      allow_member_invite: z.boolean().optional(),
      require_approval: z.boolean().optional(),
      shared_templates: z.boolean().optional(),
      shared_contacts: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Invite team member request (POST /api/teams/members)
 */
export const inviteTeamMemberSchema = z.object({
  team_id: z.string().min(1, "Team ID is required"),
  email: emailSchema,
  role: teamMemberRoleSchema.optional().default("member"),
});

/**
 * Update team member request (PUT /api/teams/members)
 */
export const updateTeamMemberSchema = z.object({
  member_id: z.string().min(1, "Member ID is required"),
  role: teamMemberRoleSchema.optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

/**
 * Export report query params (GET /api/export-report)
 */
export const exportReportQuerySchema = z.object({
  format: z.enum(["csv", "json"]).optional().default("csv"),
  campaign: z.string().min(1).optional(),
});

// ============================================
// Sanitization Helpers
// ============================================

/**
 * Sanitize HTML content to prevent XSS
 * Removes script tags, event handlers, and dangerous attributes
 */
export function sanitizeHTML(html: string): string {
  if (!html) {
    return "";
  }

  return (
    html
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove event handlers
      .replace(/\s(on\w+)=["'][^"']*["']/gi, "")
      // Remove javascript: URLs
      .replace(/javascript:[^"\s>]*/gi, "")
      // Remove data: URLs in src (potential XSS)
      .replace(/src\s*=\s*["']data:[^"']*["']/gi, "")
      // Remove expression() CSS
      .replace(/expression\s*\([^)]*\)/gi, "")
      // Remove vbscript
      .replace(/vbscript:[^"\s>]*/gi, "")
  );
}

/**
 * Sanitize plain text input
 */
export function sanitizeText(text: string): string {
  if (!text) {
    return "";
  }

  return (
    text
      .trim()
      // Remove null bytes
      .replace(/\0/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
  );
}

/**
 * Validate and parse JSON safely
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  // Zod v4 uses `issues` on ZodError instead of `errors`.
  errors?: z.ZodIssue[];
  message?: string;
}

/**
 * Validate data against a Zod schema
 */
export function validate<T>(
  schema: z.ZodType<T>,
  data: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    // In Zod v4 the error issues are on result.error.issues
    errors: result.error.issues,
    message: result.error.issues.map((e) => e.message).join(", "),
  };
}

/**
 * Create validation error response
 */
export function validationErrorResponse(
  result: ValidationResult<unknown>,
): Response {
  return new Response(
    JSON.stringify({
      error: "Validation Error",
      message: result.message,
      details: result.errors,
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    },
  );
}
