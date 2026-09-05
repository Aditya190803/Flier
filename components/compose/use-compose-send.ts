"use client";

import { useState } from "react";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { toast } from "sonner";

import type { useEmailSend } from "@/hooks/useEmailSend";
import { generateCampaignId } from "@/lib/analytics";
import {
  campaignsService,
  draftEmailsService,
  unsubscribesService,
  type EmailSignature,
} from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";
import { parseEmailList } from "@/lib/email/parse-list";
import { getBrowserTimeZone, validateScheduleValue } from "@/lib/schedule";
import { scheduledCampaignsService } from "@/lib/services/scheduled-campaigns-client";
import { isValidEmail } from "@/lib/validation";
import type { CSVRow } from "@/types/email";

import { ensureAppwriteAttachment } from "./attachment-upload";
import {
  buildPersonalizedEmails,
  buildRecipientFields,
} from "./recipient-data";

import type { ComposeAttachment, Contact } from "./compose-types";
import type { DeliveryMode } from "./delivery-options";

interface UseComposeSendArgs {
  router: AppRouterInstance;
  session: { user?: { email?: string | null } | null } | null | undefined;
  subject: string;
  content: string;
  cc: string;
  bcc: string;
  recipients: string[];
  attachments: ComposeAttachment[];
  csvData: CSVRow[];
  manualEntries: { email: string; name: string }[];
  contacts: Contact[];
  isMarketing: boolean;
  trackingEnabled: boolean;
  selectedSignature: string | null;
  signatures: EmailSignature[];
  deliveryMode: DeliveryMode;
  /** `datetime-local` value; only read when `deliveryMode` is "schedule" */
  scheduledAt: string;
  editingDraftId: string | null;
  pdfColumn: string | null;
  showPersonalizedAttachments: boolean;
  sendEmails: ReturnType<typeof useEmailSend>["sendEmails"];
  clearDraft: () => void;
  setIsSavingDraft: (value: boolean) => void;
}

/**
 * Orchestrates the final dispatch action for all three delivery modes:
 * validation, unsubscribe filtering, signature appending, then either
 * sending immediately via `useEmailSend`, queuing the campaign for a future
 * send, or saving it as a draft.
 *
 * Scheduling and drafting share a requirement the immediate path doesn't
 * have: attachments must already live in Appwrite, because the bytes are read
 * back later without the composer in memory.
 */
