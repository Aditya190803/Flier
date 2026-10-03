"use client";

import { useRef, useState } from "react";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { toast } from "sonner";

import { draftEmailsService, type EmailSignature } from "@/lib/appwrite";
import { apiRequest } from "@/lib/appwrite/api-request";
import type { PreflightReport } from "@/lib/email/preflight";
import { componentLogger } from "@/lib/client-logger";
import { parseEmailList } from "@/lib/email/parse-list";
import { getBrowserTimeZone, validateScheduleValue } from "@/lib/schedule";
import { scheduledCampaignsService } from "@/lib/services/scheduled-campaigns-client";
import { isValidEmail } from "@/lib/validation";
import type { CSVRow } from "@/types/email";

import { ensureAppwriteAttachment } from "./attachment-upload";
import { buildRecipientFields } from "./recipient-data";

import type { ComposeAttachment, Contact } from "./compose-types";
import type { DeliveryMode } from "./delivery-options";

interface UseComposeSendArgs {
  teamId?: string;
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
  clearDraft: () => void;
  setIsSavingDraft: (value: boolean) => void;
}

/** Queues a frozen campaign snapshot, or saves a reusable draft. */
export function useComposeSend({
  teamId,
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
  clearDraft,
  setIsSavingDraft,
}: UseComposeSendArgs) {
  const [isPreparingSend, setIsPreparingSend] = useState(false);
  const [showSendingDialog, setShowSendingDialog] = useState(false);

  const queueRequest = useRef<{ fingerprint: string; id: string } | null>(null);

  const [approval, setApproval] = useState<{ id: string; teamId: string } | null>(null);
  const approvalId = approval && approval.teamId === teamId ? approval.id : "";
  const uploaded = useRef<{
    fingerprint: string;
    files: Awaited<ReturnType<typeof ensureAppwriteAttachment>>[];
  } | null>(null);
  const handleSend = async (action: "send" | "review" = "send") => {
    if (action === "review" && (!teamId || deliveryMode === "draft")) {
      toast.error("Choose a team and Send now or Schedule before requesting review.");
      return;
    }
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

    let filteredRecipients = recipients;
    if (deliveryMode !== "draft") {
      try {
        const signature = signatures.find((signature) => signature.$id === selectedSignature);
        const report = await apiRequest<PreflightReport>("/api/campaign-preflight", {
          method: "POST",
          body: JSON.stringify({
            subject,
            content: signature ? content + "<br/><br/>" + signature.content : content,
            recipients,
            isMarketing,
            recipientFields: Object.fromEntries(
              recipients.map((email) => [
                email.trim().toLowerCase(),
                buildRecipientFields({ email, csvData, manualEntries, contacts }),
              ]),
            ),
            attachments: attachments.map((attachment) => ({
              ...attachment,
              data: ["appwrite", "processing", "error"].includes(attachment.data)
                ? attachment.data
                : attachment.data
                  ? "inline"
                  : "",
            })),
            personalizedAttachmentColumn: showPersonalizedAttachments
              ? pdfColumn || undefined
              : undefined,
          }),
        });
        if (report.issues.length) {
          toast.error(report.issues[0].message);
          setIsPreparingSend(false);
          return;
        }
        filteredRecipients = report.recipients;
        if (report.suppressed.length || report.duplicates) {
          toast.info(report.suppressed.length + report.duplicates + " excluded recipient(s)");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to review campaign. Sending was stopped.",
        );
        setIsPreparingSend(false);
        return;
      }
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
    if (deliveryMode !== "draft" && session?.user?.email) {
      const scheduleCheck =
        deliveryMode === "now"
          ? { valid: true, date: new Date(), error: undefined }
          : validateScheduleValue(scheduledAt);
      if (!scheduleCheck.valid || !scheduleCheck.date) {
        toast.error(scheduleCheck.error || "Pick a valid send time");
        setIsPreparingSend(false);
        return;
      }

      try {
        // The worker reads attachments from Appwrite storage, so anything
        // still held as inline base64 has to be uploaded first.
        const attachmentFingerprint = JSON.stringify(attachments);
        if (uploaded.current?.fingerprint !== attachmentFingerprint) {
          uploaded.current = {
            fingerprint: attachmentFingerprint,
            files: await Promise.all(attachments.map((a) => ensureAppwriteAttachment(a))),
          };
        }
        const processedAttachments = uploaded.current.files;

        const recipientCsvData = filteredRecipients.map((recipientEmail) =>
          buildRecipientFields({
            email: recipientEmail,
            csvData,
            manualEntries,
            contacts,
          }),
        );

        const fingerprint = JSON.stringify({
          teamId,
          subject,
          finalContent,
          filteredRecipients,
          attachments,
          recipientCsvData,
          ccList,
          bccList,
          trackingEnabled,
          isMarketing,
          deliveryMode,
          scheduledAt,
          pdfColumn,
          showPersonalizedAttachments,
        });
        if (queueRequest.current?.fingerprint !== fingerprint) {
          queueRequest.current = { fingerprint, id: crypto.randomUUID() };
        }
        const snapshot = {
          send_now: deliveryMode === "now",
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
          has_personalized_attachments: !!pdfColumn && showPersonalizedAttachments,
          personalized_attachment_column: pdfColumn || undefined,
        };
        if (action === "review") {
          const review = await apiRequest<{ id: string }>("/api/campaign-reviews", {
            method: "POST",
            body: JSON.stringify({ team_id: teamId, snapshot }),
          });
          setApproval({ id: review.id, teamId: teamId! });
          toast.success("Review requested. Another owner or admin must approve before dispatch.");
          return;
        }
        await scheduledCampaignsService.create({
          ...snapshot,
          request_id: queueRequest.current.id,
          team_id: teamId || undefined,
          review_id: teamId && approvalId ? approvalId : undefined,
        });

        clearDraft();
        toast.success(
          deliveryMode === "now"
            ? "Campaign queued. You can close this tab."
            : `Campaign scheduled for ${scheduleCheck.date.toLocaleString()}`,
        );
        router.push("/scheduled");
        return;
      } catch (error) {
        componentLogger.error(
          "Error scheduling campaign",
          error instanceof Error ? error : undefined,
        );
        toast.error(error instanceof Error ? error.message : "Failed to schedule campaign");
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
          has_personalized_attachments: !!pdfColumn && showPersonalizedAttachments,
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
        componentLogger.error("Error saving draft", error instanceof Error ? error : undefined);
        toast.error("Failed to save draft");
        return;
      } finally {
        setIsSavingDraft(false);
        setIsPreparingSend(false);
      }
    }

    setIsPreparingSend(false);
    toast.error("Sign in before queuing or saving a campaign.");
  };

  return {
    handleSend: () => handleSend(),
    handleRequestReview: () => handleSend("review"),
    approvalId,
    isPreparingSend,
    showSendingDialog,
    setShowSendingDialog,
  };
}
