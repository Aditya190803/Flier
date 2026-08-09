export interface Contact {
  $id?: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  tags?: string[];
  user_email: string;
  created_at?: string;
}

export interface EmailCampaignInput {
  id?: string;
  subject: string;
  content: string;
  recipients: string[];
  sent: number;
  failed: number;
  status: "completed" | "sending" | "failed";
  user_email: string;
  campaign_type?: string;
  attachments?: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    appwrite_file_id?: string;
  }[];
  send_results?: {
    email: string;
    status: "success" | "error" | "skipped" | "cancelled";
    error?: string;
    messageId?: string;
  }[];
  personalized_attachment_column?: string;
  has_personalized_attachments?: boolean;
}

export interface EmailCampaign extends EmailCampaignInput {
  $id: string;
  created_at: string;
}

export interface EmailTemplate {
  $id?: string;
  name: string;
  subject: string;
  content: string;
  category?: string;
  user_email: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateVersion {
  $id?: string;
  template_id: string;
  version: number;
  name: string;
  subject: string;
  content: string;
  category?: string;
  user_email: string;
  created_at: string;
  change_note?: string;
}

export interface ContactGroup {
  $id?: string;
  name: string;
  description?: string;
  color?: string;
  contact_ids: string[];
  user_email: string;
  created_at?: string;
  updated_at?: string;
}

export interface DraftEmail {
  $id?: string;
  subject: string;
  content: string;
  recipients: string[];
  saved_at: string;
  status: "pending" | "sending" | "sent" | "failed" | "cancelled";
  user_email: string;
  attachments?: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    appwrite_file_id?: string;
  }[];
  csv_data?: Record<string, string>[];
  /** Campaign-level Cc addresses */
  cc?: string[];
  /** Campaign-level Bcc addresses */
  bcc?: string[];
  personalized_attachment_column?: string;
  has_personalized_attachments?: boolean;
  created_at?: string;
  sent_at?: string;
  error?: string;
}

export interface EmailSignature {
  $id?: string;
  name: string;
  content: string;
  is_default: boolean;
  user_email: string;
  created_at?: string;
  updated_at?: string;
}

export interface Unsubscribe {
  $id?: string;
  email: string;
  user_email: string;
  reason?: string;
  unsubscribed_at?: string;
}

export interface Webhook {
  $id?: string;
  name: string;
  url: string;
  events: (
    | "campaign.sent"
    | "campaign.failed"
    | "email.opened"
    | "email.clicked"
    | "email.bounced"
  )[];
  is_active: boolean;
  secret?: string;
  user_email: string;
  created_at?: string;
  updated_at?: string;
  last_triggered_at?: string;
}

export interface ABTest {
  $id?: string;
  name: string;
  status: "draft" | "running" | "completed";
  test_type: "subject" | "content" | "send_time";
  variant_a_subject?: string;
  variant_a_content?: string;
  variant_b_subject?: string;
  variant_b_content?: string;
  variant_a_recipients: string[];
  variant_b_recipients: string[];
  variant_a_sent: number;
  variant_b_sent: number;
  variant_a_opens: number;
  variant_b_opens: number;
  variant_a_clicks: number;
  variant_b_clicks: number;
  winner?: "A" | "B" | "tie";
  user_email: string;
  created_at?: string;
  completed_at?: string;
}
