"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle,
  Clock,
  Mail,
  MoreVertical,
  Paperclip,
  Pause,
  RefreshCw,
  Send,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmptyState,
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { scheduledCampaignsService } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";
import {
  getBrowserTimeZone,
  getMaxScheduleValue,
  getMinScheduleValue,
  toDateTimeLocalValue,
  validateScheduleValue,
} from "@/lib/schedule";
import type { ScheduledCampaign } from "@/types/appwrite-client";

/** Statuses that still have a pending send behind them. */
const ACTIVE_STATUSES = ["scheduled", "processing"];

function StatusBadge({ campaign }: { campaign: ScheduledCampaign }) {
  switch (campaign.status) {
    case "scheduled":
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> Scheduled
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="info" className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" /> Sending
        </Badge>
      );
    case "sent":
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Sent
        </Badge>
      );
    case "partial":
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Partially sent
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Pause className="h-3 w-3" /> Cancelled
        </Badge>
      );
    default:
      return null;
  }
}

export default function ScheduledPage() {
  const { session, status } = useAuthGuard();
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScheduledCampaign | null>(
    null,
  );
  const [rescheduleTarget, setRescheduleTarget] =
    useState<ScheduledCampaign | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }

    try {
      const response = await scheduledCampaignsService.listByUser();
      setCampaigns(response.documents);
    } catch (error) {
      componentLogger.error(
        "Error fetching scheduled campaigns",
        error instanceof Error ? error : undefined,
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load scheduled campaigns",
      );
    }
    setIsLoading(false);
  }, [session?.user?.email]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // A campaign due in the next few minutes will change state without any user
  // action, so poll while anything is still in flight.
  useEffect(() => {
    const hasActive = campaigns.some((c) => ACTIVE_STATUSES.includes(c.status));
    if (!hasActive) {
      return;
    }
    const interval = setInterval(fetchCampaigns, 30_000);
    return () => clearInterval(interval);
  }, [campaigns, fetchCampaigns]);

  const cancelCampaign = async (campaign: ScheduledCampaign) => {
    if (!campaign.$id) {
      return;
    }
    setBusyId(campaign.$id);
    try {
      await scheduledCampaignsService.cancel(campaign.$id);
      toast.success("Campaign cancelled");
      await fetchCampaigns();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel campaign",
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteCampaign = async (campaign: ScheduledCampaign) => {
    if (!campaign.$id) {
      return;
    }
    try {
      await scheduledCampaignsService.delete(campaign.$id);
      toast.success("Scheduled campaign deleted");
      await fetchCampaigns();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete campaign",
      );
    }
  };

  const openReschedule = (campaign: ScheduledCampaign) => {
    setRescheduleTarget(campaign);
    setRescheduleValue(toDateTimeLocalValue(new Date(campaign.scheduled_at)));
  };

  const submitReschedule = async () => {
    if (!rescheduleTarget?.$id) {
      return;
    }

    const check = validateScheduleValue(rescheduleValue);
    if (!check.valid || !check.date) {
      toast.error(check.error || "Pick a valid send time");
      return;
    }

    setBusyId(rescheduleTarget.$id);
    try {
      await scheduledCampaignsService.reschedule(
        rescheduleTarget.$id,
        check.date.toISOString(),
        getBrowserTimeZone(),
      );
      toast.success(`Rescheduled for ${check.date.toLocaleString()}`);
      setRescheduleTarget(null);
      await fetchCampaigns();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reschedule",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (status === "loading" || !isMounted || isLoading) {
    return (
      <PageShell>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, idx) => (
            <Card key={idx}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div>
                    <Skeleton className="h-7 w-8 mb-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, idx) => (
            <Card key={idx}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-56" />
              </CardContent>
            </Card>
          ))}
        </div>
      </PageShell>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const upcoming = campaigns.filter((c) => ACTIVE_STATUSES.includes(c.status));
  const past = campaigns.filter((c) => !ACTIVE_STATUSES.includes(c.status));

  return (
    <>
      <PageShell>
        <PageHeader
          title="Scheduled Campaigns"
          description="Campaigns queued to send automatically at a chosen time"
          actions={
            <Button asChild>
              <Link href="/compose">
                <Send className="h-4 w-4 mr-2" />
                New Campaign
              </Link>
            </Button>
          }
        />

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CalendarClock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Sent without you</p>
                <p className="text-sm text-muted-foreground">
                  These are dispatched server-side, so you can close the app.
                  Times shown are in your local zone ({getBrowserTimeZone()}).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Upcoming"
            value={upcoming.length}
            icon={<Clock className="h-5 w-5 text-primary" />}
            accentClass="border-primary/20 bg-primary/5"
          />
          <StatCard
            label="Sent"
            value={campaigns.filter((c) => c.status === "sent").length}
            icon={<CheckCircle className="h-5 w-5 text-success" />}
            accentClass="border-success/20 bg-success/5"
          />
          <StatCard
            label="Failed"
            value={campaigns.filter((c) => c.status === "failed").length}
            icon={<XCircle className="h-5 w-5 text-destructive" />}
            accentClass="border-destructive/20 bg-destructive/5"
          />
          <StatCard
            label="Cancelled"
            value={campaigns.filter((c) => c.status === "cancelled").length}
            icon={<Pause className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Upcoming
            </h2>
            <div className="space-y-4">
              {upcoming.map((campaign) => {
                const sendAt = new Date(campaign.scheduled_at);
                const isProcessing = campaign.status === "processing";
                return (
                  <Card
                    key={campaign.$id}
                    className="group hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <StatusBadge campaign={campaign} />
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(sendAt, {
                                addSuffix: true,
                              })}
                            </span>
                            {(campaign.attachments?.length || 0) > 0 && (
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1"
                              >
                                <Paperclip className="h-3 w-3" />
                                {campaign.attachments?.length}
                              </Badge>
                            )}
                            {campaign.is_marketing && (
                              <Badge variant="secondary" className="text-xs">
                                Marketing
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg mb-1 truncate">
                            {campaign.subject || "(No subject)"}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarClock className="h-4 w-4" />
                              {format(sendAt, "PPP p")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {campaign.recipients.length} recipient
                              {campaign.recipients.length !== 1 ? "s" : ""}
                            </span>
                            {(campaign.sent || 0) > 0 && (
                              <span className="flex items-center gap-1">
                                <Send className="h-4 w-4" />
                                {campaign.sent} sent so far
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReschedule(campaign)}
                            disabled={isProcessing || busyId === campaign.$id}
                            className="hidden sm:flex"
                          >
                            <CalendarClock className="h-4 w-4 mr-1" />
                            Reschedule
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openReschedule(campaign)}
                                disabled={isProcessing}
                                className="sm:hidden"
                              >
                                <CalendarClock className="h-4 w-4 mr-2" />
                                Reschedule
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => cancelCampaign(campaign)}
                                disabled={isProcessing}
                                className="text-warning"
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(campaign)}
                                disabled={isProcessing}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {isProcessing && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          This campaign is being sent right now — it can't be
                          changed until it finishes.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              History
            </h2>
            <div className="space-y-3">
              {past.map((campaign) => (
                <Card
                  key={campaign.$id}
                  className="opacity-75 hover:opacity-100 transition-all hover:shadow-sm"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <StatusBadge campaign={campaign} />
                        <span className="font-medium truncate">
                          {campaign.subject || "(No subject)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground flex-shrink-0">
                        <span className="hidden sm:inline">
                          {campaign.sent || 0}/{campaign.recipients.length} sent
                        </span>
                        <span className="hidden md:inline">
                          {format(new Date(campaign.scheduled_at), "PP p")}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(campaign)}
                          aria-label="Delete scheduled campaign"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {campaign.last_error && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                        {campaign.last_error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {campaigns.length === 0 && (
          <EmptyState
            icon={<Mail className="h-6 w-6" />}
            title="Nothing scheduled"
            description="Pick 'Schedule' in the composer to queue a campaign for later"
            action={
              <Button asChild>
                <Link href="/compose">
                  <Send className="h-4 w-4 mr-2" />
                  New Campaign
                </Link>
              </Button>
            }
          />
        )}
      </PageShell>

      <Dialog
        open={!!rescheduleTarget}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule campaign</DialogTitle>
            <DialogDescription>
              "{rescheduleTarget?.subject}" will be sent at the new time
              instead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reschedule-at">Send at</Label>
            <Input
              id="reschedule-at"
              type="datetime-local"
              value={rescheduleValue}
              min={getMinScheduleValue()}
              max={getMaxScheduleValue()}
              onChange={(event) => setRescheduleValue(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your local time ({getBrowserTimeZone()})
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitReschedule}
              disabled={busyId === rescheduleTarget?.$id}
            >
              Save new time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scheduled campaign</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.subject}" will be removed and never sent. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteCampaign(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
