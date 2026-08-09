import type {
  EmailCampaign,
  EmailCampaignInput,
} from "@/types/appwrite-client";

import { pollForUpdates } from "../poll";
import { createCrudService } from "../service-factory";

// ============================================
// Campaigns Service (via API)
// ============================================

const campaignsCrudService = createCrudService<
  EmailCampaign,
  Omit<EmailCampaignInput, "user_email">,
  Partial<EmailCampaignInput>
>("campaigns");

export const campaignsService = {
  ...campaignsCrudService,

  /** Refresh campaigns periodically. See {@link pollForUpdates} — not realtime. */
  subscribeToUserCampaigns(
    _userEmail: string,
    callback: (response: unknown) => void,
  ) {
    return pollForUpdates(() => callback(undefined));
  },
};
