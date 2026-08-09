import { Client, Databases, Storage, Query, ID } from "node-appwrite";

import { env } from "@/lib/env";
import type { AttachmentData, EmailResult } from "@/types/campaign";

// Server-side Appwrite configuration - lazy loaded to avoid build-time errors
const getAppwriteConfig = () => ({
  endpoint: env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
  projectId: env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  apiKey: env.APPWRITE_API_KEY,
  databaseId: env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
  contactsCollectionId: env.NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID,
  campaignsCollectionId: env.NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID,
  templatesCollectionId: env.NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID,
  templateVersionsCollectionId:
    env.NEXT_PUBLIC_APPWRITE_TEMPLATE_VERSIONS_COLLECTION_ID,
  contactGroupsCollectionId:
    env.NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID,
  attachmentsBucketId: env.NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID,
  // Additional feature collections
  draftEmailsCollectionId: env.NEXT_PUBLIC_APPWRITE_DRAFT_EMAILS_COLLECTION_ID,
  signaturesCollectionId: env.NEXT_PUBLIC_APPWRITE_SIGNATURES_COLLECTION_ID,
  unsubscribesCollectionId: env.NEXT_PUBLIC_APPWRITE_UNSUBSCRIBES_COLLECTION_ID,
  webhooksCollectionId: env.NEXT_PUBLIC_APPWRITE_WEBHOOKS_COLLECTION_ID,
  trackingEventsCollectionId:
    env.NEXT_PUBLIC_APPWRITE_TRACKING_EVENTS_COLLECTION_ID,
  abTestsCollectionId: env.NEXT_PUBLIC_APPWRITE_AB_TESTS_COLLECTION_ID,
  // GDPR & Compliance collections
  auditLogsCollectionId: env.NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION_ID,
  consentsCollectionId: env.NEXT_PUBLIC_APPWRITE_CONSENTS_COLLECTION_ID,
  // Team/Organization collections
  teamsCollectionId: env.NEXT_PUBLIC_APPWRITE_TEAMS_COLLECTION_ID,
  teamMembersCollectionId: env.NEXT_PUBLIC_APPWRITE_TEAM_MEMBERS_COLLECTION_ID,
});

// Lazy initialization for client and services
let _client: Client | null = null;
let _databases: Databases | null = null;
let _storage: Storage | null = null;
let _config: ReturnType<typeof getAppwriteConfig> | null = null;

const getClient = () => {
  if (!_client) {
    const cfg = getAppwriteConfig();
    _client = new Client()
      .setEndpoint(cfg.endpoint)
      .setProject(cfg.projectId)
      .setKey(cfg.apiKey);
  }
  return _client;
};

// Export lazy-loaded services
export const databases = new Proxy({} as Databases, {
  get(_, prop) {
    if (!_databases) {
      _databases = new Databases(getClient());
    }
    return (_databases as any)[prop];
  },
});

export const storage = new Proxy({} as Storage, {
  get(_, prop) {
    if (!_storage) {
      _storage = new Storage(getClient());
    }
    return (_storage as any)[prop];
  },
});

// Export config getter and helpers
export const config = new Proxy({} as ReturnType<typeof getAppwriteConfig>, {
  get(_, prop) {
    if (!_config) {
      _config = getAppwriteConfig();
    }
    return (_config as any)[prop];
  },
});
export { Query, ID };

// ============================================
// Server-side Storage Operations
// ============================================

export const serverStorageService = {
  // Upload a file from buffer (server-side)
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    fileType: string,
    userEmail: string,
  ): Promise<{
    url: string;
    fileId: string;
    fileName: string;
    fileSize: number;
  }> {
    const _sanitizedEmail = userEmail
      .replace("@", "_at_")
      .replace(/[^a-zA-Z0-9_]/g, "_");
    const uniqueId = ID.unique();

    // For node-appwrite, we need to use InputFile
    const { InputFile } = await import("node-appwrite/file");
    const inputFile = InputFile.fromBuffer(buffer, fileName);

    const result = await storage.createFile(
      config.attachmentsBucketId,
      uniqueId,
      inputFile,
    );

    // Build the file URL
    const fileUrl = `${config.endpoint}/storage/buckets/${config.attachmentsBucketId}/files/${result.$id}/view?project=${config.projectId}`;

    return {
      fileId: result.$id,
      fileName: fileName,
      fileSize: buffer.length,
      url: fileUrl,
    };
  },

  // Get file as buffer for email attachment
  async getFileBuffer(fileId: string): Promise<Buffer> {
    const result = await storage.getFileDownload(
      config.attachmentsBucketId,
      fileId,
    );
    // result is an ArrayBuffer
    return Buffer.from(result);
  },

  // Get file view URL
  getFileUrl(fileId: string): string {
    return `${config.endpoint}/storage/buckets/${config.attachmentsBucketId}/files/${fileId}/view?project=${config.projectId}`;
  },

  // Delete a file
  async deleteFile(fileId: string) {
    return storage.deleteFile(config.attachmentsBucketId, fileId);
  },
};

// ============================================
// Server-side Campaign Operations
// ============================================

export const serverCampaignsService = {
  // Create a new campaign
  async create(campaign: {
    subject: string;
    content: string;
    recipients: string[];
    sent: number;
    failed: number;
    status: "completed" | "sending" | "failed";
    user_email: string;
    campaign_type?: string;
    attachments?: AttachmentData[];
    send_results?: EmailResult[];
  }) {
    return databases.createDocument(
      config.databaseId,
      config.campaignsCollectionId,
      ID.unique(),
      {
        ...campaign,
        recipients: JSON.stringify(campaign.recipients),
        attachments: campaign.attachments
          ? JSON.stringify(campaign.attachments)
          : null,
        send_results: campaign.send_results
          ? JSON.stringify(campaign.send_results)
          : null,
        created_at: new Date().toISOString(),
      },
    );
  },
};

// Export the client getter for cases that need direct access
export const getAppwriteClient = getClient;
