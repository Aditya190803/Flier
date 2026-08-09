export interface StoredScheduledAttachment {
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  appwrite_file_id?: string;
}

/** A campaign queued for unattended delivery at `scheduled_at`. */
export interface ScheduledCampaign {
  $id: string;
  subject: string;
  content: string;
  recipients: string[];
  scheduled_at: string;
  timezone?: string;
  status:
    | "scheduled"
    | "processing"
    | "sent"
    | "partial"
    | "failed"
    | "cancelled";
  user_email: string;
  campaign_id: string;
  attachments: StoredScheduledAttachment[];
  csv_data: Record<string, string>[];
  cc: string[];
  bcc: string[];
  tracking_enabled: boolean;
  is_marketing: boolean;
  personalized_attachment_column?: string;
  has_personalized_attachments: boolean;
  sent: number;
  failed: number;
  attempts: number;
  locked_at?: string;
  last_error?: string;
  sent_at?: string;
  created_at?: string;
  updated_at?: string;
}
