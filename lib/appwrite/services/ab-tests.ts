import type { ABTest } from "@/types/appwrite-client";

import { apiRequest } from "../api-request";
import { pollForUpdates } from "../poll";
import { createCrudService } from "../service-factory";

// ============================================
// A/B Tests Service (via API)
// ============================================

const abTestsCrudService = createCrudService<
  ABTest,
  Omit<
    ABTest,
    | "$id"
    | "created_at"
    | "variant_a_sent"
    | "variant_b_sent"
    | "variant_a_opens"
    | "variant_b_opens"
    | "variant_a_clicks"
    | "variant_b_clicks"
  >,
  Partial<ABTest>
>("ab-tests");

export const abTestsService = {
  ...abTestsCrudService,

  async getById(testId: string): Promise<ABTest | null> {
    try {
      return await abTestsCrudService.get(testId);
    } catch {
      return null;
    }
  },

  async updateStats(
    testId: string,
    variant: "A" | "B",
    stats: { sent?: number; opens?: number; clicks?: number },
  ) {
    const updates: Record<string, number> = {};
    const prefix = variant === "A" ? "variant_a" : "variant_b";

    if (stats.sent !== undefined) {
      updates[`${prefix}_sent`] = stats.sent;
    }
    if (stats.opens !== undefined) {
      updates[`${prefix}_opens`] = stats.opens;
    }
    if (stats.clicks !== undefined) {
      updates[`${prefix}_clicks`] = stats.clicks;
    }

    return this.update(testId, updates as Partial<ABTest>);
  },

  async complete(testId: string) {
    return apiRequest<ABTest>("/api/appwrite/ab-tests", {
      method: "PUT",
      body: JSON.stringify({ id: testId, complete: true }),
    });
  },

  /** Refresh A/B tests periodically. See {@link pollForUpdates} — not realtime. */
  subscribeToUserTests(
    _userEmail: string,
    callback: (response: unknown) => void,
  ) {
    return pollForUpdates(() => callback(undefined));
  },
};
