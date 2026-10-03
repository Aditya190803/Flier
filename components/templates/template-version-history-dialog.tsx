import { History, RotateCcw } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmailTemplate, TemplateVersion } from "@/lib/appwrite";

interface TemplateVersionHistoryDialogProps {
  open: boolean;
  versions: TemplateVersion[];
  isLoadingVersions: boolean;
  isLoading: boolean;
  versioningTemplate: EmailTemplate | null;
  formatDate: (dateValue: string) => string;
  onOpenChange: (open: boolean) => void;
  onRestoreVersion: (version: TemplateVersion) => void;
  onClose: () => void;
}

export function TemplateVersionHistoryDialog({
  open,
  versions,
  isLoadingVersions,
  isLoading,
  versioningTemplate,
  formatDate,
  onOpenChange,
  onRestoreVersion,
  onClose,
}: TemplateVersionHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
          <DialogDescription>
            {versioningTemplate?.name
              ? `${versioningTemplate.name} - View and restore previous versions`
              : "View and restore previous versions"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {isLoadingVersions ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No version history</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Version history will appear here when you save versions while editing this template.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 border-2 border-primary rounded-lg bg-primary/5">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {versioningTemplate?.version || "?"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      Version {versioningTemplate?.version || "?"}
                    </span>
                    <Badge>Current</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last updated{" "}
                    {versioningTemplate?.updated_at
                      ? formatDate(versioningTemplate.updated_at)
                      : "Unknown"}
                  </p>
                </div>
              </div>

              {versions.map((version) => (
                <div
                  key={version.$id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                    {version.version}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Version {version.version}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {version.change_note || `Saved on ${formatDate(version.created_at)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Subject: {version.subject}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isLoading}>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore Version {version.version}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will replace the current template content with version{" "}
                          {version.version}. The current version will be saved to history before
                          restoring.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={isLoading}
                          onClick={() => {
                            if (isLoading) {
                              return;
                            }
                            onRestoreVersion(version);
                          }}
                        >
                          Restore
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
