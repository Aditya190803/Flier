"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ReadonlyURLSearchParams } from "next/navigation";

import { toast } from "sonner";

import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { componentLogger } from "@/lib/client-logger";
import { serializeEmailList } from "@/lib/email/parse-list";

import {
  AUTO_SAVE_DELAY_MS,
  buildLocalDraft,
  clearLocalDraft,
  contentHash,
  getTimeAgo,
  loadLocalDraft,
  saveLocalDraft,
  type DraftSyncStatus,
} from "./draft-storage";

import type { ComposeAttachment, EmailDraft } from "./compose-types";

interface UseDraftPersistenceArgs {
  searchParams: ReadonlyURLSearchParams;
  subject: string;
  content: string;
  recipients: string[];
  attachments: ComposeAttachment[];
  setSubject: (value: string) => void;
  setContent: (value: string) => void;
  setRecipients: (value: string[]) => void;
  setAttachments: (value: ComposeAttachment[]) => void;
  setCc: (value: string) => void;
  setShowCc: (value: boolean) => void;
  setBcc: (value: string) => void;
  setShowBcc: (value: boolean) => void;
  setSaveAsDraft: (value: boolean) => void;
  setCsvData: (value: any[]) => void;
  setCsvHeaders: (value: string[]) => void;
  setShowPersonalizedAttachments: (value: boolean) => void;
  setPdfColumn: (value: string | null) => void;
}

/**
 * Manages the local-storage compose draft lifecycle: recovering drafts /
 * duplicated campaigns / edited drafts on mount, tracking unsaved changes,
 * debounced auto-save, and the "unsaved changes" warning on navigation.
 */
