import type { EmailTemplate, TemplateVersion } from "@/types/appwrite-client";

import { apiRequest } from "../api-request";
import { pollForUpdates } from "../poll";
import { createCrudService } from "../service-factory";

// ============================================
// Templates Service (via API)
// ============================================

const templatesCrudService = createCrudService<
  EmailTemplate,
  Omit<EmailTemplate, "$id" | "created_at" | "updated_at">,
  Partial<Omit<EmailTemplate, "$id" | "user_email" | "created_at">>
>("templates");

export const templatesService = {
  ...templatesCrudService,

  async update(
    templateId: string,
    data: Partial<Omit<EmailTemplate, "$id" | "user_email" | "created_at">> & {
      saveVersion?: boolean;
      changeNote?: string;
    },
  ) {
    const { saveVersion, changeNote, ...templateData } = data;
    return apiRequest<EmailTemplate>("/api/appwrite/templates", {
      method: "PUT",
      body: JSON.stringify({
        id: templateId,
        saveVersion,
        changeNote,
        ...templateData,
      }),
    });
  },

  /** Refresh templates periodically. See {@link pollForUpdates} — not realtime. */
  subscribeToUserTemplates(
    _userEmail: string,
    callback: (response: unknown) => void,
  ) {
    return pollForUpdates(() => callback(undefined));
  },

  async getVersions(
    templateId: string,
  ): Promise<{ total: number; documents: TemplateVersion[] }> {
    const params = new URLSearchParams({ templateId });
    return apiRequest(`/api/appwrite/templates/versions?${params.toString()}`);
  },

  async restoreVersion(
    templateId: string,
    versionId: string,
  ): Promise<EmailTemplate> {
    return apiRequest("/api/appwrite/templates/versions", {
      method: "POST",
      body: JSON.stringify({ templateId, versionId, action: "restore" }),
    });
  },
};