export function useComposeSend({
  router,
  session,
  subject,
  content,
  cc,
  bcc,
  recipients,
  attachments,
  csvData,
  manualEntries,
  contacts,
  isMarketing,
  trackingEnabled,
  selectedSignature,
  signatures,
  deliveryMode,
  scheduledAt,
  editingDraftId,
  pdfColumn,
  showPersonalizedAttachments,
  sendEmails,
  clearDraft,
  setIsSavingDraft,
}: UseComposeSendArgs) {
  const [isPreparingSend, setIsPreparingSend] = useState(false);
  const [showSendingDialog, setShowSendingDialog] = useState(false);

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    if (!content.trim()) {
      toast.error("Please enter email content");
      return;
    }

    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    const ccList = parseEmailList(cc);
    const bccList = parseEmailList(bcc);
    if (ccList.length > 50 || bccList.length > 50) {
      toast.error("Cc and Bcc can each contain at most 50 addresses");
      return;
    }
    const bad = [...ccList, ...bccList].filter((e) => !isValidEmail(e));
    if (bad.length) {
      toast.error(`Invalid Cc/Bcc address: ${bad[0]}`);
      return;
    }

    // Reject an unusable send time before doing any of the expensive work.
    if (deliveryMode === "schedule") {
      const scheduleCheck = validateScheduleValue(scheduledAt);
      if (!scheduleCheck.valid) {
        toast.error(scheduleCheck.error || "Pick a valid send time");
        return;
      }
    }

    // Immediately show preparing state to prevent double-clicks
    setIsPreparingSend(true);

    // Filter out unsubscribed emails - only for marketing emails, not transactional
    let filteredRecipients = recipients;
    if (isMarketing && session?.user?.email) {
      try {
        filteredRecipients = await unsubscribesService.filterUnsubscribed(
          session.user.email,
          recipients,
        );
        if (filteredRecipients.length < recipients.length) {
          const skipped = recipients.length - filteredRecipients.length;
          toast.info(`${skipped} unsubscribed email(s) will be skipped`);
        }
      } catch (error) {
        componentLogger.error(
          "Error filtering unsubscribes",
          error instanceof Error ? error : undefined,
        );
      }
    }

    if (filteredRecipients.length === 0) {
      toast.warning("All recipients have unsubscribed from marketing emails");
      setIsPreparingSend(false);
      return;
    }

    // Append signature if selected
    let finalContent = content;
    if (selectedSignature) {
      const signature = signatures.find((s) => s.$id === selectedSignature);
      if (signature) {
        finalContent = `${content}<br/><br/>${signature.content}`;
      }
    }

    // Handle scheduling for a future send
    if (deliveryMode === "schedule" && session?.user?.email) {
      const scheduleCheck = validateScheduleValue(scheduledAt);
      if (!scheduleCheck.valid || !scheduleCheck.date) {
        toast.error(scheduleCheck.error || "Pick a valid send time");
        setIsPreparingSend(false);
        return;
      }

      try {
        // The worker reads attachments from Appwrite storage, so anything
        // still held as inline base64 has to be uploaded first.
        const processedAttachments = await Promise.all(
          attachments.map((a) => ensureAppwriteAttachment(a)),
        );

        const recipientCsvData = filteredRecipients.map((recipientEmail) =>
          buildRecipientFields({
            email: recipientEmail,
            csvData,
            manualEntries,
            contacts,
          }),
        );

        await scheduledCampaignsService.create({
          subject,
          content: finalContent,
          recipients: filteredRecipients,
          scheduled_at: scheduleCheck.date.toISOString(),
          timezone: getBrowserTimeZone(),
          attachments: processedAttachments.filter((a) => a.appwrite_file_id),
          csv_data: recipientCsvData,
          cc: ccList,
          bcc: bccList,
          tracking_enabled: trackingEnabled,
          is_marketing: isMarketing,
          has_personalized_attachments:
            !!pdfColumn && showPersonalizedAttachments,
          personalized_attachment_column: pdfColumn || undefined,
        });

        clearDraft();
        toast.success(
          `Campaign scheduled for ${scheduleCheck.date.toLocaleString()}`,
        );
        router.push("/scheduled");
        return;
      } catch (error) {
        componentLogger.error(
          "Error scheduling campaign",
          error instanceof Error ? error : undefined,
        );
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to schedule campaign",
        );
        return;
      } finally {
        setIsPreparingSend(false);
      }
    }

    // Handle saving as draft
    if (deliveryMode === "draft" && session?.user?.email) {
      // Use current time for draft save timestamp
      const savedAt = new Date().toISOString();

      setIsSavingDraft(true);
      try {
        const processedAttachments = await Promise.all(
          attachments.map((a) => ensureAppwriteAttachment(a)),
        );

        const recipientCsvData = filteredRecipients.map((recipientEmail) =>
          buildRecipientFields({
            email: recipientEmail,
            csvData,
            manualEntries,
            contacts,
          }),
        );

        const draftEmailData = {
          subject,
          content: finalContent,
          recipients: filteredRecipients,
          saved_at: savedAt,
          attachments: processedAttachments.filter((a) => a.appwrite_file_id), // Only save attachments that were uploaded
          csv_data: recipientCsvData,
          cc: ccList,
          bcc: bccList,
          // Save personalized attachment settings
          has_personalized_attachments:
            !!pdfColumn && showPersonalizedAttachments,
          personalized_attachment_column: pdfColumn || undefined,
        };

        if (editingDraftId) {
          // Update existing draft
          await draftEmailsService.update(editingDraftId, draftEmailData);
          clearDraft();
          toast.success("Draft updated");
        } else {
          // Create new draft
          await draftEmailsService.create(draftEmailData);
          clearDraft();
          toast.success("Draft saved — send it when you're ready!");
        }

        router.push("/draft");
        return;
      } catch (error) {
        componentLogger.error(
          "Error saving draft",
          error instanceof Error ? error : undefined,
        );
        toast.error("Failed to save draft");
        return;
      } finally {
        setIsSavingDraft(false);
        setIsPreparingSend(false);
      }
    }

    setShowSendingDialog(true);
    setIsPreparingSend(false); // Reset preparing state once sending dialog is shown

    const personalizedEmails = buildPersonalizedEmails({
      recipients: filteredRecipients,
      subject,
      content: finalContent,
      csvData,
      manualEntries,
      contacts,
      attachments,
      pdfColumn,
    });

    try {
      const campaignId = generateCampaignId();

      const results = await sendEmails(personalizedEmails, {
        campaignId,
        isTransactional: !isMarketing,
        trackingEnabled,
        ...(ccList.length ? { cc: ccList } : {}),
        ...(bccList.length ? { bcc: bccList } : {}),
      });

      const successCount = results.filter((r) => r.status === "success").length;
      const failCount = results.filter((r) => r.status === "error").length;

      // Save campaign to Appwrite (user_email is set server-side)
      if (session?.user?.email) {
        await campaignsService.create({
          id: campaignId,
          subject,
          content,
          recipients,
          sent: successCount,
          failed: failCount,
          // A campaign where nothing got through is a failure, not a
          // completion. Partial success still counts as completed — the
          // per-recipient breakdown lives in `send_results`.
          status: successCount === 0 && failCount > 0 ? "failed" : "completed",
          campaign_type: csvData.length > 0 ? "bulk" : "contact_list",
          attachments: attachments.map((a) => ({
            fileName: a.name,
            fileUrl: a.appwriteUrl || a.data,
            fileSize: a.fileSize || 0,
            appwrite_file_id: a.appwriteFileId,
          })),
          send_results: results.map((r) => ({
            email: r.email,
            status: r.status,
            error: r.error,
          })),
          // Save personalized attachment info
          has_personalized_attachments:
            !!pdfColumn && showPersonalizedAttachments,
          personalized_attachment_column: pdfColumn || undefined,
        });
      }

      // Clear draft after successful send
      clearDraft();

      toast.success(
        `Campaign complete! ${successCount} sent, ${failCount} failed`,
      );
    } catch (error) {
      componentLogger.error(
        "Send error",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to send emails");
    }
  };

  return {
    handleSend,
    isPreparingSend,
    showSendingDialog,
    setShowSendingDialog,
  };
}
