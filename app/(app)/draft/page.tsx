"use client";

import { useEffect, useState, useCallback } from "react";

import Link from "next/link";

import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  Clock,
  Calendar,
  Mail,
  Users,
  Play,
  Pause,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  RefreshCw,
  Edit,
  ChevronLeft,
  ChevronRight,
  User,
  Copy,
  Paperclip,
  Plus,
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageShell, PageHeader, EmptyState } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { draftEmailsService, type DraftEmail } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";
import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "@/lib/constants";
import { replacePlaceholders } from "@/lib/email/placeholders";
import { getCookie } from "@/lib/utils";

export default function DraftPage() {
  const { session, status, router } = useAuthGuard();
  const [draftEmails, setDraftEmails] = useState<DraftEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<DraftEmail | null>(null);
  const [previewRecipientIndex, setPreviewRecipientIndex] = useState(0);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState<DraftEmail | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchDraftEmails = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await draftEmailsService.listByUser(session.user.email);
      setDraftEmails(response.documents);
    } catch (error) {
      componentLogger.error(
        "Error fetching draft emails",
        error instanceof Error ? error : undefined,
      );
      toast.error("Failed to load draft emails");
    }
    setIsLoading(false);
  }, [session?.user?.email]);

  useEffect(() => {
    if (!session?.user?.email) {
      return;
    }

    fetchDraftEmails();

    const unsubscribe = draftEmailsService.subscribeToUserDraftEmails(session.user.email, () =>
      fetchDraftEmails(),
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [session?.user?.email, fetchDraftEmails]);

  // Reset preview index when changing email
  useEffect(() => {
    setPreviewRecipientIndex(0);
  }, [previewEmail?.$id]);

  // Get personalized content for a specific recipient
  const getPreviewContent = (email: DraftEmail, recipientIndex: number) => {
    const recipientEmail = email.recipients[recipientIndex] || email.recipients[0];

    // Try to get recipient data from stored csv_data
    let recipientData: Record<string, string> = { email: recipientEmail };

    if (email.csv_data) {
      try {
        const csvData =
          typeof email.csv_data === "string" ? JSON.parse(email.csv_data) : email.csv_data;
        // Case-insensitive email matching
        const row = csvData.find((r: any) => {
          const rowEmail = r.email || r.Email || r.EMAIL || "";
          return rowEmail.toLowerCase() === recipientEmail.toLowerCase();
        });
        if (row) {
          // Normalize keys to lowercase for consistent placeholder matching
          recipientData = Object.entries(row).reduce(
            (acc, [key, value]) => {
              acc[key.toLowerCase()] = String(value);
              acc[key] = String(value); // Keep original case too
              return acc;
            },
            {} as Record<string, string>,
          );
        }
      } catch (e) {
        componentLogger.error("Error parsing csv_data", e instanceof Error ? e : undefined);
      }
    }

    return {
      email: recipientEmail,
      subject: replacePlaceholders(email.subject, recipientData),
      content: replacePlaceholders(email.content, recipientData),
      data: recipientData,
    };
  };

  const cancelDraftEmail = async (emailId: string) => {
    try {
      await draftEmailsService.cancel(emailId);
      toast.success("Draft email cancelled");
      fetchDraftEmails();
    } catch (error) {
      componentLogger.error("Error cancelling email", error instanceof Error ? error : undefined);
      toast.error("Failed to cancel draft email");
    }
  };

  const deleteDraftEmail = async (emailId: string) => {
    try {
      await draftEmailsService.delete(emailId);
      toast.success("Draft email deleted");
      fetchDraftEmails();
    } catch (error) {
      componentLogger.error("Error deleting email", error instanceof Error ? error : undefined);
      toast.error("Failed to delete draft email");
    }
  };

  const sendNow = async (email: DraftEmail) => {
    if (!email.$id) {
      return;
    }

    setSendingId(email.$id);

    try {
      // Call the send draft API (API will handle status updates)
      const csrfToken = getCookie(CSRF_TOKEN_NAME);
      const response = await fetch("/api/send-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        },
        body: JSON.stringify({ draftId: email.$id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send draft");
      }

      if (data.summary?.failed > 0) {
        toast.warning(
          `Sent ${data.summary.sent} of ${data.summary.total} emails. ${data.summary.failed} failed.`,
        );
      } else {
        toast.success("Draft sent successfully!");
      }
      fetchDraftEmails();
    } catch (error) {
      componentLogger.error("Error sending draft", error instanceof Error ? error : undefined);
      const errorMessage = error instanceof Error ? error.message : "Failed to send draft";
      toast.error(errorMessage);
      fetchDraftEmails(); // Refresh to show updated status
    } finally {
      setSendingId(null);
    }
  };

  const editDraftEmail = (email: DraftEmail) => {
    // Store the draft email data in sessionStorage for the compose page to pick up
    sessionStorage.setItem(
      "editDraftEmail",
      JSON.stringify({
        id: email.$id,
        subject: email.subject,
        content: email.content,
        recipients: email.recipients,
        saved_at: email.saved_at,
        attachments: email.attachments,
        csv_data: email.csv_data,
        cc: email.cc,
        bcc: email.bcc,
        // Include personalized attachment settings
        has_personalized_attachments: email.has_personalized_attachments,
        personalized_attachment_column: email.personalized_attachment_column,
      }),
    );
    router.push("/compose?edit=draft");
  };

  // Duplicate a draft email
  const duplicateDraftEmail = async (email: DraftEmail) => {
    if (!session?.user?.email) {
      return;
    }

    try {
      await draftEmailsService.create({
        subject: `${email.subject} (Copy)`,
        content: email.content,
        recipients: email.recipients,
        saved_at: new Date().toISOString(),
        attachments: email.attachments,
        csv_data: email.csv_data,
        cc: email.cc,
        bcc: email.bcc,
        // Include personalized attachment settings
        has_personalized_attachments: email.has_personalized_attachments,
        personalized_attachment_column: email.personalized_attachment_column,
      });
      toast.success("Draft duplicated!");
      fetchDraftEmails();
    } catch (error) {
      componentLogger.error("Error duplicating draft", error instanceof Error ? error : undefined);
      toast.error("Failed to duplicate draft");
    }
  };

  // Retry a failed draft
  const retryFailedDraft = async (email: DraftEmail) => {
    if (!email.$id) {
      return;
    }

    // Reset status to pending and try sending again
    try {
      await draftEmailsService.updateStatus(email.$id, "pending");
      toast.success("Draft reset - you can try sending again");
      fetchDraftEmails();
    } catch (error) {
      componentLogger.error("Error resetting draft", error instanceof Error ? error : undefined);
      toast.error("Failed to reset draft");
    }
  };

  const getStatusBadge = (email: DraftEmail) => {
    switch (email.status) {
      case "pending":
        if (isPast(new Date(email.saved_at))) {
          return (
            <Badge variant="default" className="flex items-center gap-1">
              <Send className="h-3 w-3" /> Ready to Send
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Saved
          </Badge>
        );
      case "sending":
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
  };

  if (status === "loading" || !isMounted || isLoading) {
    return (
      <PageShell>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          {[...Array(3)].map((_, idx) => (
            <Card key={idx}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-6 w-3/4" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
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

  const pendingEmails = draftEmails.filter((e) => e.status === "pending");
  const completedEmails = draftEmails.filter((e) =>
    ["sent", "failed", "cancelled"].includes(e.status),
  );

  return (
    <>
      <PageShell>
        <PageHeader
          title="Drafts"
          description="Saved campaigns wait here until you send them yourself"
          actions={
            <Button asChild>
              <Link href="/compose">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Link>
            </Button>
          }
        />

        {/* Pending Emails */}
        {pendingEmails.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Ready to send
              <Badge variant="secondary">{pendingEmails.length}</Badge>
            </h2>
            <div className="space-y-4">
              {pendingEmails.map((email) => (
                <Card key={email.$id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {getStatusBadge(email)}
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(email.saved_at), {
                              addSuffix: true,
                            })}
                          </span>
                          {/* Show attachment indicator */}
                          {(email.attachments?.length || 0) > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              {email.attachments?.length}
                            </Badge>
                          )}
                          {/* Show personalized attachment indicator */}
                          {email.has_personalized_attachments && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                              <Mail className="h-3 w-3" />
                              Personalized
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg mb-1 truncate">
                          {email.subject || "(No subject)"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(email.saved_at), "PPP p")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {email.recipients.length} recipient
                            {email.recipients.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Quick send button */}
                        <Button
                          size="sm"
                          onClick={() => sendNow(email)}
                          disabled={sendingId === email.$id}
                          className="hidden sm:flex"
                        >
                          {sendingId === email.$id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              Send
                            </>
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="More actions">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewEmail(email)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editDraftEmail(email)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateDraftEmail(email)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => sendNow(email)}
                              disabled={sendingId === email.$id}
                              className="sm:hidden"
                            >
                              {sendingId === email.$id ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-2" />
                              )}
                              {sendingId === email.$id ? "Sending..." : "Send Now"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => cancelDraftEmail(email.$id!)}
                              className="text-warning"
                            >
                              <Pause className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmEmail(email)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Emails */}
        {completedEmails.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Sent and closed
              <Badge variant="secondary">{completedEmails.length}</Badge>
            </h2>
            <div className="space-y-3">
              {completedEmails.map((email) => (
                <Card
                  key={email.$id}
                  className="opacity-75 hover:opacity-100 transition-all hover:shadow-sm"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getStatusBadge(email)}
                        <span className="font-medium truncate">
                          {email.subject || "(No subject)"}
                        </span>
                        {/* Show attachment indicator */}
                        {(email.attachments?.length || 0) > 0 && (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 flex-shrink-0"
                          >
                            <Paperclip className="h-3 w-3" />
                            {email.attachments?.length}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground flex-shrink-0">
                        <span className="hidden sm:inline">
                          {email.recipients.length} recipient
                          {email.recipients.length !== 1 ? "s" : ""}
                        </span>
                        <span className="hidden sm:inline">
                          {format(new Date(email.saved_at), "PP")}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="More actions">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewEmail(email)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateDraftEmail(email)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate as Draft
                            </DropdownMenuItem>
                            {email.status === "failed" && (
                              <DropdownMenuItem onClick={() => retryFailedDraft(email)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Retry
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirmEmail(email)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {email.status === "failed" && email.error && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive flex items-center justify-between">
                        <span>Error: {email.error}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryFailedDraft(email)}
                          className="ml-2"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {draftEmails.length === 0 && !isLoading && (
          <EmptyState
            icon={<Mail className="h-6 w-6" />}
            title="No drafts yet"
            description="Save emails as drafts and send them when you're ready"
            action={
              <Button asChild>
                <Link href="/compose">
                  <Send className="h-4 w-4 mr-2" />
                  Create New Email
                </Link>
              </Button>
            }
          />
        )}
      </PageShell>

      {/* Preview Dialog */}
      <Dialog open={!!previewEmail} onOpenChange={(open) => !open && setPreviewEmail(null)}>
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Saved {previewEmail && format(new Date(previewEmail.saved_at), "PPP p")}
            </DialogDescription>
          </DialogHeader>
          {previewEmail &&
            (() => {
              const preview = getPreviewContent(previewEmail, previewRecipientIndex);
              const hasPlaceholders = (previewEmail.subject + previewEmail.content).match(
                /\{\{?\w+\}?\}/,
              );

              return (
                <div className="space-y-4">
                  {/* Recipient Selector */}
                  {previewEmail.recipients.length > 1 && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPreviewRecipientIndex(Math.max(0, previewRecipientIndex - 1))
                        }
                        disabled={previewRecipientIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Recipient {previewRecipientIndex + 1} of {previewEmail.recipients.length}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPreviewRecipientIndex(
                            Math.min(previewEmail.recipients.length - 1, previewRecipientIndex + 1),
                          )
                        }
                        disabled={previewRecipientIndex >= previewEmail.recipients.length - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Personalization Data Badge */}
                  {hasPlaceholders && Object.keys(preview.data).length > 1 && (
                    <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm font-medium text-primary mb-2">Personalization Data:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(preview.data)
                          .filter(([key, value]) => value && key !== "email")
                          .map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {value}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">To</p>
                    <p className="font-medium">{preview.email}</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-1">Subject</p>
                    <p className="font-medium">{preview.subject}</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-white dark:bg-zinc-900">
                    <p className="text-sm text-muted-foreground mb-2">Content</p>
                    <div
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: preview.content }}
                    />
                  </div>

                  {/* Attachments */}
                  {(previewEmail.attachments?.length || 0) > 0 && (
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <Paperclip className="h-4 w-4" />
                        Attachments ({previewEmail.attachments?.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {previewEmail.attachments?.map((att, idx) => (
                          <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {att.fileName}
                            {att.fileSize && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({(att.fileSize / 1024).toFixed(1)}KB)
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmEmail}
        onOpenChange={(open) => !open && setDeleteConfirmEmail(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft Email</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmEmail?.subject}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmEmail(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmEmail?.$id) {
                  deleteDraftEmail(deleteConfirmEmail.$id);
                  setDeleteConfirmEmail(null);
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
