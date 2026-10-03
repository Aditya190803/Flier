import { History, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sanitizeHTML } from "@/lib/email-formatting/sanitization";

import type { EmailDraft } from "./compose-types";

interface DraftRecoveryDialogProps {
  open: boolean;
  draft: EmailDraft | null;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onRestore: (draft: EmailDraft) => void;
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (seconds < 3600) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }
  const hours = Math.floor(seconds / 3600);
  if (seconds < 86400) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

export function DraftRecoveryDialog({
  open,
  draft,
  onOpenChange,
  onDiscard,
  onRestore,
}: DraftRecoveryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Recover Draft
          </DialogTitle>
          <DialogDescription>
            {draft
              ? `You have an unsaved draft from ${getTimeAgo(new Date(draft.savedAt))}. Would you like to restore it?`
              : "You have an unsaved draft. Would you like to restore it?"}
          </DialogDescription>
        </DialogHeader>

        {draft && (
          <div className="space-y-4 py-4">
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Subject</p>
                <p className="font-medium truncate">{draft.subject || "(No subject)"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Recipients</p>
                <p className="text-sm">
                  {draft.recipients.length > 0
                    ? `${draft.recipients.length} recipient${draft.recipients.length > 1 ? "s" : ""}`
                    : "No recipients"}
                </p>
              </div>
              {draft.content && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Preview</p>
                  <div
                    className="text-sm text-muted-foreground line-clamp-3 prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHTML(draft.content),
                    }}
                  />
                </div>
              )}
              {(draft.attachments?.length || 0) > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Attachments
                  </p>
                  <p className="text-sm">{draft.attachments?.length} file(s)</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDiscard}>
            <Trash2 className="h-4 w-4 mr-2" />
            Discard
          </Button>
          <Button disabled={!draft} onClick={() => draft && onRestore(draft)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Restore Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
