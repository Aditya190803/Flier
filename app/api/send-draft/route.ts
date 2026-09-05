import { type NextRequest, NextResponse } from "next/server";

import { isAuthed, requireSession } from "@/lib/api-auth";
import { databases, config } from "@/lib/appwrite-server";
import {
  sendEmailViaAPI,
  replacePlaceholders,
  preResolveAttachments,
  clearAttachmentCache,
  preBuildEmailTemplate,
  sendEmailWithTemplate,
} from "@/lib/gmail";
import { apiLogger } from "@/lib/logger";

/**
 * API endpoint to send a draft email immediately
 */

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession(request, { accessToken: true });
    if (!isAuthed(auth)) {
      return auth;
    }

    const { draftId } = await request.json();

    if (!draftId) {
      return NextResponse.json({ error: "Missing draftId" }, { status: 400 });
    }

    // Get the draft
    const doc = await databases.getDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      draftId,
    );

    // Verify ownership
    if ((doc as any).user_email !== auth.email) {
      return NextResponse.json(
        { error: "Not authorized to send this draft" },
        { status: 403 },
      );
    }

    // Check if already sent or cancelled
    if ((doc as any).status !== "pending") {
      return NextResponse.json(
        { error: `Draft is already ${(doc as any).status}` },
        { status: 400 },
      );
    }

    // Parse recipients, attachments, and csv_data
    const recipients =
      typeof (doc as any).recipients === "string"
        ? JSON.parse((doc as any).recipients)
        : (doc as any).recipients || [];

    const attachments = (doc as any).attachments
      ? typeof (doc as any).attachments === "string"
        ? JSON.parse((doc as any).attachments)
        : (doc as any).attachments
      : [];

    // Parse csv_data for personalization
    let csvData: Record<string, string>[] = [];
    if ((doc as any).csv_data) {
      try {
        csvData =
          typeof (doc as any).csv_data === "string"
            ? JSON.parse((doc as any).csv_data)
            : (doc as any).csv_data;
      } catch (e) {
        apiLogger.error(
          "Error parsing csv_data",
          e instanceof Error ? e : undefined,
        );
      }
    }

    // Check if we have personalization (placeholders in subject or content)
    const hasPlaceholders =
      /\{\{?\w+\}?\}/.test((doc as any).subject) ||
      /\{\{?\w+\}?\}/.test((doc as any).content);

    // Drafts store both lists in attribute `cc` as {"cc":[],"bcc":[]} (Appwrite attr limit)
    const parseCcBcc = (value: unknown): { cc: string[]; bcc: string[] } => {
      const asStrings = (v: unknown) =>
        Array.isArray(v)
          ? v.filter(
              (x): x is string => typeof x === "string" && x.trim().length > 0,
            )
          : [];
      if (!value) {
        return { cc: [], bcc: [] };
      }
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            return { cc: asStrings(parsed), bcc: [] };
          }
          if (parsed && typeof parsed === "object") {
            return {
              cc: asStrings((parsed as { cc?: unknown }).cc),
              bcc: asStrings((parsed as { bcc?: unknown }).bcc),
            };
          }
        } catch {
          return { cc: [], bcc: [] };
        }
      }
      if (Array.isArray(value)) {
        return { cc: asStrings(value), bcc: [] };
      }
      return { cc: [], bcc: [] };
    };
    const { cc: ccList, bcc: bccList } = parseCcBcc((doc as any).cc);

    // Update status to sending
    await databases.updateDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      draftId,
      {
        status: "sending",
      },
    );

    const results: { email: string; status: string; error?: string }[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Pre-resolve attachments ONCE before the send loop
    let resolvedAttachments: any[] = [];
    if (attachments && attachments.length > 0) {
      apiLogger.debug(`Pre-resolving attachments before sending draft`, {
        count: attachments.length,
      });
      try {
        const attachmentData = attachments.map((a: any) => ({
          name: a.fileName,
          type: "application/octet-stream",
          data: "appwrite",
          appwriteUrl: a.fileUrl,
          appwriteFileId: a.appwrite_file_id,
        }));
        resolvedAttachments = await preResolveAttachments(attachmentData);
        apiLogger.debug(`Draft attachments pre-resolved successfully`);
      } catch (error) {
        apiLogger.error(
          "Failed to pre-resolve draft attachments",
          error instanceof Error ? error : undefined,
        );
        // Update status back to pending so user can retry
        await databases.updateDocument(
          config.databaseId,
          config.draftEmailsCollectionId,
          draftId,
          {
            status: "pending",
            error: "Failed to process attachments",
          },
        );
        return NextResponse.json(
          {
            error: "Failed to process attachments",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    }

    // Use optimized template-based sending if no personalization needed
    if (!hasPlaceholders && recipients.length > 1) {
      apiLogger.info(`Using optimized template-based bulk sending`, {
        recipientCount: recipients.length,
      });

      try {
        // Pre-build the email template ONCE
        await preBuildEmailTemplate(
          auth.email!,
          (doc as any).subject,
          (doc as any).content,
          resolvedAttachments,
        );

        // Send to each recipient using the cached template (FAST)
        for (let i = 0; i < recipients.length; i++) {
          const recipientEmail = recipients[i];

          try {
            await sendEmailWithTemplate(
              auth.accessToken,
              recipientEmail,
              undefined,
              ccList,
              bccList,
            );
            results.push({ email: recipientEmail, status: "success" });
            successCount++;
            apiLogger.debug(`Sent email`, {
              index: i + 1,
              total: recipients.length,
              to: recipientEmail,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            results.push({
              email: recipientEmail,
              status: "error",
              error: errorMessage,
            });
            failedCount++;
          }

          // Wait between emails to avoid rate limiting
          if (i < recipients.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        apiLogger.error(
          "Failed to build email template",
          error instanceof Error ? error : undefined,
        );
        await databases.updateDocument(
          config.databaseId,
          config.draftEmailsCollectionId,
          draftId,
          {
            status: "pending",
            error: "Failed to build email template",
          },
        );
        return NextResponse.json(
          {
            error: "Failed to build email template",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    } else {
      // Personalized sending mode (slower but necessary for placeholders)
      apiLogger.info(`Using personalized sending mode`, { hasPlaceholders });

      // Send emails with personalization
      for (let i = 0; i < recipients.length; i++) {
        const recipientEmail = recipients[i];

        // Get personalization data for this recipient (case-insensitive matching)
        let recipientData: Record<string, string> = { email: recipientEmail };
        const csvRow = csvData.find((row: Record<string, string>) => {
          const rowEmail = row.email || row.Email || row.EMAIL || "";
          return rowEmail.toLowerCase() === recipientEmail.toLowerCase();
        });
        if (csvRow) {
          // Normalize keys to lowercase for consistent placeholder matching
          recipientData = Object.entries(csvRow).reduce(
            (acc, [key, value]) => {
              acc[key.toLowerCase()] = String(value);
              acc[key] = String(value); // Keep original case too
              return acc;
            },
            {} as Record<string, string>,
          );
        }

        // Personalize subject and content
        const personalizedSubject = replacePlaceholders(
          (doc as any).subject,
          recipientData,
        );
        const personalizedContent = replacePlaceholders(
          (doc as any).content,
          recipientData,
        );

        try {
          await sendEmailViaAPI(
            auth.accessToken,
            auth.email!,
            recipientEmail,
            personalizedSubject,
            personalizedContent,
            resolvedAttachments, // Use pre-resolved attachments
            undefined,
            undefined,
            ccList,
            bccList,
          );

          results.push({ email: recipientEmail, status: "success" });
          successCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          results.push({
            email: recipientEmail,
            status: "error",
            error: errorMessage,
          });
          failedCount++;
        }

        // Wait between emails to avoid rate limiting
        if (i < recipients.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // Update final status
    const finalStatus = failedCount === recipients.length ? "failed" : "sent";
    await databases.updateDocument(
      config.databaseId,
      config.draftEmailsCollectionId,
      draftId,
      {
        status: finalStatus,
        sent_at: new Date().toISOString(),
        error:
          failedCount > 0
            ? `${failedCount} of ${recipients.length} emails failed`
            : null,
      },
    );

    // Clear attachment cache after sending
    clearAttachmentCache();

    // Also save to campaigns collection for history
    await databases.createDocument(
      config.databaseId,
      config.campaignsCollectionId,
      crypto.randomUUID(),
      {
        subject: (doc as any).subject,
        content: (doc as any).content,
        recipients: JSON.stringify(recipients),
        sent: successCount,
        failed: failedCount,
        status: "completed",
        user_email: auth.email,
        campaign_type: "draft",
        attachments: (doc as any).attachments,
        send_results: JSON.stringify(results),
        created_at: new Date().toISOString(),
      },
    );

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: recipients.length,
        sent: successCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    apiLogger.error(
      "Send draft error",
      error instanceof Error ? error : undefined,
    );
    return NextResponse.json(
      { error: "Failed to send draft" },
      { status: 500 },
    );
  }
}
