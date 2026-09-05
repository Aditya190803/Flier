"use client";

import { useEffect, useState } from "react";

import { isPdfUrl } from "@/lib/attachment-fetcher";
import { componentLogger } from "@/lib/client-logger";
import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "@/lib/constants";
import {
  createGmailPreviewWrapper as buildGmailPreviewWrapper,
  replacePlaceholders,
} from "@/lib/email/preview-utils";
import { getEmailPreview } from "@/lib/email-formatting/client";
import { getCookie } from "@/lib/utils";

import type { Contact } from "./compose-types";

interface AttachmentMetadata {
  fileName: string;
  fileSize: number | null;
  fileType:
    "pdf" | "image" | "document" | "spreadsheet" | "presentation" | "other";
  contentType?: string;
  source: "google-drive" | "onedrive" | "dropbox" | "direct";
  accessible: boolean;
  originalUrl: string;
}

interface UseComposePreviewArgs {
  activeTab: string;
  subject: string;
  content: string;
  recipients: string[];
  csvData: Record<string, string>[];
  manualEntries: { email: string; name: string }[];
  contacts: Contact[];
  pdfColumn: string | null;
}

/**
 * Owns recipient preview navigation, personalized content resolution, the
 * formatted Gmail-style preview HTML, and personalized-attachment metadata
 * lookups shown on the Preview step.
 */
export function useComposePreview({
  activeTab,
  subject,
  content,
  recipients,
  csvData,
  manualEntries,
  contacts,
  pdfColumn,
}: UseComposePreviewArgs) {
  const [previewRecipientIndex, setPreviewRecipientIndex] = useState(0);
  const [formattedPreviewHtml, setFormattedPreviewHtml] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [showClientPreview, setShowClientPreview] = useState(false);

  const [personalizedAttachmentMetadata, setPersonalizedAttachmentMetadata] =
    useState<{
      [email: string]: AttachmentMetadata | null;
    }>({});
  const [_isLoadingAttachmentMetadata, setIsLoadingAttachmentMetadata] =
    useState(false);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<
    string | null
  >(null);

  // Get personalized content for a specific recipient
  const getPersonalizedContent = (recipientIndex: number) => {
    if (recipients.length === 0) {
      return {
        email: "recipient@example.com",
        subject: subject || "(No subject)",
        content: content || "<p>Your email content will appear here...</p>",
      };
    }

    const recipientEmail = recipients[recipientIndex] || recipients[0];

    // Find data for this recipient from CSV data or manual entries
    const csvRow = csvData.find((row) => row.email === recipientEmail) || {};
    const manualEntry = manualEntries.find((e) => e.email === recipientEmail);
    const contact = contacts.find((c) => c.email === recipientEmail);

    // Merge data sources (CSV takes precedence, then manual entry, then contact)
    const recipientData: Record<string, string> & { email: string } = {
      email: recipientEmail,
      ...(contact?.name ? { name: contact.name } : {}),
      ...(contact?.company ? { company: contact.company } : {}),
      ...(contact?.phone ? { phone: contact.phone } : {}),
      ...(contact?.tags?.length ? { tags: contact.tags.join(", ") } : {}),
      ...contact?.customFields,
      ...(manualEntry?.name ? { name: manualEntry.name } : {}),
      ...csvRow,
    };

    // Apply personalization
    const personalizedSubject = replacePlaceholders(subject, recipientData);
    const personalizedContent = replacePlaceholders(content, recipientData);

    return {
      email: recipientEmail,
      subject: personalizedSubject || "(No subject)",
      content:
        personalizedContent || "<p>Your email content will appear here...</p>",
      data: recipientData,
    };
  };

  // Load formatted preview HTML when preview tab is active
  useEffect(() => {
    const loadFormattedPreview = async () => {
      if (activeTab !== "preview") {
        return;
      }

      const preview = getPersonalizedContent(previewRecipientIndex);
      setIsLoadingPreview(true);

      try {
        const formattedHtml = await getEmailPreview(preview.content);
        // Wrap in Gmail-like preview wrapper
        const wrappedHtml = buildGmailPreviewWrapper(formattedHtml);
        setFormattedPreviewHtml(wrappedHtml);
      } catch (error) {
        componentLogger.error(
          "Failed to load formatted preview",
          error instanceof Error ? error : undefined,
        );
        // Fallback to basic preview
        setFormattedPreviewHtml(buildGmailPreviewWrapper(preview.content));
      }

      setIsLoadingPreview(false);
    };

    loadFormattedPreview();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    previewRecipientIndex,
    content,
    subject,
    recipients,
    csvData,
    manualEntries,
  ]);

  // Fetch personalized attachment metadata when preview tab is active
  useEffect(() => {
    const fetchAttachmentMetadata = async () => {
      if (activeTab !== "preview" || !pdfColumn) {
        return;
      }

      const preview = getPersonalizedContent(previewRecipientIndex);
      const attachmentUrl = preview.data?.[pdfColumn];

      if (!attachmentUrl || !isPdfUrl(String(attachmentUrl))) {
        return;
      }

      // Check if we already have metadata for this recipient
      if (personalizedAttachmentMetadata[preview.email]) {
        return;
      }

      setIsLoadingAttachmentMetadata(true);

      try {
        const csrfToken = getCookie(CSRF_TOKEN_NAME);
        const response = await fetch("/api/attachment-metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
          },
          body: JSON.stringify({
            url: String(attachmentUrl),
            recipientName:
              preview.data?.name ||
              preview.data?.Name ||
              preview.email.split("@")[0],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.metadata) {
            setPersonalizedAttachmentMetadata((prev) => ({
              ...prev,
              [preview.email]: result.metadata,
            }));
          }
        }
      } catch (error) {
        componentLogger.error(
          "Failed to fetch attachment metadata",
          error instanceof Error ? error : undefined,
        );
      }

      setIsLoadingAttachmentMetadata(false);
    };

    fetchAttachmentMetadata();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, previewRecipientIndex, pdfColumn, recipients]);

  return {
    previewRecipientIndex,
    setPreviewRecipientIndex,
    formattedPreviewHtml,
    isLoadingPreview,
    previewMode,
    setPreviewMode,
    showClientPreview,
    setShowClientPreview,
    personalizedAttachmentMetadata,
    showAttachmentPreview,
    setShowAttachmentPreview,
    previewAttachmentUrl,
    setPreviewAttachmentUrl,
    getPersonalizedContent,
    buildGmailPreviewWrapper,
  };
}
