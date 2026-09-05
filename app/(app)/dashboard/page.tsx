"use client";

import { useEffect, useState, useCallback } from "react";

import { useRouter } from "next/navigation";

import {
  Mail,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Download,
  FileText,
  ExternalLink,
  Paperclip,
  Loader2,
  Eye,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmailCampaign } from "@/lib/appwrite";
import { campaignsService } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";
import { getEmailPreview } from "@/lib/email-formatting/client";
import {
  formatEmailSendErrorForUser,
  formatSendResultLabel,
  sendResultBadgeVariant,
} from "@/lib/gmail-user-message";
import { parseRecipients } from "@/lib/utils/recipients";

import { ActivityChart } from "./_components/activity-chart";
import { AnalyticsMetrics } from "./_components/analytics-metrics";
import { DashboardHeader } from "./_components/dashboard-header";
import { EngagementFunnel } from "./_components/engagement-funnel";
import { RecentActivityFeed } from "./_components/recent-activity";

/* ── helpers ─────────────────────────────────────────────── */
const getAttachmentUrl = (a: {
  fileUrl?: string;
  appwrite_file_id?: string;
}) => {
  if (a.appwrite_file_id) {
    return `/api/appwrite/attachments/${a.appwrite_file_id}`;
  }
  if (a.fileUrl) {
    const m = a.fileUrl.match(/\/files\/([^/]+)\//);
    if (m?.[1]) {
      return `/api/appwrite/attachments/${m[1]}`;
    }
  }
  return a.fileUrl || "#";
};

function formatDate(v: string) {
  try {
    return new Date(v).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

function createGmailPreviewWrapper(html: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222;background:#fff;-webkit-font-smoothing:antialiased;word-wrap:break-word}
    *{max-width:100%;box-sizing:border-box}h1{font-size:2em;font-weight:bold;margin:.67em 0}h2{font-size:1.5em;font-weight:bold;margin:.75em 0}
    h3{font-size:1.17em;font-weight:bold;margin:.83em 0}p,div{margin:.5em 0;word-wrap:break-word}ul,ol{padding-left:1.5em;margin:.5em 0}
    a{color:#1a73e8}img{max-width:100%;height:auto}pre{white-space:pre-wrap;font-family:monospace}blockquote{border-left:4px solid #e8eaed;margin:8px 0;padding:0 12px;color:#555}
  </style></head><body>${html}</body></html>`;
}

/* ── loading skeleton ────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <PageShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
        <div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </PageShell>
  );
}

/* ── page ────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCampaign, setSelectedCampaign] =
    useState<EmailCampaign | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "success" | "failed"
  >("all");
  const [previewHtml, setPreviewHtml] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (
      status === "unauthenticated" ||
      (status === "authenticated" && session?.error)
    ) {
      router.push("/");
    }
  }, [status, session?.error, router]);

  /* load preview html */
  useEffect(() => {
    let isActive = true;
    if (!selectedCampaign?.content) {
      setPreviewHtml("");
      return;
    }
    const content = selectedCampaign.content;
    setIsLoadingPreview(true);
    getEmailPreview(content)
      .then((h) => {
        if (isActive) {
          setPreviewHtml(createGmailPreviewWrapper(h));
        }
      })
      .catch(() => {
        if (isActive) {
          setPreviewHtml(createGmailPreviewWrapper(content));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingPreview(false);
        }
      });
    return () => {
      isActive = false;
    };
  }, [selectedCampaign]);

  /* fetch campaigns */
  const fetchCampaigns = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }
    try {
      const res = await campaignsService.listByUser(session.user.email);
      setCampaigns(res.documents);
    } catch (e: any) {
      componentLogger.error("Error loading campaigns", e);
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (!session?.user?.email) {
      return;
    }
    fetchCampaigns();
    const unsub = campaignsService.subscribeToUserCampaigns(
      session.user.email,
      () => fetchCampaigns(),
    );
    return () => {
      if (unsub) {
        unsub();
      }
    };
  }, [session?.user?.email, fetchCampaigns]);

  /* actions */
  const duplicateCampaign = (c: EmailCampaign) => {
    setIsDuplicating(true);
    try {
      sessionStorage.setItem(
        "duplicateCampaign",
        JSON.stringify({
          subject: `${c.subject} (Copy)`,
          content: c.content || "",
          recipients: parseRecipients(c.recipients),
          attachments: c.attachments || [],
        }),
      );
      toast.success("Campaign copied! Redirecting to compose…");
      router.push("/compose");
    } catch (_error) {
      toast.error("Failed to copy campaign");
    } finally {
      setIsDuplicating(false);
    }
  };

  const exportCampaignResults = (c: EmailCampaign) => {
    const headers = ["Email", "Status", "Error Message", "Sent At"];
    const rows: string[][] = c.send_results?.length
      ? c.send_results.map((r: any) => [
          r.email || "",
          formatSendResultLabel(r.status),
          r.error ? formatEmailSendErrorForUser(r.error) : "",
          r.timestamp || c.created_at || "",
        ])
      : parseRecipients(c.recipients).map((e) => [
          e,
          "Unknown",
          "",
          c.created_at || "",
        ]);

    const csvContent = [
      `# Campaign: ${c.subject}`,
      `# Sent: ${formatDate(c.created_at)}`,
      `# Total: ${parseRecipients(c.recipients).length}`,
      headers.join(","),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `campaign_results_${c.subject.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`,
    });
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Results exported!");
  };

  /* guards */
  if (status === "loading" || !isMounted || isLoading) {
    return <DashboardSkeleton />;
  }
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <>
      <PageShell>
        {/* Header */}
        <DashboardHeader
          userName={session?.user?.name?.split(" ")[0] || "there"}
        />

        {/* KPI Cards */}
        <AnalyticsMetrics campaigns={campaigns} />

        {/* Chart + Engagement Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityChart campaigns={campaigns} />
          </div>
          <div>
            <EngagementFunnel campaigns={campaigns} />
          </div>
        </div>

        {/* Recent Campaigns Table */}
        <RecentActivityFeed
          campaigns={campaigns}
          onViewDetails={setSelectedCampaign}
          onDuplicate={duplicateCampaign}
          isDuplicating={isDuplicating}
        />
      </PageShell>

      {/* Campaign Details Modal */}
      <Dialog
        open={!!selectedCampaign}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCampaign(null);
            setRecipientSearch("");
            setFilterStatus("all");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Campaign Details
                </DialogTitle>
                <DialogDescription>
                  Full delivery information for this campaign
                </DialogDescription>
              </div>
              {selectedCampaign && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportCampaignResults(selectedCampaign)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDuplicating}
                    onClick={() => {
                      duplicateCampaign(selectedCampaign);
                      setSelectedCampaign(null);
                    }}
                  >
                    {isDuplicating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {isDuplicating ? "Loading…" : "Duplicate"}
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedCampaign && (
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* campaign stat strip */}
              <div className="border border-border/50 rounded-xl bg-[var(--color-chart-1)]/[0.02] shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{selectedCampaign.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sent {formatDate(selectedCampaign.created_at)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      selectedCampaign.status === "completed"
                        ? "success"
                        : selectedCampaign.status === "sending"
                          ? "warning"
                          : "destructive"
                    }
                    className="capitalize shrink-0"
                  >
                    {selectedCampaign.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    {
                      label: "Total",
                      value: parseRecipients(selectedCampaign.recipients)
                        .length,
                      colour: "text-foreground",
                    },
                    {
                      label: "Sent",
                      value: selectedCampaign.sent,
                      colour: "text-chart-1",
                    },
                    {
                      label: "Failed",
                      value: selectedCampaign.failed,
                      colour: "text-chart-2",
                    },
                    {
                      label: "Files",
                      value: selectedCampaign.attachments?.length || 0,
                      colour: "text-muted-foreground",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-background rounded-lg p-3 text-center border"
                    >
                      <p className={`text-2xl font-bold ${s.colour}`}>
                        {s.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* email preview */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  Email Preview
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/30 border-b text-sm">
                    <span className="text-muted-foreground">Subject: </span>
                    <span className="font-medium">
                      {selectedCampaign.subject}
                    </span>
                  </div>
                  {isLoadingPreview ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : selectedCampaign.content ? (
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-[280px] border-0 bg-white"
                      title="Email preview"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground italic">
                      No preview available
                    </p>
                  )}
                </div>
              </div>

              {/* attachments */}
              {(selectedCampaign.attachments?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    Attachments ({selectedCampaign.attachments!.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCampaign.attachments!.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-muted/30 border rounded-lg p-3"
                      >
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {att.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(att.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button variant="outline" size="icon-sm" asChild>
                          <a
                            href={getAttachmentUrl(att)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* recipients */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Recipients (
                    {parseRecipients(selectedCampaign.recipients).length})
                  </h4>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search recipients…"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="flex-1 h-8 text-sm"
                  />
                  {selectedCampaign.send_results && (
                    <div className="flex gap-1">
                      {(["all", "success", "failed"] as const).map((f) => (
                        <Button
                          key={f}
                          variant={
                            filterStatus === f
                              ? f === "success"
                                ? "default"
                                : f === "failed"
                                  ? "destructive"
                                  : "default"
                              : "outline"
                          }
                          size="sm"
                          className="h-8 capitalize text-xs"
                          onClick={() => setFilterStatus(f)}
                        >
                          {f === "success" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : f === "failed" ? (
                            <XCircle className="h-3 w-3 mr-1" />
                          ) : null}
                          {f}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border rounded-lg max-h-56 overflow-y-auto divide-y">
                  {selectedCampaign.send_results?.length ? (
                    selectedCampaign.send_results
                      .filter((r: any) => {
                        const match = (r.email || "")
                          .toLowerCase()
                          .includes(recipientSearch.toLowerCase());
                        const filt =
                          filterStatus === "all" ||
                          (filterStatus === "success" &&
                            r.status === "success") ||
                          (filterStatus === "failed" && r.status !== "success");
                        return match && filt;
                      })
                      .map((r: any, i: number) => (
                        <div
                          key={i}
                          className="px-4 py-2.5 hover:bg-muted/30 text-sm space-y-0.5"
                        >
                          <div className="flex items-center gap-3">
                            {r.status === "success" ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            ) : r.status === "cancelled" ? (
                              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            )}
                            <span className="flex-1 truncate">{r.email}</span>
                            <Badge
                              variant={sendResultBadgeVariant(r.status)}
                              className="text-[10px] shrink-0"
                            >
                              {formatSendResultLabel(r.status)}
                            </Badge>
                          </div>
                          {r.error && (
                            <p className="text-xs text-muted-foreground pl-6">
                              {formatEmailSendErrorForUser(r.error)}
                            </p>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="p-3 grid grid-cols-2 gap-2">
                      {parseRecipients(selectedCampaign.recipients)
                        .filter((e) =>
                          e
                            .toLowerCase()
                            .includes(recipientSearch.toLowerCase()),
                        )
                        .map((e, i) => (
                          <div
                            key={i}
                            className="text-sm bg-muted/30 rounded-lg px-3 py-1.5 truncate border"
                          >
                            {e}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
