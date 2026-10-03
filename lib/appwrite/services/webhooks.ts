import { clientLogger } from "@/lib/client-logger";
import type { Webhook } from "@/types/appwrite-client";

import { apiRequest } from "../api-request";
import { createCrudService } from "../service-factory";

// ============================================
// Webhooks Service (via API)
// ============================================

const webhooksCrudService = createCrudService<
  Webhook,
  Omit<Webhook, "$id" | "created_at" | "updated_at" | "last_triggered_at">,
  Partial<Omit<Webhook, "$id" | "user_email" | "created_at">>
>("webhooks");

export const webhooksService = {
  ...webhooksCrudService,

  async updateLastTriggered(webhookId: string) {
    return apiRequest<Webhook>("/api/appwrite/webhooks", {
      method: "PUT",
      body: JSON.stringify({ id: webhookId, updateLastTriggered: true }),
    });
  },

  // Trigger webhooks is a server-side operation - not exposed here
  async triggerWebhooks(_userEmail: string, _event: Webhook["events"][number], _payload: any) {
    clientLogger.warn("triggerWebhooks should be called server-side");
    return [];
  },
};
