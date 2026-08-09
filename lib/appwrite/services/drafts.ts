import type { DraftEmail } from "@/types/appwrite-client";

import { apiRequest } from "../api-request";
import { pollForUpdates } from "../poll";
import { createCrudService } from "../service-factory";

// ============================================
// Draft Emails Service (via API)
// ============================================

const draftEmailsCrudService = createCrudService<
  DraftEmail,
  Omit<DraftEmail, "$id" | "created_at" | "sent_at" | "user_email" | "status">,
  Partial<Omit<DraftEmail, "$id" | "user_email" | "created_at" | "status">>
>("draft-emails");

export const draftEmailsService = {
  ...draftEmailsCrudService,

  async updateStatus(
    emailId: string,
    status: DraftEmail["status"],
    error?: string,
  ) {
    return apiRequest<DraftEmail>("/api/appwrite/draft-emails", {
      method: "PUT",
      body: JSON.stringify({ id: emailId, status, error }),
    });
  },

  async cancel(emailId: string) {
    return this.updateStatus(emailId, "cancelled");
  },

  /** Refresh drafts periodically. See {@link pollForUpdates} — not realtime. */
  subscribeToUserDraftEmails(
    _userEmail: string,
    callback: (response: unknown) => void,
  ) {
    return pollForUpdates(() => callback(undefined));
  },
};
