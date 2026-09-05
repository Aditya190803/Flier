/**
 * Shared API Types
 *
 * Defines TypeScript interfaces for all API request and response payloads.
 * These types ensure consistency between frontend and backend.
 */

// ============================================
// Common Types
// ============================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

/**
 * API error details
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string; // For validation errors
}

/**
 * API metadata for pagination, etc.
 */
export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================
// Contact Types
// ============================================

/**
 * Contact entity
 */
export interface Contact {
  id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  tags: string[];
  customFields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create contact request
 */
export interface CreateContactRequest {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

/**
 * Update contact request
 */
export interface UpdateContactRequest {
  name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

/**
 * Bulk import contacts request
 */
export interface BulkImportContactsRequest {
  contacts: CreateContactRequest[];
  skipDuplicates?: boolean;
  updateExisting?: boolean;
}

/**
 * Bulk import result
 */
export interface BulkImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: Array<{ email: string; error: string }>;
}

// ============================================
// Campaign Types
// ============================================

/**
 * Campaign status
 */
export type CampaignStatus =
  "draft" | "scheduled" | "sending" | "completed" | "paused" | "failed";

/**
 * Campaign type
 */
export type CampaignType = "single" | "bulk" | "drip";

/**
 * Campaign entity
 */
export interface Campaign {
  id: string;
  subject: string;
  content: string;
  status: CampaignStatus;
  type: CampaignType;
  recipients: string[];
  sent: number;
  failed: number;
  opened: number;
  clicked: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create campaign request
 */
export interface CreateCampaignRequest {
  subject: string;
  content: string;
  type?: CampaignType;
  recipients: string[];
  scheduledAt?: string;
  attachments?: AttachmentInfo[];
}

/**
 * Send email request (single)
 */
export interface SendEmailRequest {
  to: string;
  subject: string;
  content: string;
  attachments?: AttachmentInfo[];
  replyTo?: string;
}

/**
 * Send bulk email request
 */
export interface SendBulkEmailRequest {
  personalizedEmails: PersonalizedEmailData[];
  delayBetweenEmails?: number;
}

/**
 * Personalized email data
 */
export interface PersonalizedEmailData {
  to: string;
  subject: string;
  message: string;
  originalRowData: Record<string, string>;
  attachments?: AttachmentInfo[];
  personalizedAttachment?: {
    url: string;
    fileName?: string;
  };
}

/**
 * Email send result
 */
export interface EmailSendResult {
  email: string;
  status: "success" | "error" | "skipped";
  messageId?: string;
  error?: string;
}

/**
 * Campaign send summary
 */
export interface CampaignSendSummary {
  campaignId: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: EmailSendResult[];
}

// ============================================
// Template Types
// ============================================

/**
 * Email template entity
 */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category?: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Create template request
 */
export interface CreateTemplateRequest {
  name: string;
  subject: string;
  content: string;
  category?: string;
}

/**
 * Update template request
 */
export interface UpdateTemplateRequest {
  name?: string;
  subject?: string;
  content?: string;
  category?: string;
}

// ============================================
// Attachment Types
// ============================================

/**
 * Attachment information
 */
export interface AttachmentInfo {
  id?: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  data?: string; // Base64 encoded
}

/**
 * Upload attachment response
 */
export interface UploadAttachmentResponse {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

// ============================================
// Analytics Types
// ============================================

/**
 * Campaign analytics
 */
export interface CampaignAnalytics {
  campaignId: string;
  subject: string;
  sentAt: string;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalContacts: number;
  totalCampaigns: number;
  totalEmailsSent: number;
  averageOpenRate: number;
  averageClickRate: number;
  recentCampaigns: Campaign[];
  contactGrowth: Array<{ date: string; count: number }>;
}

/**
 * Export report format
 */
export type ExportFormat = "csv" | "json" | "pdf";

/**
 * Export report request
 */
export interface ExportReportRequest {
  format: ExportFormat;
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================
// GDPR Types
// ============================================

/**
 * GDPR data export
 */
export interface GdprExportData {
  user: {
    email: string;
    name?: string;
  };
  contacts: Contact[];
  campaigns: Campaign[];
  templates: EmailTemplate[];
  exportDate: string;
}

/**
 * GDPR consent record
 */
export interface GdprConsent {
  type: "marketing" | "analytics" | "essential";
  granted: boolean;
  timestamp: string;
  ipAddress?: string;
}

/**
 * GDPR audit log entry
 */
export interface GdprAuditLog {
  id: string;
  action: "export" | "delete" | "consent_update" | "access";
  userId: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// ============================================
// Auth Types
// ============================================

/**
 * User session
 */
export interface UserSession {
  user: {
    id?: string;
    email: string;
    name?: string;
    image?: string;
  };
  accessToken: string;
  expiresAt: number;
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
}

// ============================================
// API Version Info
// ============================================

/**
 * API version information
 */
export interface ApiVersionInfo {
  version: string;
  deprecated: boolean;
  sunsetDate?: string;
  latestVersion: string;
}

/**
 * Current API version
 */
export const API_VERSION = "v1";

/**
 * API base paths
 */
export const API_PATHS = {
  contacts: `/api/${API_VERSION}/contacts`,
  campaigns: `/api/${API_VERSION}/campaigns`,
  templates: `/api/${API_VERSION}/templates`,
  analytics: `/api/${API_VERSION}/analytics`,
  gdpr: `/api/${API_VERSION}/gdpr`,
  auth: `/api/auth`,
} as const;
