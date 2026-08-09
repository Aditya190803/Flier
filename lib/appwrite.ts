/**
 * Client-side Appwrite service that uses API routes
 * This solves the authentication issue since NextAuth doesn't create Appwrite sessions.
 * All database operations go through server-side API routes that use the Appwrite API key.
 */

// Re-export specific services from their domain files
export {
  contactsService,
  contactGroupsService,
  unsubscribesService,
} from "./appwrite/services/contacts";
export { campaignsService } from "./appwrite/services/campaigns";
export { templatesService } from "./appwrite/services/templates";
export { apiRequest } from "./appwrite/api-request";
export { draftEmailsService } from "./appwrite/services/drafts";
export { signaturesService } from "./appwrite/services/signatures";
export { webhooksService } from "./appwrite/services/webhooks";
export { abTestsService } from "./appwrite/services/ab-tests";
export { storageService } from "./appwrite/services/storage";
export { gdprService, auditLogsService } from "./appwrite/services/gdpr";
export { teamsService, teamMembersService } from "./appwrite/services/teams";

export type {
  Contact,
  EmailCampaignInput,
  EmailCampaign,
  EmailTemplate,
  TemplateVersion,
  ContactGroup,
  DraftEmail,
  EmailSignature,
  Unsubscribe,
  Webhook,
  ABTest,
} from "@/types/appwrite-client";

// ============================================
// Legacy exports for compatibility
// ============================================

// Re-export ID for components that use it
export const ID = {
  unique: () =>
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15),
};

// Query export for backward compatibility (not used with API routes)
export const Query = {
  equal: (field: string, value: string) => ({ field, value }),
  limit: (n: number) => ({ limit: n }),
  offset: (n: number) => ({ offset: n }),
  orderDesc: (field: string) => ({ orderDesc: field }),
  orderAsc: (field: string) => ({ orderAsc: field }),
};

// Test connection function (just returns success since we're using API routes)
export const testAppwriteConnection = async (): Promise<{
  success: boolean;
  message: string;
  projectId?: string;
  error?: string;
}> => {
  return {
    success: true,
    message: "Using API routes for Appwrite operations",
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "via-api",
  };
};

// Config export for components that need collection IDs (though they shouldn't need them anymore)
export const config = {
  databaseId: "via-api",
  contactsCollectionId: "via-api",
  campaignsCollectionId: "via-api",
  templatesCollectionId: "via-api",
  contactGroupsCollectionId: "via-api",
};

export const getCollectionIds = () => config;
export const getBucketId = () => "via-api";

// Databases export for any direct usage (should be avoided)
export const databases = {
  listDocuments: async () => {
    throw new Error("Use service functions instead of direct database access");
  },
  createDocument: async () => {
    throw new Error("Use service functions instead of direct database access");
  },
  updateDocument: async () => {
    throw new Error("Use service functions instead of direct database access");
  },
  deleteDocument: async () => {
    throw new Error("Use service functions instead of direct database access");
  },
};
