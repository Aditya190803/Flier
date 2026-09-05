import type { AuditLogDocument } from "@/types/appwrite";

import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "../../constants";
import { getCookie } from "../../utils";
import { apiRequest } from "../api-request";

/**
 * Result details for a GDPR data deletion request
 */
export interface GDPRDeletionDetails {
  contacts: number;
  campaigns: number;
  templates: number;
  drafts: number;
  signatures: number;
  groups: number;
  unsubscribes: number;
  webhooks: number;
  attachments: number;
  ab_tests: number;
  tracking_events: number;
  audit_logs: number;
  consent_records: number;
  errors: string[];
}

// ============================================
// GDPR Service (via API)
// ============================================

export const gdprService = {
  // Export all user data
  async exportData(): Promise<Blob> {
    const csrfToken = getCookie(CSRF_TOKEN_NAME);
    const response = await fetch("/api/gdpr/export", {
      credentials: "include",
      headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {},
    });
    if (!response.ok) {
      let errorMessage = "Failed to export data";
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // Response body wasn't JSON, use status
        errorMessage = `Failed to export data: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    return response.blob();
  },

  // Delete all user data
  async deleteAllData(): Promise<{
    success: boolean;
    message: string;
    details: GDPRDeletionDetails;
  }> {
    const csrfToken = getCookie(CSRF_TOKEN_NAME);
    const response = await fetch("/api/gdpr/delete", {
      method: "DELETE",
      credentials: "include",
      headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {},
    });
    if (!response.ok) {
      let errorMessage = "Failed to delete data";
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // Response body wasn't JSON
        errorMessage = `Failed to delete data: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  },

  // Get consent records
  async getConsents(): Promise<{
    total: number;
    documents: Record<string, unknown>[];
  }> {
    return apiRequest("/api/gdpr/consent");
  },

  // Update consent
  async updateConsent(
    consentType: string,
    given: boolean,
  ): Promise<Record<string, unknown>> {
    return apiRequest("/api/gdpr/consent", {
      method: "POST",
      body: JSON.stringify({ consent_type: consentType, given }),
    });
  },
};

// ============================================
// Audit Logs Service (via API)
// ============================================

export const auditLogsService = {
  // List audit logs
  async list(options?: {
    limit?: number;
    offset?: number;
    action?: string;
    resource_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ total: number; documents: AuditLogDocument[] }> {
    const params = new URLSearchParams();
    if (options?.limit !== undefined && options.limit >= 0) {
      params.append("limit", options.limit.toString());
    }
    if (options?.offset !== undefined && options.offset >= 0) {
      params.append("offset", options.offset.toString());
    }
    if (options?.action) {
      params.append("action", options.action);
    }
    if (options?.resource_type) {
      params.append("resource_type", options.resource_type);
    }
    if (options?.start_date) {
      params.append("start_date", options.start_date);
    }
    if (options?.end_date) {
      params.append("end_date", options.end_date);
    }

    return apiRequest(`/api/gdpr/audit-logs?${params}`);
  },

  // Log an action
  async log(
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await apiRequest("/api/gdpr/audit-logs", {
      method: "POST",
      body: JSON.stringify({
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
      }),
    });
  },
};
