/**
 * Unit tests for constants
 */

import { describe, it, expect } from "vite-plus/test";

import {
  API_TIMEOUT_MS,
  EMAIL_SEND_TIMEOUT_MS,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_TOTAL_ATTACHMENTS_SIZE_BYTES,
  MAX_RECIPIENTS_PER_CAMPAIGN,
  DELAY_BETWEEN_EMAILS_MS,
  MAX_EMAIL_RETRIES,
  RETRY_DELAY_BASE_MS,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  MAX_PAGE_SIZE,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  EMAIL_RATE_LIMIT_PER_MINUTE,
  DEFAULT_CACHE_TTL_SECONDS,
  LONG_CACHE_TTL_SECONDS,
  SHORT_CACHE_TTL_SECONDS,
  TOAST_DURATION_MS,
  ANIMATION_DURATION_MS,
  SEARCH_DEBOUNCE_MS,
  TRUNCATE_LENGTH,
  MAX_PAGINATION_BUTTONS,
  MIN_PASSWORD_LENGTH,
  MAX_SUBJECT_LENGTH,
  MAX_EMAIL_BODY_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_CONTACT_NAME_LENGTH,
  EMAIL_REGEX,
  STORAGE_KEY_THEME,
  STORAGE_KEY_SELECTED_TEMPLATE,
  STORAGE_KEY_DRAFT_EMAIL,
  API_ROUTES,
  HTTP_STATUS,
  TEMPLATE_CATEGORIES,
  GROUP_COLORS,
  CAMPAIGN_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "@/lib/constants";

describe("Constants", () => {
  describe("API & Network Constants", () => {
    it("should have correct timeout values", () => {
      expect(API_TIMEOUT_MS).toBe(30000);
      expect(EMAIL_SEND_TIMEOUT_MS).toBe(60000);
    });

    it("should have correct attachment size limits", () => {
      expect(MAX_ATTACHMENT_SIZE_BYTES).toBe(10 * 1024 * 1024); // 10MB
      expect(MAX_TOTAL_ATTACHMENTS_SIZE_BYTES).toBe(25 * 1024 * 1024); // 25MB
    });

    it("should have correct campaign limits", () => {
      expect(MAX_RECIPIENTS_PER_CAMPAIGN).toBe(500);
    });

    it("should have correct retry settings", () => {
      expect(DELAY_BETWEEN_EMAILS_MS).toBe(100);
      expect(MAX_EMAIL_RETRIES).toBe(3);
      expect(RETRY_DELAY_BASE_MS).toBe(1000);
    });
  });

  describe("Pagination Constants", () => {
    it("should have correct pagination defaults", () => {
      expect(DEFAULT_PAGE_SIZE).toBe(10);
      expect(MAX_PAGE_SIZE).toBe(100);
    });

    it("should have valid page size options", () => {
      expect(PAGE_SIZE_OPTIONS).toEqual([10, 25, 50, 100]);
      expect(PAGE_SIZE_OPTIONS).toContain(DEFAULT_PAGE_SIZE);
      expect(PAGE_SIZE_OPTIONS).toContain(MAX_PAGE_SIZE);
    });
  });

  describe("Rate Limiting Constants", () => {
    it("should have correct rate limit settings", () => {
      expect(RATE_LIMIT_WINDOW_MS).toBe(60 * 1000);
      expect(RATE_LIMIT_MAX_REQUESTS).toBe(60);
      expect(EMAIL_RATE_LIMIT_PER_MINUTE).toBe(30);
    });
  });

  describe("Cache Constants", () => {
    it("should have correct cache TTL values", () => {
      expect(DEFAULT_CACHE_TTL_SECONDS).toBe(300); // 5 minutes
      expect(LONG_CACHE_TTL_SECONDS).toBe(3600); // 1 hour
      expect(SHORT_CACHE_TTL_SECONDS).toBe(30); // 30 seconds
    });

    it("should have TTL values in correct order", () => {
      expect(SHORT_CACHE_TTL_SECONDS).toBeLessThan(DEFAULT_CACHE_TTL_SECONDS);
      expect(DEFAULT_CACHE_TTL_SECONDS).toBeLessThan(LONG_CACHE_TTL_SECONDS);
    });
  });

  describe("UI Constants", () => {
    it("should have correct UI timing values", () => {
      expect(TOAST_DURATION_MS).toBe(5000);
      expect(ANIMATION_DURATION_MS).toBe(300);
      expect(SEARCH_DEBOUNCE_MS).toBe(300);
    });

    it("should have correct display limits", () => {
      expect(TRUNCATE_LENGTH).toBe(100);
      expect(MAX_PAGINATION_BUTTONS).toBe(7);
    });
  });

  describe("Validation Constants", () => {
    it("should have correct length limits", () => {
      expect(MIN_PASSWORD_LENGTH).toBe(8);
      expect(MAX_SUBJECT_LENGTH).toBe(200);
      expect(MAX_EMAIL_BODY_LENGTH).toBe(100000);
      expect(MAX_TEMPLATE_NAME_LENGTH).toBe(100);
      expect(MAX_CONTACT_NAME_LENGTH).toBe(100);
    });

    it("should have valid email regex", () => {
      // Valid emails
      expect(EMAIL_REGEX.test("test@example.com")).toBe(true);
      expect(EMAIL_REGEX.test("user.name@domain.org")).toBe(true);
      expect(EMAIL_REGEX.test("user+tag@company.co.uk")).toBe(true);

      // Invalid emails
      expect(EMAIL_REGEX.test("notanemail")).toBe(false);
      expect(EMAIL_REGEX.test("@nodomain.com")).toBe(false);
      expect(EMAIL_REGEX.test("missing@")).toBe(false);
    });
  });

  describe("Storage Keys", () => {
    it("should have all required storage keys", () => {
      expect(STORAGE_KEY_THEME).toBe("flier-theme");
      expect(STORAGE_KEY_SELECTED_TEMPLATE).toBe("selectedTemplate");
      expect(STORAGE_KEY_DRAFT_EMAIL).toBe("draftEmail");
    });
  });

  describe("API Routes", () => {
    it("should have all required routes defined", () => {
      expect(API_ROUTES.SEND_EMAIL).toBe("/api/send-email");
      expect(API_ROUTES.SEND_SINGLE_EMAIL).toBe("/api/send-single-email");
      expect(API_ROUTES.SEND_DRAFT).toBe("/api/send-draft");
      expect(API_ROUTES.FORMAT_EMAIL).toBe("/api/format-email");
      expect(API_ROUTES.UPLOAD_ATTACHMENT).toBe("/api/upload-attachment");
      expect(API_ROUTES.EXPORT_REPORT).toBe("/api/export-report");
      expect(API_ROUTES.IMPORT_CONTACTS).toBe("/api/import-google-contacts");
      expect(API_ROUTES.REFRESH_TOKEN).toBe("/api/refresh-token");
      expect(API_ROUTES.UNSUBSCRIBE).toBe("/api/unsubscribe");
    });

    it("should have GDPR routes", () => {
      expect(API_ROUTES.GDPR_DELETE).toBe("/api/gdpr/delete");
      expect(API_ROUTES.GDPR_EXPORT).toBe("/api/gdpr/export");
      expect(API_ROUTES.GDPR_AUDIT_LOGS).toBe("/api/gdpr/audit-logs");
    });

    it("should have tracking routes", () => {
      expect(API_ROUTES.TRACK_OPEN).toBe("/api/track/open");
      expect(API_ROUTES.TRACK_CLICK).toBe("/api/track/click");
    });
  });

  describe("HTTP Status Codes", () => {
    it("should have correct success codes", () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.NO_CONTENT).toBe(204);
    });

    it("should have correct client error codes", () => {
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.CONFLICT).toBe(409);
      expect(HTTP_STATUS.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
    });

    it("should have correct server error codes", () => {
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
    });
  });

  describe("Template Categories", () => {
    it("should have expected categories", () => {
      const categoryValues = TEMPLATE_CATEGORIES.map((c) => c.value);

      expect(categoryValues).toContain("marketing");
      expect(categoryValues).toContain("newsletter");
      expect(categoryValues).toContain("transactional");
      expect(categoryValues).toContain("announcement");
      expect(categoryValues).toContain("personal");
      expect(categoryValues).toContain("other");
    });

    it("should have labels and colors for each category", () => {
      TEMPLATE_CATEGORIES.forEach((category) => {
        expect(category.label).toBeDefined();
        expect(category.color).toContain("bg-");
      });
    });
  });

  describe("Group Colors", () => {
    it("should have multiple color options", () => {
      expect(GROUP_COLORS.length).toBeGreaterThanOrEqual(5);
    });

    it("should have value, label, and class for each color", () => {
      GROUP_COLORS.forEach((color) => {
        expect(color.value).toBeDefined();
        expect(color.label).toBeDefined();
        expect(color.class).toContain("bg-");
      });
    });
  });

  describe("Campaign Status", () => {
    it("should have all required statuses", () => {
      expect(CAMPAIGN_STATUS.DRAFT).toBe("draft");
      expect(CAMPAIGN_STATUS.SCHEDULED).toBe("scheduled");
      expect(CAMPAIGN_STATUS.SENDING).toBe("sending");
      expect(CAMPAIGN_STATUS.COMPLETED).toBe("completed");
      expect(CAMPAIGN_STATUS.FAILED).toBe("failed");
      expect(CAMPAIGN_STATUS.PAUSED).toBe("paused");
    });
  });

  describe("Error Messages", () => {
    it("should have all required error messages", () => {
      expect(ERROR_MESSAGES.GENERIC).toBeDefined();
      expect(ERROR_MESSAGES.NETWORK).toBeDefined();
      expect(ERROR_MESSAGES.UNAUTHORIZED).toBeDefined();
      expect(ERROR_MESSAGES.FORBIDDEN).toBeDefined();
      expect(ERROR_MESSAGES.NOT_FOUND).toBeDefined();
      expect(ERROR_MESSAGES.RATE_LIMITED).toBeDefined();
      expect(ERROR_MESSAGES.VALIDATION).toBeDefined();
      expect(ERROR_MESSAGES.EMAIL_SEND_FAILED).toBeDefined();
      expect(ERROR_MESSAGES.FILE_TOO_LARGE).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_FILE_TYPE).toBeDefined();
      expect(ERROR_MESSAGES.SESSION_EXPIRED).toBeDefined();
    });
  });

  describe("Success Messages", () => {
    it("should have all required success messages", () => {
      expect(SUCCESS_MESSAGES.EMAIL_SENT).toBeDefined();
      expect(SUCCESS_MESSAGES.CONTACT_ADDED).toBeDefined();
      expect(SUCCESS_MESSAGES.CONTACT_DELETED).toBeDefined();
      expect(SUCCESS_MESSAGES.TEMPLATE_CREATED).toBeDefined();
      expect(SUCCESS_MESSAGES.TEMPLATE_UPDATED).toBeDefined();
      expect(SUCCESS_MESSAGES.TEMPLATE_DELETED).toBeDefined();
      expect(SUCCESS_MESSAGES.SETTINGS_SAVED).toBeDefined();
      expect(SUCCESS_MESSAGES.FILE_UPLOADED).toBeDefined();
      expect(SUCCESS_MESSAGES.COPIED_TO_CLIPBOARD).toBeDefined();
    });
  });
});
