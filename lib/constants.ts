/**
 * Application Constants
 * Centralized location for magic numbers, strings, and configuration values
 */

// ============================================
// API & Network Constants
// ============================================

/**
 * CSRF Protection Constants
 */
export const CSRF_TOKEN_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Default timeout for API requests in milliseconds
 */
export const API_TIMEOUT_MS = 30000;

/**
 * Default timeout for email sending operations in milliseconds
 */
export const EMAIL_SEND_TIMEOUT_MS = 60000;

/**
 * Chunked / resumable bulk campaign sending (see /api/send-email).
 *
 * `vercel.json` caps this route at `maxDuration` seconds. Rather than trying
 * to send an entire campaign in one request (which gets killed mid-flight
 * for large recipient lists), the route processes recipients until this
 * time budget is used up, persists progress, and reports back so the caller
 * can invoke the same endpoint again to continue where it left off.
 */
export const SEND_EMAIL_MAX_DURATION_MS = 60_000;

/** Safety margin subtracted from maxDuration so we stop before the function is killed */
export const SEND_EMAIL_TIME_BUFFER_MS = 10_000;

/** Time budget for a single chunk of a campaign send */
export const SEND_EMAIL_CHUNK_BUDGET_MS =
  SEND_EMAIL_MAX_DURATION_MS - SEND_EMAIL_TIME_BUFFER_MS;

/**
 * Maximum file size for attachments (10MB)
 */
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Maximum total size for all attachments (25MB)
 */
export const MAX_TOTAL_ATTACHMENTS_SIZE_BYTES = 25 * 1024 * 1024;

/**
 * Maximum number of recipients per campaign
 */
export const MAX_RECIPIENTS_PER_CAMPAIGN = 500;

/**
 * Delay between sending emails to avoid rate limiting (ms)
 */
export const DELAY_BETWEEN_EMAILS_MS = 100;

/**
 * Maximum retries for failed email sends
 */
export const MAX_EMAIL_RETRIES = 3;

/**
 * Retry delay base for exponential backoff (ms)
 */
export const RETRY_DELAY_BASE_MS = 1000;

// ============================================
// Pagination Constants
// ============================================

/**
 * Default page size for paginated lists
 */
export const DEFAULT_PAGE_SIZE = 10;

/**
 * Available page size options
 */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/**
 * Maximum items per page
 */
export const MAX_PAGE_SIZE = 100;

// ============================================
// Rate Limiting Constants
// ============================================

/**
 * Rate limit window in milliseconds (1 minute)
 */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * Maximum requests per rate limit window
 */
export const RATE_LIMIT_MAX_REQUESTS = 60;

/**
 * Rate limit for email sending per minute
 */
export const EMAIL_RATE_LIMIT_PER_MINUTE = 30;

// ============================================
// Cache Constants
// ============================================

/**
 * Default cache TTL in seconds (5 minutes)
 */
export const DEFAULT_CACHE_TTL_SECONDS = 300;

/**
 * Long cache TTL for static data (1 hour)
 */
export const LONG_CACHE_TTL_SECONDS = 3600;

/**
 * Short cache TTL for dynamic data (30 seconds)
 */
export const SHORT_CACHE_TTL_SECONDS = 30;

// ============================================
// UI Constants
// ============================================

/**
 * Toast notification auto-hide duration (ms)
 */
export const TOAST_DURATION_MS = 5000;

/**
 * Animation duration for transitions (ms)
 */
export const ANIMATION_DURATION_MS = 300;

/**
 * Debounce delay for search inputs (ms)
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Maximum length for truncated text
 */
export const TRUNCATE_LENGTH = 100;

/**
 * Maximum visible pagination buttons
 */
export const MAX_PAGINATION_BUTTONS = 7;

// ============================================
// Validation Constants
// ============================================

/**
 * Minimum password length
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Maximum subject line length
 */
export const MAX_SUBJECT_LENGTH = 200;

/**
 * Maximum email body length (characters)
 */
export const MAX_EMAIL_BODY_LENGTH = 100000;

/**
 * Maximum template name length
 */
export const MAX_TEMPLATE_NAME_LENGTH = 100;

/**
 * Maximum contact name length
 */
export const MAX_CONTACT_NAME_LENGTH = 100;

/**
 * Email regex pattern for validation
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// ============================================
// Feature Flags
// ============================================

/**
 * Enable A/B testing features
 */
export const FEATURE_AB_TESTING =
  process.env.NEXT_PUBLIC_FEATURE_AB_TESTING === "true";

/**
 * Enable analytics tracking
 */
export const FEATURE_ANALYTICS =
  process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === "true";

/**
 * Enable team collaboration features
 */
export const FEATURE_TEAMS = process.env.NEXT_PUBLIC_FEATURE_TEAMS === "true";

// ============================================
// Storage Keys
// ============================================

/**
 * LocalStorage key for theme preference
 */
export const STORAGE_KEY_THEME = "flier-theme";

/** Compose draft in localStorage */
export const STORAGE_KEY_COMPOSE_DRAFT = "flier_draft";

/** In-flight campaign persistence */
export const STORAGE_KEY_CAMPAIGN_STATE = "flier_campaign_state";
export const STORAGE_KEY_CAMPAIGN_LOCK = "flier_campaign_lock";
export const STORAGE_KEY_TAB_ID = "flier_tab_id";
export const STORAGE_KEY_GMAIL_QUOTA = "flier_gmail_quota";

/**
 * SessionStorage key for selected template
 */
export const STORAGE_KEY_SELECTED_TEMPLATE = "selectedTemplate";

/**
 * SessionStorage key for draft email
 */
export const STORAGE_KEY_DRAFT_EMAIL = "draftEmail";

// ============================================
// API Endpoints
// ============================================

