import { useEffect } from "react";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import {
  AlertCircle,
  CheckCircle,
  Eye,
  FileCode,
  FileText,
  Mail,
  Paperclip,
  Pen,
  RefreshCw,
  Settings,
  Send,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { LazyRichTextEditor } from "@/components/lazy-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { EmailSignature, EmailTemplate } from "@/lib/appwrite";
import { detectPdfColumn, isPdfUrl } from "@/lib/attachment-fetcher";
import { LARGE_FILE_THRESHOLD } from "@/lib/attachments/client";

import { DeliveryOptions, type DeliveryMode } from "./delivery-options";
import { EmailChipInput } from "./email-chip-input";
import { TemplatePickerDialog } from "./template-picker-dialog";

import type { ComposeAttachment } from "./compose-types";

interface ComposeStepProps {
  showHtmlImport: boolean;
  htmlImportCode: string;
  showTemplateDialog: boolean;
  templates: EmailTemplate[];
  templateSearch: string;
  isLoadingTemplates: boolean;
  subject: string;
  content: string;
  cc: string;
  bcc: string;
  showCc: boolean;
  showBcc: boolean;
  attachments: ComposeAttachment[];
  isUploading: boolean;
  csvData: Record<string, string>[];
  csvHeaders: string[];
  pdfColumn: string | null;
  showPersonalizedAttachments: boolean;
  signatures: EmailSignature[];
  selectedSignature: string | null;
  isMarketing: boolean;
  deliveryMode: DeliveryMode;
  /** `datetime-local` value; only meaningful when `deliveryMode` is "schedule" */
  scheduledAt: string;
  hasAbTestId: boolean;
  router: AppRouterInstance;
  setShowHtmlImport: (open: boolean) => void;
  setHtmlImportCode: (value: string) => void;
  setShowTemplateDialog: (open: boolean) => void;
  setTemplateSearch: (value: string) => void;
  setSubject: (value: string) => void;
  setContent: (value: string) => void;
  setCc: (value: string) => void;
  setBcc: (value: string) => void;
  setShowCc: (value: boolean) => void;
  setShowBcc: (value: boolean) => void;
  handleFileUpload: (files: FileList) => void | Promise<void>;
  removeAttachment: (index: number) => void;
  setPreviewAttachmentUrl: (url: string | null) => void;
  setShowAttachmentPreview: (open: boolean) => void;
  setShowPersonalizedAttachments: (checked: boolean) => void;
  setPdfColumn: (value: string | null) => void;
  setSelectedSignature: (value: string | null) => void;
  setIsMarketing: (value: boolean) => void;
  setDeliveryMode: (value: DeliveryMode) => void;
  setScheduledAt: (value: string) => void;
  applyTemplate: (template: EmailTemplate) => void;
  loadTemplates: () => void | Promise<void>;
}

function renderAttachmentWarning(attachments: ComposeAttachment[]) {
  const totalSize = attachments.reduce((sum, attachment) => {
    return sum + (attachment.fileSize || 0);
  }, 0);
  const totalMB = totalSize / 1024 / 1024;

  if (totalMB <= 20) {
    return null;
  }

  return (
    <div
      className={`text-xs p-2 rounded ${
        totalMB > 25
          ? "bg-destructive/10 text-destructive"
          : "bg-warning/10 text-warning"
      }`}
    >
      {totalMB > 25
        ? `Total size (${totalMB.toFixed(1)}MB) exceeds Gmail's 25MB limit.`
        : `Total size: ${totalMB.toFixed(1)}MB (approaching 25MB limit)`}
    </div>
  );
}

export function ComposeStep({
  showHtmlImport,
  htmlImportCode,
  showTemplateDialog,
  templates,
  templateSearch,
  isLoadingTemplates,
  subject,
  content,
  cc,
  bcc,
  showCc,
  showBcc,
  attachments,
  isUploading,
  csvData,
  csvHeaders,
  pdfColumn,
  showPersonalizedAttachments,
  signatures,
  selectedSignature,
  isMarketing,
  deliveryMode,
  scheduledAt,
  hasAbTestId,
  router,
  setShowHtmlImport,
  setHtmlImportCode,
  setShowTemplateDialog,
  setTemplateSearch,
  setSubject,
  setContent,
  setCc,
  setBcc,
  setShowCc,
  setShowBcc,
  handleFileUpload,
  removeAttachment,
  setPreviewAttachmentUrl,
  setShowAttachmentPreview,
  setShowPersonalizedAttachments,
  setPdfColumn,
  setSelectedSignature,
  setIsMarketing,
  setDeliveryMode,
  setScheduledAt,
  applyTemplate,
  loadTemplates,
}: ComposeStepProps) {
  useEffect(() => {
    setIsMarketing(hasAbTestId);
  }, [hasAbTestId, setIsMarketing]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">
          Start from scratch or use a template
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={showHtmlImport} onOpenChange={setShowHtmlImport}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <FileCode className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Import</span> HTML
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import HTML Template</DialogTitle>
                <DialogDescription>
                  Paste your HTML code to use as email content
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <textarea
                  value={htmlImportCode}
                  onChange={(e) => setHtmlImportCode(e.target.value)}
                  placeholder="Paste your HTML code here..."
                  className="w-full h-48 sm:h-64 p-3 rounded-md border bg-muted/50 font-mono text-xs sm:text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (htmlImportCode.trim()) {
                        setContent(htmlImportCode);
                        setShowHtmlImport(false);
                        setHtmlImportCode("");
                        toast.success("HTML template imported!");
                      }
                    }}
                    disabled={!htmlImportCode.trim()}
                    className="flex-1"
                  >
                    Import
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowHtmlImport(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <TemplatePickerDialog
            open={showTemplateDialog}
            onOpenChange={setShowTemplateDialog}
            templates={templates}
            templateSearch={templateSearch}
            onTemplateSearchChange={setTemplateSearch}
            isLoadingTemplates={isLoadingTemplates}
            onApplyTemplate={applyTemplate}
            onBrowseAllTemplates={() => {
              setShowTemplateDialog(false);
              router.push("/templates");
            }}
            onLoadTemplates={loadTemplates}
          />
        </div>
      </div>

      <div className="border rounded-xl shadow-sm bg-card overflow-hidden flex flex-col">
        <div className="flex items-center px-4 py-3 border-b bg-card gap-2">
          <Label
            htmlFor="subject"
            className="text-muted-foreground font-medium text-sm w-20 mb-0 shrink-0"
          >
            Subject:
          </Label>
          <Input
            id="subject"
            placeholder="Enter email subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border-0 focus-visible:ring-0 shadow-none px-0 bg-transparent flex-1 h-auto py-0 text-sm font-medium"
          />
          {!showCc && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setShowCc(true)}
            >
              Cc
            </Button>
          )}
          {!showBcc && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setShowBcc(true)}
            >
              Bcc
            </Button>
          )}
        </div>

        {showCc && (
          <div className="flex items-start px-4 py-2 border-b bg-card gap-2">
            <Label
              htmlFor="cc"
              className="text-muted-foreground font-medium text-sm w-20 mb-0 shrink-0 pt-1"
            >
              Cc:
            </Label>
            <EmailChipInput
              id="cc"
              value={cc}
              onChange={setCc}
              placeholder="Add Cc…"
            />
          </div>
        )}

        {showBcc && (
          <div className="flex items-start px-4 py-2 border-b bg-card gap-2">
            <Label
              htmlFor="bcc"
              className="text-muted-foreground font-medium text-sm w-20 mb-0 shrink-0 pt-1"
            >
              Bcc:
            </Label>
            <EmailChipInput
              id="bcc"
              value={bcc}
              onChange={setBcc}
              placeholder="Add Bcc…"
            />
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <LazyRichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Compose your email..."
            className="border-0 rounded-none bg-card shadow-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments
          <span className="text-xs text-muted-foreground font-normal">
            (Gmail limit: 25MB total)
          </span>
        </Label>

        {renderAttachmentWarning(attachments)}

        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <Badge
              key={file.tempId || index}
              variant={file.isProcessing ? "outline" : "secondary"}
              className={`flex items-center gap-2 py-2 ${
                file.isProcessing
                  ? "animate-pulse"
                  : "cursor-pointer hover:bg-secondary/80"
              }`}
              aria-disabled={file.isProcessing}
              onClick={() => {
                const attachmentUrl =
                  file.appwriteUrl || file.path || file.data;
                if (!attachmentUrl || file.isProcessing) {
                  return;
                }

                setPreviewAttachmentUrl(attachmentUrl);
                setShowAttachmentPreview(true);
              }}
            >
              {file.isProcessing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Paperclip className="h-3 w-3" />
              )}
              {file.name}
              {file.fileSize && (
                <span className="text-xs text-muted-foreground">
                  ({(file.fileSize / 1024 / 1024).toFixed(1)}MB)
                </span>
              )}
              {file.isProcessing && (
                <span className="text-xs text-muted-foreground">
                  {file.fileSize >= LARGE_FILE_THRESHOLD
                    ? "uploading..."
                    : "encoding..."}
                </span>
              )}
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  removeAttachment(index);
                }}
                className="hover:text-destructive"
                disabled={file.isProcessing}
                type="button"
                aria-label={`Remove attachment ${index + 1}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          <label className="cursor-pointer" htmlFor="file-upload">
            <input
              id="file-upload"
              type="file"
              multiple
              className="hidden"
              onClick={(e) => {
                // Reset to allow re-selecting the same file
                (e.target as HTMLInputElement).value = "";
              }}
              onChange={(e) =>
                e.target.files && handleFileUpload(e.target.files)
              }
              disabled={isUploading}
            />
            <Badge
              variant="outline"
              className={`flex items-center gap-2 py-2 ${
                isUploading
                  ? "pointer-events-none opacity-60"
                  : "cursor-pointer hover:bg-muted"
              }`}
              aria-disabled={isUploading}
            >
              {isUploading ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              Add Files
            </Badge>
          </label>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Personalized Attachments
            </Label>
            <p className="text-sm text-muted-foreground">
              Send a unique file to each recipient (e.g. certificates, invoices)
            </p>
          </div>
          <Switch
            checked={showPersonalizedAttachments}
            onCheckedChange={(checked) => {
              setShowPersonalizedAttachments(checked);
              if (!checked) {
                setPdfColumn(null);
              } else if (csvHeaders.length > 0 && !pdfColumn) {
                const detected = detectPdfColumn(csvHeaders);
                setPdfColumn(detected || csvHeaders[0]);
              }
            }}
          />
        </div>

        {showPersonalizedAttachments && (
          <div className="p-4 border rounded-lg bg-muted/30 space-y-4 animate-in fade-in slide-in-from-top-2">
            {csvData.length === 0 ? (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Please upload a CSV file in the Recipients tab first.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="attachment-column">
                  Select Attachment Column
                </Label>
                <select
                  id="attachment-column"
                  value={pdfColumn || ""}
                  onChange={(e) => setPdfColumn(e.target.value || null)}
                  className="w-full p-2 text-sm border rounded-md bg-background"
                >
                  <option value="">Select a column...</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}{" "}
                      {isPdfUrl(csvData[0]?.[header]) ? "(Detected Link)" : ""}
                    </option>
                  ))}
                </select>
                {pdfColumn && (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    <span>
                      {csvData.filter((row) => isPdfUrl(row[pdfColumn])).length}{" "}
                      valid links found in {csvData.length} rows
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Pen className="h-4 w-4" />
          Email Signature
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedSignature === null ? "secondary" : "outline"}
            size="sm"
            onClick={() => setSelectedSignature(null)}
          >
            No Signature
          </Button>
          {signatures.map((signature) => {
            const signatureId = signature.$id;
            if (!signatureId) {
              return null;
            }
            return (
              <Button
                key={signatureId}
                variant={
                  selectedSignature === signatureId ? "secondary" : "outline"
                }
                size="sm"
                onClick={() => setSelectedSignature(signatureId)}
              >
                {signature.name}
                {signature.is_default && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Default
                  </Badge>
                )}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/settings/signatures")}
          >
            Manage Signatures
          </Button>
        </div>
      </div>

      <div className="pt-6 border-t border-border/70">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-xl border bg-muted/20 flex items-center justify-center text-muted-foreground">
            <Settings className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Email options
            </h3>
            <p className="text-sm text-muted-foreground">
              Choose the email type and sending behaviour.
            </p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Email Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsMarketing(false)}
                disabled={hasAbTestId}
                className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                  !isMarketing
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                } ${hasAbTestId ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {!isMarketing && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`p-2 rounded-lg ${!isMarketing ? "bg-primary/10" : "bg-muted"}`}
                >
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Transactional</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Important emails like receipts or confirmations. Always
                    delivered, even to unsubscribed users.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsMarketing(true)}
                disabled={hasAbTestId}
                className={`relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                  isMarketing
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                } ${hasAbTestId ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {isMarketing && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`p-2 rounded-lg ${isMarketing ? "bg-primary/10" : "bg-muted"}`}
                >
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Marketing</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Promotional emails with unsubscribe link. Respects user
                    preferences.
                  </p>
                </div>
              </button>
            </div>
            {hasAbTestId && (
              <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Marketing mode is required for A/B testing
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Eye className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                All emails include open and click tracking for analytics
              </span>
            </div>
          </div>

          <div className="border-t" />

          <DeliveryOptions
            deliveryMode={deliveryMode}
            setDeliveryMode={setDeliveryMode}
            scheduledAt={scheduledAt}
            setScheduledAt={setScheduledAt}
          />
        </div>
      </div>
    </div>
  );
}
