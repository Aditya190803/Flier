"use client";

import { useState, useEffect, useCallback } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Save,
  Trash2,
  RefreshCw,
  Pen,
  Play,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { AttachmentPreviewDialog } from "@/components/compose/attachment-preview-dialog";
import {
  createProcessingAttachments,
  processAttachmentFile,
} from "@/components/compose/attachment-upload";
import { ComposeStep } from "@/components/compose/compose-step";
import type { ComposeAttachment } from "@/components/compose/compose-types";
import type { DeliveryMode } from "@/components/compose/delivery-options";
import { DraftRecoveryDialog } from "@/components/compose/draft-recovery-dialog";
import { PreviewStep } from "@/components/compose/preview-step";
import { RecipientsStep } from "@/components/compose/recipients-step";
import { SendingStatusDialog } from "@/components/compose/sending-status-dialog";
import {
  StickyActionBar,
  type ComposeSectionId,
} from "@/components/compose/sticky-action-bar";
import { useComposeContacts } from "@/components/compose/use-compose-contacts";
import { useComposePreview } from "@/components/compose/use-compose-preview";
import { useComposeRecipients } from "@/components/compose/use-compose-recipients";
import { useComposeSend } from "@/components/compose/use-compose-send";
import { useDraftPersistence } from "@/components/compose/use-draft-persistence";
import { LazyEmailClientPreview } from "@/components/lazy-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-shell";
import { useEmailSend } from "@/hooks/useEmailSend";
import {
  campaignsService,
  templatesService,
  type EmailTemplate,
} from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

