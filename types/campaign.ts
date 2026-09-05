/**
 * Type definitions for email campaigns and sending
 */

import type { PersonalizedAttachment, CSVRow } from "./email";
// Re-export AttachmentData for convenience
export type { AttachmentData } from "./email";
import type { AttachmentData } from "./email";

/**
 * Result of sending a single email
 */
export interface EmailResult {
  email: string;
  status: "success" | "error" | "skipped" | "cancelled";
  error?: string;
  retryCount?: number;
  index?: number;
}

/**
 * Status of an individual email in a campaign
 */
export interface SendStatus {
  email: string;
  status:
    "pending" | "success" | "error" | "skipped" | "retrying" | "cancelled";
  error?: string;
  retryCount?: number;
  index: number;
}

/**
 * Campaign progress information
 */
export interface EmailProgress {
  currentEmail: number;
  totalEmails: number;
  percentage: number;
  status: string;
}

/**
 * Gmail quota tracking information
 */
export interface QuotaInfo {
  dailyLimit: number;
  estimatedUsed: number;
  estimatedRemaining: number;
  lastUpdated: Date | null;
}

/**
 * Campaign state for persistence and resume
 */
export interface CampaignState {
  campaignId: string;
  emails: PersonalizedEmailData[];
  sentIndices: number[];
  failedIndices: number[];
  status: "in-progress" | "paused" | "completed" | "cancelled";
  startedAt: string;
  subject?: string;
  isTransactional?: boolean;
}

/**
 * Personalized email data for sending
 */
export interface PersonalizedEmailData {
  to: string;
  subject: string;
  message: string;
  originalRowData: CSVRow;
  attachments?: AttachmentData[];
  personalizedAttachment?: PersonalizedAttachment;
  /** Optional CC addresses for this message */
  cc?: string[];
  /** Optional BCC addresses for this message */
  bcc?: string[];
}

/**
 * Options for sending emails
 */
export interface SendOptions {
  campaignId?: string;
  delayBetweenEmails?: number;
  checkTokenEveryN?: number;
  campaignSubject?: string;
  isTransactional?: boolean;
  trackingEnabled?: boolean;
  /** Applied to every message unless the email sets its own */
  cc?: string[];
  /** Applied to every message unless the email sets its own */
  bcc?: string[];
}

/**
 * Failed emails retry info
 */
export interface FailedEmailInfo {
  email: PersonalizedEmailData;
  error: string;
  attemptCount: number;
}

/**
 * Saved campaign info for UI display
 */
export interface SavedCampaignInfo {
  subject?: string;
  remaining: number;
  total: number;
}

/**
 * Campaign document stored in database
 */
export interface CampaignDocument {
  $id?: string;
  subject: string;
  content: string;
  recipients: string; // JSON stringified string[]
  sent: number;
  failed: number;
  status: "completed" | "sending" | "failed";
  user_email: string;
  campaign_type?: string;
  attachments?: string; // JSON stringified AttachmentData[]
  send_results?: string; // JSON stringified EmailResult[]
  created_at: string;
}

/**
 * Campaign creation payload
 */
export interface CreateCampaignPayload {
  subject: string;
  content: string;
  recipients: string[];
  sent: number;
  failed: number;
  status: "completed" | "sending" | "failed";
  user_email: string;
  campaign_type?: string;
  attachments?: AttachmentData[];
  send_results?: EmailResult[];
}
