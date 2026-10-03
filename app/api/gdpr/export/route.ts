import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { exportCampaignAccountData } from "@/lib/services/campaign-account-data";
import { apiLogger } from "@/lib/logger";
import type { GDPRDataExport } from "@/types/gdpr";

import type { Models } from "appwrite";

// Minimal shapes for the fields this export route actually reads off each
// collection's documents (the canonical types in @/types/appwrite model a
// slightly different, normalized schema).
interface ExportContactDoc extends Models.Document {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  created_at?: string;
}

interface ExportCampaignDoc extends Models.Document {
  subject?: string;
  recipients?: string | unknown[];
  sent?: number;
  failed?: number;
  status?: string;
  created_at?: string;
}

interface ExportTemplateDoc extends Models.Document {
  name?: string;
  subject?: string;
  category?: string;
  created_at?: string;
}

interface ExportDraftDoc extends Models.Document {
  subject?: string;
  recipients?: string | unknown[];
  created_at?: string;
}

interface ExportSignatureDoc extends Models.Document {
  name?: string;
  is_default?: boolean;
  created_at?: string;
}

interface ConsentRecordDocument extends Models.Document {
  consent_type: string;
  granted: boolean;
  granted_at?: string;
  revoked_at?: string;
}

interface TrackingEventDocument extends Models.Document {
  event_type: string;
  campaign_id: string;
  recipient_email: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

// GET /api/gdpr/export - Export all user data (GDPR compliant)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const userEmail = auth.email;
    const userName = auth.name || undefined;

    // Gather all user data from different collections
    const [contacts, campaigns, templates, drafts, signatures, _groups, trackingEvents] =
      await Promise.all([
        // Contacts
        databases
          .listDocuments(config.databaseId, config.contactsCollectionId, [
            Query.equal("user_email", userEmail),
            Query.limit(5000),
          ])
          .catch(() => ({ documents: [] })),

        // Campaigns
        databases
          .listDocuments(config.databaseId, config.campaignsCollectionId, [
            Query.equal("user_email", userEmail),
            Query.limit(5000),
          ])
          .catch(() => ({ documents: [] })),

        // Templates
        databases
          .listDocuments(config.databaseId, config.templatesCollectionId, [
            Query.equal("user_email", userEmail),
            Query.limit(5000),
          ])
          .catch(() => ({ documents: [] })),

        // Drafts
        config.draftEmailsCollectionId
          ? databases
              .listDocuments(config.databaseId, config.draftEmailsCollectionId, [
                Query.equal("user_email", userEmail),
                Query.limit(5000),
              ])
              .catch(() => ({ documents: [] }))
          : { documents: [] },

        // Signatures
        config.signaturesCollectionId
          ? databases
              .listDocuments(config.databaseId, config.signaturesCollectionId, [
                Query.equal("user_email", userEmail),
                Query.limit(5000),
              ])
              .catch(() => ({ documents: [] }))
          : { documents: [] },

        // Contact Groups
        databases
          .listDocuments(config.databaseId, config.contactGroupsCollectionId, [
            Query.equal("user_email", userEmail),
            Query.limit(5000),
          ])
          .catch(() => ({ documents: [] })),

        // Tracking Events
        config.trackingEventsCollectionId
          ? databases
              .listDocuments(config.databaseId, config.trackingEventsCollectionId, [
                Query.equal("user_email", userEmail),
                Query.limit(5000),
              ])
              .catch(() => ({ documents: [] }))
          : { documents: [] },
      ]);

    // Get consent records if available
    let consentRecords: ConsentRecordDocument[] = [];
    if (config.consentsCollectionId) {
      try {
        const result = await databases.listDocuments(
          config.databaseId,
          config.consentsCollectionId,
          [Query.equal("user_email", userEmail), Query.limit(100)],
        );
        consentRecords = result.documents as unknown as ConsentRecordDocument[];
      } catch {
        // Ignore if collection doesn't exist
      }
    }

    // Build the GDPR export
    const exportData: GDPRDataExport = {
      export_date: new Date().toISOString(),
      user_email: userEmail,
      user_name: userName,
      data: {
        campaign_workspace: await exportCampaignAccountData(userEmail),
        profile: {
          email: userEmail,
          name: userName,
        },
        contacts: (contacts.documents as ExportContactDoc[]).map((doc) => ({
          email: doc.email,
          name: doc.name,
          company: doc.company,
          phone: doc.phone,
          created_at: doc.created_at || doc.$createdAt,
        })),
        campaigns: (campaigns.documents as ExportCampaignDoc[]).map((doc) => {
          const recipients =
            typeof doc.recipients === "string" ? JSON.parse(doc.recipients) : doc.recipients;
          return {
            subject: doc.subject || "",
            recipients_count: recipients?.length || 0,
            sent: doc.sent || 0,
            failed: doc.failed || 0,
            status: doc.status || "",
            created_at: doc.created_at || doc.$createdAt,
          };
        }),
        templates: (templates.documents as ExportTemplateDoc[]).map((doc) => ({
          name: doc.name || "",
          subject: doc.subject || "",
          category: doc.category,
          created_at: doc.created_at || doc.$createdAt,
        })),
        drafts: (drafts.documents as ExportDraftDoc[]).map((doc) => {
          const recipients =
            typeof doc.recipients === "string" ? JSON.parse(doc.recipients) : doc.recipients;
          return {
            subject: doc.subject || "",
            recipients_count: recipients?.length || 0,
            created_at: doc.created_at || doc.$createdAt,
          };
        }),
        signatures: (signatures.documents as ExportSignatureDoc[]).map((doc) => ({
          name: doc.name || "",
          is_default: doc.is_default || false,
          created_at: doc.created_at || doc.$createdAt,
        })),
        consent_records: consentRecords.map((doc) => ({
          consent_type: doc.consent_type,
          granted: doc.granted,
          granted_at: doc.granted_at,
          revoked_at: doc.revoked_at,
        })),
        tracking_events: (trackingEvents.documents as TrackingEventDocument[]).map((doc) => ({
          event_type: doc.event_type,
          campaign_id: doc.campaign_id,
          recipient_email: doc.recipient_email,
          ip_address: doc.ip_address,
          user_agent: doc.user_agent,
          created_at: doc.created_at || doc.$createdAt,
        })),
      },
    };

    // Log the export action
    if (config.auditLogsCollectionId) {
      try {
        const ipAddress =
          request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
        await databases.createDocument(
          config.databaseId,
          config.auditLogsCollectionId,
          ID.unique(),
          {
            user_email: userEmail,
            action: "gdpr.export_complete",
            resource_type: "export",
            details: JSON.stringify({
              contacts_count: contacts.documents.length,
              campaigns_count: campaigns.documents.length,
              templates_count: templates.documents.length,
            }),
            ip_address: ipAddress,
            user_agent: request.headers.get("user-agent") || "unknown",
            created_at: new Date().toISOString(),
          },
        );
      } catch (e) {
        apiLogger.warn("Failed to log export audit event", { error: e });
      }
    }

    // Return the export as a downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="flier-data-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    apiLogger.error("Error exporting user data", error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        error: (error instanceof Error ? error.message : undefined) || "Failed to export user data",
      },
      { status: 500 },
    );
  }
}
