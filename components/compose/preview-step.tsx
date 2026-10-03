import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Mail,
  Monitor,
  Paperclip,
  Smartphone,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PersonalizedPreview {
  email: string;
  subject: string;
  content: string;
  data?: Record<string, string>;
}

interface PreviewStepProps {
  previewMode: "desktop" | "mobile";
  setPreviewMode: (mode: "desktop" | "mobile") => void;
  setShowClientPreview: (open: boolean) => void;
  recipients: string[];
  previewRecipientIndex: number;
  setPreviewRecipientIndex: (index: number) => void;
  getPersonalizedContent: (recipientIndex: number) => PersonalizedPreview;
  subject: string;
  content: string;
  cc?: string;
  bcc?: string;
  csvData: Record<string, string>[];
  manualEntries: { email: string; name: string }[];
  isLoadingPreview: boolean;
  formattedPreviewHtml: string;
  createGmailPreviewWrapper: (html: string) => string;
  attachments: { name: string }[];
  pdfColumn: string | null;
}

export function PreviewStep({
  previewMode,
  setPreviewMode,
  setShowClientPreview,
  recipients,
  previewRecipientIndex,
  setPreviewRecipientIndex,
  getPersonalizedContent,
  subject,
  content,
  cc = "",
  bcc = "",
  csvData,
  manualEntries,
  isLoadingPreview,
  formattedPreviewHtml,
  createGmailPreviewWrapper,
  attachments,
  pdfColumn,
}: PreviewStepProps) {
  const preview = getPersonalizedContent(previewRecipientIndex);
  const hasPlaceholders = (subject + content).match(/\{\{?\w+\}?\}/);
  const csvRow = csvData.find((row) => row.email === preview.email);
  const manualEntry = manualEntries.find((entry) => entry.email === preview.email);
  const personalizationEntries = Object.entries(preview.data || {})
    .filter(([key, value]) => value && key !== "email")
    .slice(0, 10);
  const showPersonalization =
    !!hasPlaceholders && (csvRow || manualEntry) && personalizationEntries.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 text-success" />
          <span>Gmail-accurate preview</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
            <Button
              variant={previewMode === "desktop" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("desktop")}
              className="flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Desktop</span>
            </Button>
            <Button
              variant={previewMode === "mobile" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPreviewMode("mobile")}
              className="flex items-center gap-2"
            >
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Mobile</span>
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClientPreview(true)}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Client preview</span>
            <span className="sm:hidden">Clients</span>
          </Button>
        </div>
      </div>

      <div
        className={`rounded-xl border bg-background overflow-hidden ${
          previewMode === "mobile" ? "max-w-[390px] mx-auto" : ""
        }`}
      >
        <div className="border-b bg-muted/20 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">To</p>
              <p className="text-sm font-medium truncate">
                {recipients.length > 0 ? preview.email : "recipient@example.com"}
              </p>
            </div>
            <div className="text-right min-w-0">
              <p className="text-xs text-muted-foreground truncate">Subject</p>
              <p className="text-sm font-semibold truncate">
                {preview.subject || subject || "(No subject)"}
              </p>
            </div>
          </div>
          {(cc.trim() || bcc.trim()) && (
            <div className="grid gap-1 text-sm">
              {cc.trim() ? (
                <p className="truncate">
                  <span className="text-xs text-muted-foreground mr-2">Cc</span>
                  {cc.trim()}
                </p>
              ) : null}
              {bcc.trim() ? (
                <p className="truncate">
                  <span className="text-xs text-muted-foreground mr-2">Bcc</span>
                  {bcc.trim()}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {recipients.length > 0 && (
          <div className="border-b px-3 py-2 bg-background">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setPreviewRecipientIndex(Math.max(0, previewRecipientIndex - 1))}
                disabled={previewRecipientIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Recipient {previewRecipientIndex + 1} of {recipients.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setPreviewRecipientIndex(
                    Math.min(recipients.length - 1, previewRecipientIndex + 1),
                  )
                }
                disabled={previewRecipientIndex >= recipients.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {showPersonalization && (
          <div className="border-b bg-primary/[0.035] px-4 py-3">
            <p className="text-xs font-medium text-primary mb-2">Personalization</p>
            <div className="flex flex-wrap gap-2">
              {personalizationEntries.map(([key, value]) => (
                <Badge key={key} variant="outline" className="text-xs bg-background/60">
                  {key}: {String(value)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          {!content ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <Eye className="h-8 w-8 text-muted-foreground/60 mb-3" />
              <p className="text-sm font-medium">Nothing to preview yet</p>
              <p className="text-sm text-muted-foreground">
                Write your email in Compose, then come back to preview it here.
              </p>
            </div>
          ) : isLoadingPreview ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Formatting preview…</p>
            </div>
          ) : (
            <iframe
              srcDoc={
                formattedPreviewHtml ||
                createGmailPreviewWrapper(
                  content || "<p>Your email content will appear here...</p>",
                )
              }
              className={`w-full border-0 bg-white ${
                previewMode === "mobile" ? "h-[520px]" : "h-[440px]"
              }`}
              title={`Email preview for ${preview.email || "recipient"}`}
              sandbox="allow-same-origin"
            />
          )}
        </div>

        {(attachments.length > 0 || (pdfColumn && preview.data?.[pdfColumn])) && (
          <div className="border-t px-4 py-3 bg-muted/20">
            <p className="text-sm font-medium mb-2">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <Badge key={`${attachment.name}-${index}`} variant="secondary">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {attachment.name}
                </Badge>
              ))}
              {pdfColumn && preview.data?.[pdfColumn] && (
                <Badge key="personalized-pdf" variant="secondary" className="bg-primary/10">
                  <Paperclip className="h-3 w-3 mr-1" />
                  Personalized PDF ({preview.data[pdfColumn]})
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
