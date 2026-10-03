import {
  BarChart3,
  CheckCircle,
  Copy,
  Download,
  Eye,
  MousePointer2,
  Search,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generatePDF, downloadFile } from "@/lib/activity/export";
import { getRecipientsArray } from "@/lib/activity/recipients";
import type { EmailCampaign } from "@/lib/appwrite";
import {
  formatEmailSendErrorForUser,
  formatSendResultLabel,
  sendResultBadgeVariant,
} from "@/lib/gmail-user-message";
import { cn } from "@/lib/utils";
import type { CampaignAnalytics } from "@/types/activity";

function copyEmailList(emails: string[]) {
  navigator.clipboard
    .writeText(emails.join(", "))
    .then(() => toast.success("Email list copied!"))
    .catch(() => {
      toast.error("Failed to copy");
    });
}

function downloadEmailList(emails: string[], campaignSubject: string) {
  const csvContent = emails.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${campaignSubject.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_recipients.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  toast.success("Recipients exported!");
}

interface CampaignRecipientsSectionProps {
  selectedCampaign: EmailCampaign;
  onOpenChange: (open: boolean) => void;
  recipientEngagement: any[];
  isLoadingEngagement: boolean;
  insightsCampaigns: CampaignAnalytics[];
  isExporting: boolean;
  setIsExporting: (value: boolean) => void;
  recipientSearch: string;
  setRecipientSearch: (value: string) => void;
  filterStatus: "all" | "success" | "failed";
  setFilterStatus: (value: "all" | "success" | "failed") => void;
  fetchHistory: () => void | Promise<void>;
}

export function CampaignRecipientsSection({
  selectedCampaign,
  onOpenChange,
  recipientEngagement,
  isLoadingEngagement,
  insightsCampaigns,
  isExporting,
  setIsExporting,
  recipientSearch,
  setRecipientSearch,
  filterStatus,
  setFilterStatus,
  fetchHistory,
}: CampaignRecipientsSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Recipients ({getRecipientsArray(selectedCampaign.recipients).length})
        </h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyEmailList(getRecipientsArray(selectedCampaign.recipients))}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadEmailList(
                getRecipientsArray(selectedCampaign.recipients),
                selectedCampaign.subject,
              )
            }
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open(
                `/api/activity/export?campaign_id=${selectedCampaign.$id}&format=csv`,
                "_blank",
              );
            }}
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            Export Tracking
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const analytics = insightsCampaigns.find((a) => a.id === selectedCampaign.$id);
              if (!analytics) {
                return;
              }

              setIsExporting(true);
              try {
                const pdf = await generatePDF({
                  campaigns: [analytics],
                  summary: {
                    totalCampaigns: 1,
                    totalRecipients: analytics.recipients,
                    totalSent: analytics.sent,
                    totalFailed: analytics.failed,
                    overallSuccessRate: analytics.successRate,
                    averageRecipientsPerCampaign: analytics.recipients,
                    totalOpens: analytics.opens,
                    totalClicks: analytics.clicks,
                    averageOpenRate: analytics.openRate,
                    averageClickRate: analytics.clickRate,
                  },
                  dateRange: {
                    start: new Date(analytics.createdAt),
                    end: new Date(analytics.createdAt),
                  },
                });
                downloadFile(pdf, `campaign-${selectedCampaign.$id}-report.pdf`, "application/pdf");
                toast.success("Campaign report exported!");
              } catch (_error) {
                toast.error("Failed to export PDF");
              } finally {
                setIsExporting(false);
              }
            }}
            disabled={isExporting}
          >
            <Download className="h-3 w-3 mr-1" />
            PDF Report
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Tracking Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all tracking events (opens, clicks) for this
                  campaign. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `/api/activity/delete?campaign_id=${selectedCampaign.$id}`,
                        { method: "DELETE" },
                      );
                      if (res.ok) {
                        toast.success("Tracking data deleted");
                        onOpenChange(false);
                        fetchHistory();
                      } else {
                        toast.error("Failed to delete data");
                      }
                    } catch (_error) {
                      toast.error("An error occurred");
                    }
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipients..."
            value={recipientSearch}
            onChange={(e) => setRecipientSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {selectedCampaign.send_results && (
          <div className="flex gap-1">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              All
            </Button>
            <Button
              variant={filterStatus === "success" ? "success" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("success")}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Sent
            </Button>
            <Button
              variant={filterStatus === "failed" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("failed")}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Failed
            </Button>
          </div>
        )}
      </div>

      {/* Recipients List */}
      <div className="bg-muted/50 border rounded-lg max-h-80 overflow-y-auto">
        {isLoadingEngagement ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading engagement data...</p>
          </div>
        ) : recipientEngagement.length > 0 ? (
          <div className="divide-y divide-border">
            {recipientEngagement
              .filter((r: any) => r.email.toLowerCase().includes(recipientSearch.toLowerCase()))
              .map((recipient: any, index: number) => (
                <div
                  key={index}
                  className="p-3 flex items-center justify-between hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-1.5 rounded-full",
                        recipient.opens > 0
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{recipient.email}</div>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Eye className="h-2.5 w-2.5" /> {recipient.opens} opens
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MousePointer2 className="h-2.5 w-2.5" /> {recipient.clicks} clicks
                        </span>
                        {recipient.last_active && (
                          <span className="text-[10px] text-muted-foreground">
                            Last active: {new Date(recipient.last_active).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {recipient.opens > 0 && (
                      <Badge variant="success" className="text-[10px] px-1.5 py-0">
                        Engaged
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ) : selectedCampaign.send_results && selectedCampaign.send_results.length > 0 ? (
          <div className="divide-y divide-border">
            {selectedCampaign.send_results
              .filter((result: any) => {
                const email = result.email || "";
                const matchesSearch = email.toLowerCase().includes(recipientSearch.toLowerCase());
                const matchesFilter =
                  filterStatus === "all" ||
                  (filterStatus === "success" && result.status === "success") ||
                  (filterStatus === "failed" && result.status !== "success");
                return matchesSearch && matchesFilter;
              })
              .map((result: any, index: number) => (
                <div
                  key={index}
                  className="p-3 flex items-center justify-between hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {result.status === "success" ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{result.email}</div>
                      {result.error && (
                        <div className="text-xs text-muted-foreground">
                          {formatEmailSendErrorForUser(result.error)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant={sendResultBadgeVariant(result.status)}>
                    {formatSendResultLabel(result.status)}
                  </Badge>
                </div>
              ))}
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {getRecipientsArray(selectedCampaign.recipients)
                .filter((email) => email.toLowerCase().includes(recipientSearch.toLowerCase()))
                .map((email, index) => (
                  <div key={index} className="bg-background rounded-lg p-2 text-sm truncate border">
                    {email}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {recipientSearch &&
        (selectedCampaign.send_results
          ? selectedCampaign.send_results.filter((r: any) =>
              r.email?.toLowerCase().includes(recipientSearch.toLowerCase()),
            ).length === 0
          : getRecipientsArray(selectedCampaign.recipients).filter((e) =>
              e.toLowerCase().includes(recipientSearch.toLowerCase()),
            ).length === 0) && (
          <p className="text-center text-muted-foreground text-sm py-2">
            No recipients found matching "{recipientSearch}"
          </p>
        )}
    </div>
  );
}
