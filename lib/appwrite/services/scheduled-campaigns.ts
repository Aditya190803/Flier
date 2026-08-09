import type { ScheduledCampaign } from "@/types/appwrite-client";

import { apiRequest } from "../api-request";

// ============================================
// Scheduled Campaigns Service (via API)
// ============================================

const basePath = "/api/appwrite/scheduled-campaigns";

/** Fields the client supplies when queuing a campaign. `user_email`, status
 *  and counters are all assigned server-side. */
export type ScheduledCampaignInput = Omit<
  ScheduledCampaign,
  | "$id"
  | "user_email"
  | "status"
  | "campaign_id"
  | "sent"
  | "failed"
  | "attempts"
  | "last_error"
  | "sent_at"
  | "created_at"
  | "updated_at"
>;

export const scheduledCampaignsService = {
  async create(data: ScheduledCampaignInput): Promise<ScheduledCampaign> {
    return apiRequest<ScheduledCampaign>(basePath, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async listByUser(): Promise<{
    total: number;
    documents: ScheduledCampaign[];
  }> {
    return apiRequest<{ total: number; documents: ScheduledCampaign[] }>(
      basePath,
    );
  },

  async get(id: string): Promise<ScheduledCampaign> {
    return apiRequest<ScheduledCampaign>(
      `${basePath}?id=${encodeURIComponent(id)}`,
    );
  },

  /** Move a queued campaign to a new send time. */
  async reschedule(
    id: string,
    scheduledAt: string,
    timezone?: string,
  ): Promise<ScheduledCampaign> {
    return apiRequest<ScheduledCampaign>(basePath, {
      method: "PUT",
      body: JSON.stringify({ id, scheduled_at: scheduledAt, timezone }),
    });
  },

  /** Take a campaign out of the queue without deleting its record. */
  async cancel(id: string): Promise<ScheduledCampaign> {
    return apiRequest<ScheduledCampaign>(basePath, {
      method: "PUT",
      body: JSON.stringify({ id, status: "cancelled" }),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`${basePath}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
