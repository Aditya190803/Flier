import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  RefreshCw,
  StopCircle,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  formatEmailSendErrorForUser,
  formatSendResultLabel,
  sendResultBadgeVariant,
} from "@/lib/gmail-user-message";

interface SendStatusItem {
  email?: string;
  status:
    "success" | "error" | "skipped" | "cancelled" | "pending" | "retrying";
  error?: string;
}

interface ProgressState {
  percentage: number;
  status: string;
}

interface SendingStatusDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  isSending: boolean;
  isStopping: boolean;
  progress: ProgressState;
  sendError?: string | null;
  sendStatus: SendStatusItem[];
  hasPendingRetries: boolean;
  failedEmails: unknown[];
  stopSending: () => void;
  retryFailedEmails: () => void;
  isOffline: boolean;
  isPaused: boolean;
  router: AppRouterInstance;
}

export function SendingStatusDialog({
  open,
  setOpen,
  isSending,
  isStopping,
  progress,
  sendError,
  sendStatus,
  hasPendingRetries,
  failedEmails,
  stopSending,
  retryFailedEmails,
  isOffline,
  isPaused,
  router,
}: SendingStatusDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isSending && !isStopping) {
          return;
        }
        setOpen(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isStopping ? (
              <StopCircle className="h-5 w-5 text-warning animate-pulse" />
            ) : isSending ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : progress.percentage === 100 && !sendError ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : sendError || hasPendingRetries ? (
              <AlertCircle className="h-5 w-5 text-warning" />
            ) : null}
            {isStopping
              ? "Stopping..."
              : isSending
                ? "Sending Emails..."
                : "Campaign Status"}
          </DialogTitle>
          <DialogDescription>{progress.status}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progress.percentage} className="h-3" />

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-success/10 rounded-lg">
              <div className="text-xl font-bold text-success">
                {
                  sendStatus.filter((status) => status.status === "success")
                    .length
                }
              </div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
            <div className="text-center p-3 bg-destructive/10 rounded-lg">
              <div className="text-xl font-bold text-destructive">
                {
                  sendStatus.filter((status) => status.status === "error")
                    .length
                }
              </div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-3 bg-warning/10 rounded-lg">
              <div className="text-xl font-bold text-warning">
                {
                  sendStatus.filter(
                    (status) =>
                      status.status === "skipped" ||
                      status.status === "cancelled" ||
                      status.status === "pending" ||
                      status.status === "retrying",
                  ).length
                }
              </div>
              <div className="text-xs text-muted-foreground">Remaining</div>
            </div>
          </div>

          {sendError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                {formatEmailSendErrorForUser(sendError)}
              </p>
            </div>
          )}

          {sendStatus.some(
            (s) =>
              s.email &&
              (s.status === "error" ||
                s.status === "cancelled" ||
                s.status === "skipped"),
          ) && (
            <div className="max-h-40 overflow-y-auto rounded-lg border divide-y text-sm">
              {sendStatus
                .filter(
                  (s) =>
                    s.email &&
                    (s.status === "error" ||
                      s.status === "cancelled" ||
                      s.status === "skipped"),
                )
                .map((s, i) => (
                  <div
                    key={`${s.email}-${i}`}
                    className="px-3 py-2 space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{s.email}</span>
                      <Badge
                        variant={sendResultBadgeVariant(s.status)}
                        className="text-[10px] shrink-0"
                      >
                        {formatSendResultLabel(s.status)}
                      </Badge>
                    </div>
                    {s.error && (
                      <p className="text-xs text-muted-foreground">
                        {formatEmailSendErrorForUser(s.error)}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}

          {isSending && !isStopping && (
            <Button
              onClick={stopSending}
              variant="destructive"
              className="w-full"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Sending
            </Button>
          )}

          {isOffline && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">
                Network disconnected. Waiting for connection...
              </p>
            </div>
          )}

          {isPaused && !isOffline && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning animate-pulse" />
              <p className="text-sm text-warning">
                Paused - waiting to resume...
              </p>
            </div>
          )}

          {isStopping && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-center">
              <p className="text-sm text-warning">
                Stopping after current email completes...
              </p>
            </div>
          )}

          {hasPendingRetries && !isSending && (
            <Button
              onClick={retryFailedEmails}
              variant="outline"
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Resume Sending ({failedEmails.length} remaining)
            </Button>
          )}

          {!isSending && (
            <Button
              onClick={() => {
                setOpen(false);
                if (progress.percentage === 100 && !sendError) {
                  router.push("/dashboard");
                }
              }}
              className="w-full"
            >
              {progress.percentage === 100 && !sendError ? "Done" : "Close"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