/**
 * Base API URL
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * API route paths
 */
export const API_ROUTES = {
  SEND_EMAIL: "/api/send-email",
  SEND_SINGLE_EMAIL: "/api/send-single-email",
  SEND_DRAFT: "/api/send-draft",
  SCHEDULED_CAMPAIGNS: "/api/appwrite/scheduled-campaigns",
  CRON_SEND_SCHEDULED: "/api/cron/send-scheduled",
  FORMAT_EMAIL: "/api/format-email",
  UPLOAD_ATTACHMENT: "/api/upload-attachment",
  EXPORT_REPORT: "/api/export-report",
  IMPORT_CONTACTS: "/api/import-google-contacts",
  REFRESH_TOKEN: "/api/refresh-token",
  TRACK_OPEN: "/api/track/open",
  TRACK_CLICK: "/api/track/click",
  UNSUBSCRIBE: "/api/unsubscribe",
  GDPR_DELETE: "/api/gdpr/delete",
  GDPR_EXPORT: "/api/gdpr/export",
  GDPR_AUDIT_LOGS: "/api/gdpr/audit-logs",
} as const;

// ============================================
// HTTP Status Codes
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================
// Template Categories
// ============================================

export const TEMPLATE_CATEGORIES = [
  { value: "marketing", label: "Marketing", color: "bg-blue-500" },
  { value: "newsletter", label: "Newsletter", color: "bg-green-500" },
  { value: "transactional", label: "Transactional", color: "bg-purple-500" },
  { value: "announcement", label: "Announcement", color: "bg-orange-500" },
  { value: "personal", label: "Personal", color: "bg-pink-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
] as const;

// ============================================
// Contact Group Colors
// ============================================

export const GROUP_COLORS = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "gray", label: "Gray", class: "bg-gray-500" },
] as const;

// ============================================
// Campaign Status
// ============================================

export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  SENDING: "sending",
  /** A chunked send stopped partway through its time budget; resume by calling /api/send-email again with the same campaignId */
  PARTIAL: "partial",
  COMPLETED: "completed",
  FAILED: "failed",
  PAUSED: "paused",
} as const;

export type CampaignStatus =
  (typeof CAMPAIGN_STATUS)[keyof typeof CAMPAIGN_STATUS];

// ============================================
// Scheduled Sending
// ============================================

/**
 * Lifecycle of a row in the `scheduled_campaigns` collection.
 *
 * `processing` is a worker lease, not a user-visible state: a cron run claims
 * a due row by moving it to `processing` and either finishes it or drops it
 * back to `scheduled` to continue on the next tick.
 */
export const SCHEDULED_STATUS = {
  SCHEDULED: "scheduled",
  PROCESSING: "processing",
  SENT: "sent",
  PARTIAL: "partial",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type ScheduledStatus =
  (typeof SCHEDULED_STATUS)[keyof typeof SCHEDULED_STATUS];

/**
 * A campaign must be scheduled at least this far out. Guards against a time
 * that's already past by the time the request lands, and gives the user a
 * moment to cancel a misfire.
 */
export const MIN_SCHEDULE_LEAD_MS = 60_000;

/** Furthest into the future a campaign may be scheduled (1 year). */
export const MAX_SCHEDULE_HORIZON_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Time budget for one cron pass over due campaigns. Kept under the route's
 * 60s `maxDuration` (see `vercel.json`) so the worker persists progress and
 * exits cleanly rather than being killed mid-send.
 */
export const SCHEDULED_CRON_BUDGET_MS = 45_000;

/**
 * How long a `processing` lease is honoured before another run may reclaim
 * the row. Covers a worker that was killed without releasing its lease.
 */
export const SCHEDULED_LOCK_STALE_MS = 10 * 60 * 1000;

/** Maximum due campaigns a single cron pass will look at. */
export const SCHEDULED_BATCH_SIZE = 10;

/** Give up on a campaign after this many failed dispatch attempts. */
export const SCHEDULED_MAX_ATTEMPTS = 5;

// ============================================
// Error Messages
// ============================================

export const ERROR_MESSAGES = {
  GENERIC: "Something went wrong. Please try again.",
  NETWORK: "Network error. Please check your connection.",
  UNAUTHORIZED: "You need to sign in to perform this action.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  RATE_LIMITED: "Too many requests. Please wait a moment.",
  VALIDATION: "Please check your input and try again.",
  EMAIL_SEND_FAILED: "Failed to send email. Please try again.",
  FILE_TOO_LARGE: "File is too large. Maximum size is 10MB.",
  INVALID_FILE_TYPE: "Invalid file type. Please upload a supported format.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
} as const;

// ============================================
// Success Messages
// ============================================

export const SUCCESS_MESSAGES = {
  EMAIL_SENT: "Email sent successfully!",
  CONTACT_ADDED: "Contact added successfully!",
  CONTACT_DELETED: "Contact deleted successfully.",
  TEMPLATE_CREATED: "Template created successfully!",
  TEMPLATE_UPDATED: "Template updated successfully!",
  TEMPLATE_DELETED: "Template deleted successfully.",
  SETTINGS_SAVED: "Settings saved successfully!",
  FILE_UPLOADED: "File uploaded successfully!",
  COPIED_TO_CLIPBOARD: "Copied to clipboard!",
} as const;

// ============================================
// Date/Time Formats
// ============================================

export const DATE_FORMATS = {
  SHORT: "MMM d, yyyy",
  LONG: "MMMM d, yyyy",
  WITH_TIME: "MMM d, yyyy HH:mm",
  TIME_ONLY: "HH:mm",
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const;

// ============================================
// Supported File Types
// ============================================

export const SUPPORTED_ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
] as const;

export const SUPPORTED_CSV_TYPES = [
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
] as const;
