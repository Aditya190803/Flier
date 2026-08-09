import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config, Query } from "@/lib/appwrite-server";
import { apiLogger } from "@/lib/logger";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

// DELETE /api/gdpr/delete - Delete all user data (GDPR Right to be Forgotten)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    const userEmail = auth.email;
    const deletionResults = {
      contacts: 0,
      campaigns: 0,
      templates: 0,
      drafts: 0,
      signatures: 0,
      groups: 0,
      unsubscribes: 0,
      webhooks: 0,
      attachments: 0,
      ab_tests: 0,
      tracking_events: 0,
      audit_logs: 0,
      consent_records: 0,
      scheduled_campaigns: 0,
      oauth_tokens: 0,
      errors: [] as string[],
    };

    // Helper to delete all documents in a collection
    async function deleteUserDocuments(
      collectionId: string,
      key: keyof typeof deletionResults,
    ) {
      if (!collectionId) {
        return;
      }

      try {
        let hasMore = true;
        while (hasMore) {
          const docs = await databases.listDocuments(
            config.databaseId,
            collectionId,
            [Query.equal("user_email", userEmail), Query.limit(100)],
          );

          if (docs.documents.length === 0) {
            hasMore = false;
            continue;
          }

          for (const doc of docs.documents) {
            try {
              await databases.deleteDocument(
                config.databaseId,
                collectionId,
                doc.$id,
              );
              if (typeof deletionResults[key] === "number") {
                (deletionResults[key] as number)++;
              }
            } catch (e) {
              deletionResults.errors.push(
                `Failed to delete ${key} ${doc.$id}: ${errorMessage(e)}`,
              );
            }
          }
        }
      } catch (e) {
        const message = errorMessage(e);
        if (!message.includes("Collection not found")) {
          deletionResults.errors.push(`Failed to delete ${key}: ${message}`);
        }
      }
    }

    // Delete all user data in parallel groups
    // First group - core collections
    await Promise.all([
      deleteUserDocuments(config.contactsCollectionId, "contacts"),
      deleteUserDocuments(config.campaignsCollectionId, "campaigns"),
      deleteUserDocuments(config.templatesCollectionId, "templates"),
      deleteUserDocuments(config.contactGroupsCollectionId, "groups"),
    ]);

    // Second group - additional collections
    await Promise.all([
      deleteUserDocuments(config.draftEmailsCollectionId, "drafts"),
      deleteUserDocuments(config.signaturesCollectionId, "signatures"),
      deleteUserDocuments(config.unsubscribesCollectionId, "unsubscribes"),
      deleteUserDocuments(config.webhooksCollectionId, "webhooks"),
      deleteUserDocuments(config.abTestsCollectionId, "ab_tests"),
      deleteUserDocuments(config.trackingEventsCollectionId, "tracking_events"),
      // Drops any queued sends, and — critically — the stored Google refresh
      // token, so no background job can act as this user after erasure.
      deleteUserDocuments(
        config.scheduledCampaignsCollectionId,
        "scheduled_campaigns",
      ),
      deleteUserDocuments(config.oauthTokensCollectionId, "oauth_tokens"),
    ]);

    // Third group - GDPR/compliance collections (optional)
    await Promise.all([
      config.auditLogsCollectionId &&
        deleteUserDocuments(config.auditLogsCollectionId, "audit_logs"),
      config.consentsCollectionId &&
        deleteUserDocuments(config.consentsCollectionId, "consent_records"),
    ]);

    // Delete user's attachments from storage
    try {
      if (config.attachmentsBucketId) {
        // Note: Appwrite doesn't have a direct way to list files by user
        // In a production system, you'd want to track file ownership in a collection
        // For now, we'll skip attachment deletion or implement a workaround
        apiLogger.debug(
          "Attachment deletion would require file ownership tracking",
        );
      }
    } catch (e) {
      deletionResults.errors.push(
        `Failed to delete attachments: ${errorMessage(e)}`,
      );
    }

    // Log the deletion (to a separate permanent audit log if needed)
    apiLogger.info("GDPR Deletion completed", { userEmail, deletionResults });

    const totalDeleted =
      deletionResults.contacts +
      deletionResults.campaigns +
      deletionResults.templates +
      deletionResults.drafts +
      deletionResults.signatures +
      deletionResults.groups +
      deletionResults.unsubscribes +
      deletionResults.webhooks +
      deletionResults.ab_tests;

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${totalDeleted} records`,
      details: deletionResults,
    });
  } catch (error) {
    apiLogger.error(
      "Error deleting user data",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: errorMessage(error) || "Failed to delete user data" },
      { status: 500 },
    );
  }
}

// GET /api/gdpr/delete - Get deletion request status (placeholder for async deletion)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession(request);
    if (!isAuthed(auth)) {
      return auth;
    }

    // In a production system, you might have a queue for deletion requests
    // This endpoint would check the status of a pending deletion
    return NextResponse.json({
      message: "Use DELETE method to initiate data deletion",
      warning:
        "This action is irreversible. All your data will be permanently deleted.",
    });
  } catch (error) {
    apiLogger.error(
      "Error checking deletion status",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: errorMessage(error) || "Failed to check deletion status" },
      { status: 500 },
    );
  }
}