export function ComposeForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<ComposeAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // How this campaign leaves the composer: immediately, at a chosen time, or
  // parked as a draft. `saveAsDraft` stays derived from it so draft recovery
  // (which only knows about the boolean) keeps working unchanged.
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const saveAsDraft = deliveryMode === "draft";
  const setSaveAsDraft = useCallback((value: boolean) => {
    setDeliveryMode(value ? "draft" : "now");
  }, []);

  // Marketing vs Transactional state
  const [isMarketing, setIsMarketing] = useState(false);

  // Tracking state
  const [trackingEnabled, _setTrackingEnabled] = useState(true);

  const [_showSignatureDialog, _setShowSignatureDialog] = useState(false);

  // HTML import state
  const [showHtmlImport, setShowHtmlImport] = useState(false);
  const [htmlImportCode, setHtmlImportCode] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState("recipients");
  const [_showPreview, _setShowPreview] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [_draftName, _setDraftName] = useState(""); // Custom name for the draft

  // Contacts, groups, and signatures
  const {
    contacts,
    selectedContacts,
    setSelectedContacts,
    groups,
    selectedGroups,
    setSelectedGroups,
    signatures,
    selectedSignature,
    setSelectedSignature,
  } = useComposeContacts(session?.user?.email);

  // Recipients (manual, CSV, contacts, groups)
  const {
    recipients,
    setRecipients,
    manualEmail,
    setManualEmail,
    manualName,
    setManualName,
    manualEntries,
    setManualEntries,
    csvData,
    setCsvData,
    csvHeaders,
    setCsvHeaders,
    pdfColumn,
    setPdfColumn,
    showPersonalizedAttachments,
    setShowPersonalizedAttachments,
    handleCsvData,
    toggleContact,
    toggleGroup,
    addManualEntry,
    removeRecipient,
    clearAllRecipients,
  } = useComposeRecipients({
    contacts,
    selectedContacts,
    setSelectedContacts,
    groups,
    selectedGroups,
    setSelectedGroups,
  });

  // Sync toggle with pdfColumn state
  useEffect(() => {
    if (pdfColumn) {
      setShowPersonalizedAttachments(true);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfColumn]);

  // Set marketing mode based on A/B testing or content
  useEffect(() => {
    const abTestId = searchParams.get("abTestId");
    if (abTestId) {
      setIsMarketing(true);
    }
  }, [searchParams]);

  // Draft persistence (recovery, autosave, unsaved-changes tracking)
  const {
    editingDraftId,
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
  } = useDraftPersistence({
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
  });

  // Email send hook
  const {
    sendEmails,
    progress,
    sendStatus,
    isLoading: isSending,
    isStopping,
    isPaused,
    isOffline,
    error: sendError,
    failedEmails,
    hasPendingRetries,
    retryFailedEmails,
    stopSending,
    resumeCampaign,
    clearSavedCampaign,
    hasSavedCampaign,
    savedCampaignInfo,
    quotaInfo: _quotaInfo,
  } = useEmailSend();

  // Preview (recipient navigation, personalization, formatted HTML, attachment metadata)
  const {
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
  } = useComposePreview({
    activeTab,
    subject,
    content,
    recipients,
    csvData,
    manualEntries,
    contacts,
    pdfColumn,
  });

  // Send / save-as-draft orchestration
  const {
    handleSend,
    isPreparingSend,
    showSendingDialog,
    setShowSendingDialog,
  } = useComposeSend({
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
  });

  // Load template or campaign content if templateId is provided
  useEffect(() => {
    const templateId = searchParams.get("templateId");
    if (!templateId) {
      return;
    }

    const loadTemplate = async () => {
      try {
        setIsLoadingTemplates(true);
        // Try to fetch as a template first
        try {
          const template = await templatesService.get(templateId);
          setSubject(template.subject || "");
          setContent(template.content || "");
          toast.success("Template loaded!");
          return;
        } catch (_e) {
          // If not a template, try as a campaign
          try {
            const campaign = await campaignsService.get(templateId);
            setSubject(campaign.subject || "");
            setContent(campaign.content || "");
            // Also set marketing mode if it was a marketing campaign
            if (campaign.campaign_type === "marketing") {
              setIsMarketing(true);
            }
            toast.success("Campaign content loaded!");
          } catch (e2) {
            componentLogger.error(
              "Failed to load template or campaign",
              e2 instanceof Error ? e2 : undefined,
            );
            toast.error("Failed to load content");
          }
        }
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplate();
  }, [searchParams]);

  // Keyboard shortcuts for drafts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save draft
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveDraft();
        toast.success("Draft saved");
      }

      // Ctrl/Cmd + Shift + S to save as draft to Appwrite
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
        e.preventDefault();
        if (subject && content && recipients.length > 0) {
          setSaveAsDraft(true);
          // Trigger save via button click simulation
          handleSend();
        } else {
          toast.error(
            "Please fill in subject, content, and at least one recipient",
          );
        }
      }

      // Ctrl/Cmd + Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!saveAsDraft && subject && content && recipients.length > 0) {
          handleSend();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, content, recipients, saveAsDraft]);

  // Load templates
  const loadTemplates = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }

    setIsLoadingTemplates(true);
    try {
      const response = await templatesService.listByUser(session.user.email);
      setTemplates(
        response.documents.map((doc) => ({
          $id: doc.$id,
          name: (doc as any).name,
          subject: (doc as any).subject,
          content: (doc as any).content,
          category: (doc as any).category,
          user_email: (doc as any).user_email,
        })) as EmailTemplate[],
      );
    } catch (error) {
      componentLogger.error(
        "Error loading templates",
        error instanceof Error ? error : undefined,
      );
    }
    setIsLoadingTemplates(false);
  }, [session?.user?.email]);

  // Apply template to form
  const applyTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    setContent(template.content);
    setShowTemplateDialog(false);
    toast.success(`Template "${template.name}" applied!`);
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) {
      return;
    }

    const processingAttachments = createProcessingAttachments(files);
    setAttachments((prev) => [...prev, ...processingAttachments]);
    setIsUploading(true);

    const fileArray = Array.from(files);
    const results = await Promise.all(
      fileArray.map(async (file, index) => {
        const tempId = processingAttachments[index].tempId!;
        const result = await processAttachmentFile(file, tempId);
        if (result.success && result.update) {
          setAttachments((prev) =>
            prev.map((a) =>
              a.tempId === tempId ? { ...a, ...result.update } : a,
            ),
          );
        } else if (!result.success) {
          setAttachments((prev) => prev.filter((a) => a.tempId !== tempId));
        }
        return result;
      }),
    );

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    if (failCount > 0) {
      toast.error(`${failCount} file(s) failed to process`);
    }
    if (successCount > 0) {
      toast.success(`${successCount} file(s) ready`);
    }
    setIsUploading(false);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const stepMeta = {
    recipients: {
      label: "Recipients",
      desc: "Choose who receives this campaign",
      icon: <Users className="h-4 w-4" />,
    },
    compose: {
      label: "Compose",
      desc: "Write your subject and message",
      icon: <Pen className="h-4 w-4" />,
    },
    preview: {
      label: "Preview",
      desc: "Check rendering and personalization",
      icon: <Eye className="h-4 w-4" />,
    },
  } as const;

  const activeStep =
    stepMeta[activeTab as keyof typeof stepMeta] ?? stepMeta.compose;
  const activeSection = activeTab as ComposeSectionId;

  return (
    <div className="relative space-y-8 pb-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-8 h-64 -z-10 bg-primary/5"
      />
      {/* Resume Campaign Banner */}
      {hasSavedCampaign && savedCampaignInfo && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-xs sm:text-sm">
                Incomplete Campaign Found
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {savedCampaignInfo.subject
                  ? `"${savedCampaignInfo.subject}" - `
                  : ""}
                {savedCampaignInfo.remaining} of {savedCampaignInfo.total}{" "}
                emails remaining
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                clearSavedCampaign();
                toast.success("Campaign discarded");
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Discard
            </Button>
            <Button
              size="sm"
              className="text-xs h-8"
              onClick={async () => {
                setShowSendingDialog(true);
                await resumeCampaign();
              }}
            >
              <Play className="h-3 w-3 mr-1" />
              Resume
            </Button>
          </div>
        </div>
      )}

      <PageHeader
        title="New Campaign"
        description={
          <div className="flex items-center gap-1.5 sm:gap-2 text-sm mt-1 sm:mt-0">
            {draftSyncStatus === "saving" || isSavingDraft ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span className="text-muted-foreground">Saving...</span>
              </>
            ) : draftSyncStatus === "saved" ? (
              <>
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-success">
                  Saved {lastSaved ? getTimeAgo(lastSaved) : ""}
                </span>
              </>
            ) : draftSyncStatus === "error" ? (
              <>
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive">Failed to save</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-warning">Unsaved changes</span>
              </>
            ) : lastSaved ? (
              <>
                <Save className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Draft saved {getTimeAgo(lastSaved)}
                </span>
              </>
            ) : null}
            {!isSavingDraft &&
              draftSyncStatus !== "saving" &&
              draftSyncStatus !== "saved" &&
              draftSyncStatus !== "error" &&
              !hasUnsavedChanges &&
              !lastSaved && (
                <>
                  <Save className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Draft</span>
                </>
              )}
            <span className="hidden sm:inline text-xs text-muted-foreground opacity-50">
              (Ctrl+S)
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                saveDraft();
                toast.success("Draft saved");
              }}
              disabled={isSavingDraft || !hasUnsavedChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to clear this draft? This cannot be undone.",
                  )
                ) {
                  setSubject("");
                  setContent("");
                  setRecipients([]);
                  setAttachments([]);
                  setManualEntries([]);
                  setCsvData([]);
                  setCsvHeaders([]);
                  clearDraft();
                  toast.success("Draft cleared");
                }
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              Discard
            </Button>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 min-h-[600px] w-full">
        {/* Step Indicator Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="sticky top-8 space-y-4">
            <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-5">
              Steps
            </h3>
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 border-l border-dashed border-border/70 hidden md:block" />
              <div className="flex justify-between md:block space-y-0 md:space-y-6 relative z-10 overflow-x-auto overflow-y-hidden md:overflow-visible pb-2 md:pb-0 px-1">
                {[
                  {
                    id: "recipients",
                    label: "Recipients",
                    desc: "Who gets this?",
                  },
                  { id: "compose", label: "Compose", desc: "Write your copy" },
                  {
                    id: "preview",
                    label: "Preview",
                    desc: "Check how it looks",
                  },
                ].map((s, i) => {
                  const isActive = s.id === activeTab;
                  const stepIndex = [
                    "recipients",
                    "compose",
                    "preview",
                  ].indexOf(s.id);
                  const currentIndex = [
                    "recipients",
                    "compose",
                    "preview",
                  ].indexOf(activeTab);
                  const isCompleted = stepIndex < currentIndex;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveTab(s.id)}
                      className="flex items-center md:items-start gap-3 md:gap-4 md:w-full min-w-max pr-4 md:pr-0 pl-1 md:pl-0 text-left transition-all group outline-none"
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors shrink-0 ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]"
                            : isCompleted
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-muted-foreground/30 text-muted-foreground group-hover:border-muted-foreground/60"
                        }`}
                      >
                        {isCompleted && !isActive ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-semibold">{i + 1}</span>
                        )}
                      </div>
                      <div className="hidden md:block">
                        <p
                          className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {s.label}
                        </p>
                        <p
                          className={`text-xs ${isActive ? "text-muted-foreground" : "text-muted-foreground/60"}`}
                        >
                          {s.desc}
                        </p>
                      </div>
                      <span className="md:hidden text-sm font-medium ml-2">
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Panel Wrapper */}
        <div className="flex-1 min-w-0 flex flex-col w-full rounded-xl border bg-card shadow-sm overflow-hidden h-fit">
          {/* Panel chrome */}
          <div className="px-4 md:px-6 lg:px-8 py-3 border-b bg-muted/10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg border bg-background/60 text-primary">
                    {activeStep.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {activeStep.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activeStep.desc}
                    </p>
                  </div>
                </div>
              </div>
              <div className="shrink-0 hidden sm:flex items-center gap-2">
                <Badge variant="outline" className="bg-background/60">
                  Step{" "}
                  {["recipients", "compose", "preview"].indexOf(activeTab) + 1}
                  /3
                </Badge>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 lg:p-8 pb-28 flex-1 min-h-0 overflow-y-auto space-y-6">
            {/* Recipients Tab */}
            <div className={activeTab === "recipients" ? "block" : "hidden"}>
              <RecipientsStep
                manualEmail={manualEmail}
                manualName={manualName}
                manualEntries={manualEntries}
                csvData={csvData}
                groups={groups}
                selectedGroups={selectedGroups}
                contacts={contacts}
                selectedContacts={selectedContacts}
                recipients={recipients}
                setManualEmail={setManualEmail}
                setManualName={setManualName}
                addManualEntry={addManualEntry}
                handleCsvData={handleCsvData}
                toggleGroup={toggleGroup}
                toggleContact={toggleContact}
                removeRecipient={removeRecipient}
                clearAllRecipients={clearAllRecipients}
              />
            </div>

            {/* Compose Tab */}
            <div
              className={activeTab === "compose" ? "block space-y-6" : "hidden"}
            >
              <ComposeStep
                showHtmlImport={showHtmlImport}
                htmlImportCode={htmlImportCode}
                showTemplateDialog={showTemplateDialog}
                templates={templates}
                templateSearch={templateSearch}
                isLoadingTemplates={isLoadingTemplates}
                subject={subject}
                content={content}
                cc={cc}
                bcc={bcc}
                showCc={showCc}
                showBcc={showBcc}
                attachments={attachments}
                isUploading={isUploading}
                csvData={csvData}
                csvHeaders={csvHeaders}
                pdfColumn={pdfColumn}
                showPersonalizedAttachments={showPersonalizedAttachments}
                signatures={signatures}
                selectedSignature={selectedSignature}
                isMarketing={isMarketing}
                deliveryMode={deliveryMode}
                scheduledAt={scheduledAt}
                hasAbTestId={Boolean(searchParams.get("abTestId"))}
                router={router}
                setShowHtmlImport={setShowHtmlImport}
                setHtmlImportCode={setHtmlImportCode}
                setShowTemplateDialog={setShowTemplateDialog}
                setTemplateSearch={setTemplateSearch}
                setSubject={setSubject}
                setContent={setContent}
                setCc={setCc}
                setBcc={setBcc}
                setShowCc={setShowCc}
                setShowBcc={setShowBcc}
                handleFileUpload={handleFileUpload}
                removeAttachment={removeAttachment}
                setPreviewAttachmentUrl={setPreviewAttachmentUrl}
                setShowAttachmentPreview={setShowAttachmentPreview}
                setShowPersonalizedAttachments={setShowPersonalizedAttachments}
                setPdfColumn={setPdfColumn}
                setSelectedSignature={setSelectedSignature}
                setIsMarketing={setIsMarketing}
                setDeliveryMode={setDeliveryMode}
                setScheduledAt={setScheduledAt}
                applyTemplate={applyTemplate}
                loadTemplates={loadTemplates}
              />
            </div>

            {/* Preview Tab */}
            <div className={activeTab === "preview" ? "block" : "hidden"}>
              <PreviewStep
                previewMode={previewMode}
                setPreviewMode={setPreviewMode}
                setShowClientPreview={setShowClientPreview}
                recipients={recipients}
                previewRecipientIndex={previewRecipientIndex}
                setPreviewRecipientIndex={setPreviewRecipientIndex}
                getPersonalizedContent={getPersonalizedContent}
                subject={subject}
                content={content}
                cc={cc}
                bcc={bcc}
                csvData={csvData}
                manualEntries={manualEntries}
                isLoadingPreview={isLoadingPreview}
                formattedPreviewHtml={formattedPreviewHtml}
                createGmailPreviewWrapper={buildGmailPreviewWrapper}
                attachments={attachments}
                pdfColumn={pdfColumn}
              />
            </div>

            {/* Send step removed — Dispatch happens in Preview */}

            {/* Main Form Next/Back Actions removed (replaced by StickyActionBar) */}
          </div>
        </div>
      </div>

      <StickyActionBar
        activeSection={activeSection}
        recipientsCount={recipients.length}
        canGoBack={activeTab !== "recipients"}
        canGoNext={activeTab !== "preview"}
        onBack={() => {
          const steps: ComposeSectionId[] = [
            "recipients",
            "compose",
            "preview",
          ];
          const idx = steps.indexOf(activeSection);
          if (idx > 0) {
            setActiveTab(steps[idx - 1]);
          }
        }}
        onNext={() => {
          const steps: ComposeSectionId[] = [
            "recipients",
            "compose",
            "preview",
          ];
          const idx = steps.indexOf(activeSection);
          if (idx < steps.length - 1) {
            setActiveTab(steps[idx + 1]);
          }
        }}
        onDispatch={handleSend}
        isDispatching={isPreparingSend || isSending}
        deliveryMode={deliveryMode}
        dispatchDisabled={
          isSending ||
          isPreparingSend ||
          isSavingDraft ||
          isUploading ||
          attachments.some((a) => a.isProcessing) ||
          !subject ||
          !content ||
          recipients.length === 0
        }
      />

      <SendingStatusDialog
        open={showSendingDialog}
        setOpen={setShowSendingDialog}
        isSending={isSending}
        isStopping={isStopping}
        progress={progress}
        sendError={sendError}
        sendStatus={sendStatus}
        hasPendingRetries={hasPendingRetries}
        failedEmails={failedEmails}
        stopSending={stopSending}
        retryFailedEmails={retryFailedEmails}
        isOffline={isOffline}
        isPaused={isPaused}
        router={router}
      />

      <DraftRecoveryDialog
        open={showDraftRecoveryDialog}
        draft={pendingDraft}
        onOpenChange={setShowDraftRecoveryDialog}
        onDiscard={discardPendingDraft}
        onRestore={restoreDraft}
      />

      <AttachmentPreviewDialog
        open={showAttachmentPreview}
        previewAttachmentUrl={previewAttachmentUrl}
        previewRecipientIndex={previewRecipientIndex}
        personalizedAttachmentMetadata={personalizedAttachmentMetadata}
        onOpenChange={(open) => {
          setShowAttachmentPreview(open);
          if (!open) {
            setPreviewAttachmentUrl(null);
          }
        }}
        getPersonalizedContent={getPersonalizedContent}
      />

      {/* Email Client Preview Modal */}
      <LazyEmailClientPreview
        isOpen={showClientPreview}
        onClose={() => setShowClientPreview(false)}
        subject={subject}
        htmlContent={formattedPreviewHtml || content || ""}
        senderName={session?.user?.name || "Your Name"}
        senderEmail={session?.user?.email || "your@email.com"}
      />
    </div>
  );
}
