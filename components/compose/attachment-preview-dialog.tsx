import {
  AlertCircle,
  CheckCircle,
  Eye,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getGooglePreviewUrl } from "@/lib/attachments/url";

import type { AttachmentMetadata } from "./compose-types";

interface PreviewContent {
  email: string;
}

interface AttachmentPreviewDialogProps {
  open: boolean;
  previewAttachmentUrl: string | null;
  previewRecipientIndex: number;
  personalizedAttachmentMetadata: Record<string, AttachmentMetadata | null>;
  onOpenChange: (open: boolean) => void;
  getPersonalizedContent: (recipientIndex: number) => PreviewContent;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const normalizedBytes = Math.abs(bytes);
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(Math.floor(Math.log(normalizedBytes) / Math.log(k)), sizes.length - 1);
  const value = normalizedBytes / Math.pow(k, i);
  const prefix = bytes < 0 ? "-" : "";
  return `${prefix}${parseFloat(value.toFixed(1))} ${sizes[i]}`;
}

export function AttachmentPreviewDialog({
  open,
  previewAttachmentUrl,
  previewRecipientIndex,
  personalizedAttachmentMetadata,
  onOpenChange,
  getPersonalizedContent,
}: AttachmentPreviewDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Attachment Preview
          </DialogTitle>
          <DialogDescription>
            Preview of the personalized attachment for this recipient
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {previewAttachmentUrl && (
            <>
              {(() => {
                const preview = getPersonalizedContent(previewRecipientIndex);
                const metadata = personalizedAttachmentMetadata[preview.email];
                return metadata ? (
                  <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {metadata.fileType === "pdf" && <FileText className="h-8 w-8 text-red-500" />}
                      {metadata.fileType === "image" && (
                        <ImageIcon className="h-8 w-8 text-green-500" />
                      )}
                      {metadata.fileType === "document" && (
                        <FileText className="h-8 w-8 text-blue-500" />
                      )}
                      {metadata.fileType === "spreadsheet" && (
                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                      )}
                      {metadata.fileType === "presentation" && (
                        <FileText className="h-8 w-8 text-orange-500" />
                      )}
                      {metadata.fileType === "other" && (
                        <Paperclip className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{metadata.fileName}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>
                          {metadata.source === "google-drive" && "Google Drive"}
                          {metadata.source === "onedrive" && "OneDrive"}
                          {metadata.source === "dropbox" && "Dropbox"}
                          {metadata.source === "direct" && "Direct Link"}
                        </span>
                        {metadata.fileSize !== null && metadata.fileSize !== undefined && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(metadata.fileSize)}</span>
                          </>
                        )}
                        {metadata.accessible && (
                          <>
                            <span>•</span>
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Accessible
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(previewAttachmentUrl, "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                ) : null;
              })()}

              <div className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                {previewAttachmentUrl.includes("drive.google.com") ||
                previewAttachmentUrl.includes("docs.google.com") ? (
                  <div className="w-full h-[60vh]">
                    <iframe
                      src={getGooglePreviewUrl(previewAttachmentUrl)}
                      className="w-full h-full border-0"
                      title="Attachment Preview"
                      sandbox="allow-scripts"
                    />
                  </div>
                ) : previewAttachmentUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i) ? (
                  <div className="flex items-center justify-center p-8 max-h-[60vh] overflow-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewAttachmentUrl}
                      alt="Attachment preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                    <div className="hidden text-center text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                      <p>Could not load image preview</p>
                    </div>
                  </div>
                ) : previewAttachmentUrl.match(/\.pdf(\?|$)/i) ? (
                  <div className="w-full h-[60vh]">
                    <iframe
                      src={previewAttachmentUrl}
                      className="w-full h-full border-0"
                      title="PDF Preview"
                      sandbox=""
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 bg-muted rounded-full mb-4">
                      <Paperclip className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium mb-2">Preview Not Available</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      This file type cannot be previewed directly in the browser.
                    </p>
                    <Button
                      variant="default"
                      onClick={() => window.open(previewAttachmentUrl, "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open in New Tab to View
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground break-all">
                <strong>URL:</strong> {previewAttachmentUrl}
              </p>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
