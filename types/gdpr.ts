/**
 * GDPR and Compliance related type definitions
 */

// Data Export Request
export interface DataExportRequest {
  $id?: string;
  user_email: string;
  status: "pending" | "processing" | "completed" | "failed";
  requested_at: string;
  completed_at?: string;
  download_url?: string;
  expires_at?: string;
  error?: string;
}

// Data Deletion Request
export interface DataDeletionRequest {
  $id?: string;
  user_email: string;
  status: "pending" | "processing" | "completed" | "failed";
  requested_at: string;
  completed_at?: string;
  deleted_items?: {
    contacts: number;
    campaigns: number;
    templates: number;
    drafts: number;
    signatures: number;
    groups: number;
    attachments: number;
  };
  error?: string;
}

// Consent Record
export interface ConsentRecord {
  $id?: string;
  user_email: string;
  consent_type: "marketing" | "analytics" | "data_processing" | "third_party";
  granted: boolean;
  granted_at?: string;
  revoked_at?: string;
  ip_address?: string;
  source?: string;
}

// Audit Log Entry
export interface AuditLogEntry {
  $id?: string;
  user_email: string;
  action: string;
  resource_type:
    | "contact"
    | "campaign"
    | "template"
    | "draft"
    | "signature"
    | "group"
    | "settings"
    | "auth"
    | "export"
    | "team";
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Common audit actions
export type AuditAction =
  // Auth actions
  | "user.login"
  | "user.logout"
  | "user.session_refresh"
  // Contact actions
  | "contact.create"
  | "contact.update"
  | "contact.delete"
  | "contact.import"
  | "contact.export"
  // Campaign actions
  | "campaign.create"
  | "campaign.send"
  | "campaign.cancel"
  // Template actions
  | "template.create"
  | "template.update"
  | "template.delete"
  // Draft actions
  | "draft.create"
  | "draft.update"
  | "draft.delete"
  | "draft.send"
  // Settings actions
  | "settings.update"
  | "signature.create"
  | "signature.update"
  | "signature.delete"
  // GDPR actions
  | "gdpr.export_request"
  | "gdpr.export_complete"
  | "gdpr.deletion_request"
  | "gdpr.deletion_complete"
  | "gdpr.consent_given"
  | "gdpr.consent_revoked"
  // Team actions
  | "team.create"
  | "team.update"
  | "team.delete"
  | "team.member_invite"
  | "team.member_remove"
  | "team.member_role_change";

// Team/Organization Types
export interface Team {
  $id?: string;
  name: string;
  description?: string;
  owner_email: string;
  created_at: string;
  updated_at?: string;
  settings?: TeamSettings;
}

export interface TeamSettings {
  allow_member_invite: boolean;
  require_approval: boolean;
  shared_templates: boolean;
  shared_contacts: boolean;
}

export interface TeamMember {
  $id?: string;
  team_id: string;
  user_email: string;
  role: "owner" | "admin" | "member" | "viewer";
  permissions?: string[];
  invited_by?: string;
  joined_at?: string;
  status: "pending" | "active" | "removed";
}

// GDPR Data Export format
export interface GDPRDataExport {
  export_date: string;
  user_email: string;
  user_name?: string;
  data: {
    profile: {
      email: string;
      name?: string;
      created_at?: string;
    };
    contacts: Array<{
      email: string;
      name?: string;
      company?: string;
      phone?: string;
      created_at: string;
    }>;
    campaigns: Array<{
      subject: string;
      recipients_count: number;
      sent: number;
      failed: number;
      status: string;
      created_at: string;
    }>;
    templates: Array<{
      name: string;
      subject: string;
      category?: string;
      created_at: string;
    }>;
    drafts: Array<{
      subject: string;
      recipients_count: number;
      created_at: string;
    }>;
    signatures: Array<{
      name: string;
      is_default: boolean;
      created_at: string;
    }>;
    consent_records: Array<{
      consent_type: string;
      granted: boolean;
      granted_at?: string;
      revoked_at?: string;
    }>;
    tracking_events?: Array<{
      event_type: string;
      campaign_id: string;
      recipient_email: string;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
    }>;
    campaign_workspace?: Record<string, unknown>;
  };
}