export function useDraftPersistence({
  searchParams,
  subject,
  content,
  recipients,
  attachments,
  setSubject,
  setContent,
  setRecipients,
  setAttachments,
  setCc,
  setShowCc,
  setBcc,
  setShowBcc,
  setSaveAsDraft,
  setCsvData,
  setCsvHeaders,
  setShowPersonalizedAttachments,
  setPdfColumn,
}: UseDraftPersistenceArgs) {
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [showDraftRecoveryDialog, setShowDraftRecoveryDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<EmailDraft | null>(null);
  const [_hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSyncStatus, setDraftSyncStatus] =
    useState<DraftSyncStatus>("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  // Load draft on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        // First check if we're editing a draft
        const editMode = searchParams.get("edit");
        if (editMode === "draft") {
          const draftData = sessionStorage.getItem("editDraftEmail");
          if (draftData) {
            const draft = JSON.parse(draftData);
            setEditingDraftId(draft.id);
            setSubject(draft.subject || "");
            setContent(draft.content || "");
            setRecipients(draft.recipients || []);
            if (Array.isArray(draft.cc) && draft.cc.length) {
              setCc(serializeEmailList(draft.cc));
              setShowCc(true);
            }
            if (Array.isArray(draft.bcc) && draft.bcc.length) {
              setBcc(serializeEmailList(draft.bcc));
              setShowBcc(true);
            }
            setSaveAsDraft(true); // Keep it as draft mode when editing

            // Handle attachments
            if (draft.attachments && draft.attachments.length > 0) {
              const parsedAttachments = draft.attachments.map((a: any) => ({
                name: a.fileName,
                type: "application/octet-stream",
                data: a.fileUrl,
                appwriteUrl: a.fileUrl,
                appwriteFileId: a.appwrite_file_id,
                fileSize: a.fileSize,
              }));
              setAttachments(parsedAttachments);
            }

            // Handle CSV data for personalization
            if (draft.csv_data) {
              try {
                const csvDataParsed =
                  typeof draft.csv_data === "string"
                    ? JSON.parse(draft.csv_data)
                    : draft.csv_data;
                if (Array.isArray(csvDataParsed) && csvDataParsed.length > 0) {
                  setCsvData(csvDataParsed);
                  // Extract headers from the first row
                  const headers = Object.keys(csvDataParsed[0]);
                  setCsvHeaders(headers);
                }
              } catch (e) {
                componentLogger.error(
                  "Error parsing csv_data",
                  e instanceof Error ? e : undefined,
                );
              }
            }

            // Restore personalized attachment settings
            if (draft.has_personalized_attachments) {
              setShowPersonalizedAttachments(true);
              if (draft.personalized_attachment_column) {
                setPdfColumn(draft.personalized_attachment_column);
              }
            }

            sessionStorage.removeItem("editDraftEmail");
            toast.success("Editing draft");
            return;
          }
        }

        // Check if there's a template from the templates page
        const templateData = sessionStorage.getItem("selectedTemplate");
        if (templateData) {
          const template = JSON.parse(templateData);
          setSubject(template.subject || "");
          setContent(template.content || "");
          sessionStorage.removeItem("selectedTemplate");
          toast.success("Template loaded!");
          return; // Skip draft loading: template takes precedence
        }

        // Check if there's a duplicated campaign from the history page
        const duplicateCampaignData =
          sessionStorage.getItem("duplicateCampaign");
        if (duplicateCampaignData) {
          const campaign = JSON.parse(duplicateCampaignData);
          setSubject(campaign.subject || "");
          setContent(campaign.content || "");
          if (campaign.recipients && Array.isArray(campaign.recipients)) {
            setRecipients(campaign.recipients);
          }
          if (campaign.attachments && Array.isArray(campaign.attachments)) {
            setAttachments(
              campaign.attachments.map((att: any) => ({
                name: att.fileName || att.name,
                size: att.fileSize || att.size || 0,
                type: att.fileType || att.type || "application/octet-stream",
                path: att.fileUrl || att.path || "",
              })),
            );
          }
          sessionStorage.removeItem("duplicateCampaign");
          toast.success("Campaign duplicated! You can now edit and send.");
          return; // Don't load draft if duplicating campaign
        }

        const draft = loadLocalDraft();
        if (draft) {
          setHasDraft(true);
          setPendingDraft(draft);
          setShowDraftRecoveryDialog(true);
        }
      } catch (e) {
        componentLogger.error(
          "Error loading draft",
          e instanceof Error ? e : undefined,
        );
      }
    };

    loadDraft();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Handle draft recovery
  const restoreDraft = useCallback((draft: EmailDraft) => {
    setSubject(draft.subject || "");
    setContent(draft.content || "");
    setRecipients(draft.recipients || []);
    setAttachments(draft.attachments || []);
    setLastSaved(new Date(draft.savedAt));
    lastSavedContentRef.current = contentHash({
      subject: draft.subject,
      content: draft.content,
      recipients: draft.recipients,
      attachments: draft.attachments || [],
    });
    setShowDraftRecoveryDialog(false);
    setPendingDraft(null);
    toast.success("Draft restored!");
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearDraft = useCallback(() => {
    try {
      clearLocalDraft();
      setHasDraft(false);
      setLastSaved(null);
      setHasUnsavedChanges(false);
      lastSavedContentRef.current = "";
      setDraftSyncStatus("idle");
    } catch (e) {
      componentLogger.error(
        "Error clearing draft",
        e instanceof Error ? e : undefined,
      );
    }
  }, []);

  const discardPendingDraft = useCallback(() => {
    clearDraft();
    setShowDraftRecoveryDialog(false);
    setPendingDraft(null);
  }, [clearDraft]);

  const currentContentHash = useMemo(
    () => contentHash({ subject, content, recipients, attachments }),
    [subject, content, recipients, attachments],
  );

  // Track unsaved changes
  useEffect(() => {
    if (
      lastSavedContentRef.current &&
      currentContentHash !== lastSavedContentRef.current
    ) {
      setHasUnsavedChanges(true);
      setDraftSyncStatus("idle");
    }
  }, [currentContentHash]);

  // Warn before leaving with unsaved changes
  useBeforeUnload(
    hasUnsavedChanges && (subject.length > 0 || content.length > 0),
    "You have unsaved changes. Are you sure you want to leave?",
  );

  const saveDraft = useCallback(() => {
    try {
      if (!subject && !content && recipients.length === 0) {
        return;
      }

      setIsSavingDraft(true);
      setDraftSyncStatus("saving");

      const draft = buildLocalDraft({
        subject,
        content,
        recipients,
        attachments,
      });
      saveLocalDraft(draft);

      lastSavedContentRef.current = contentHash({
        subject,
        content,
        recipients,
        attachments,
      });
      setLastSaved(new Date());
      setHasDraft(true);
      setHasUnsavedChanges(false);
      setDraftSyncStatus("saved");
      setIsSavingDraft(false);

      setTimeout(() => {
        setDraftSyncStatus("idle");
      }, 3000);
    } catch (e) {
      componentLogger.error(
        "Error saving draft",
        e instanceof Error ? e : undefined,
      );
      setDraftSyncStatus("error");
      setIsSavingDraft(false);
    }
  }, [subject, content, recipients, attachments]);

  // Auto-save draft when content changes (debounced)
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Only auto-save if there's content and changes
    if ((subject || content || recipients.length > 0) && hasUnsavedChanges) {
      setDraftSyncStatus("idle");
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, AUTO_SAVE_DELAY_MS);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, content, recipients, hasUnsavedChanges]);

  return {
    editingDraftId,
    setEditingDraftId,
    showDraftRecoveryDialog,
    setShowDraftRecoveryDialog,
    pendingDraft,
    lastSaved,
    isSavingDraft,
    setIsSavingDraft,
    draftSyncStatus,
    hasUnsavedChanges,
    restoreDraft,
    clearDraft,
    discardPendingDraft,
    saveDraft,
    getTimeAgo,
  };
}
