import { Clock, ExternalLink, FileText, Mail, Paperclip } from "lucide-react";

import {
  PieChartWidget,
  LineChartWidget,
} from "@/components/activity/dashboard-widgets";
import { EmailHeatmapOverlay } from "@/components/activity/heatmap-overlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getRecipientsArray } from "@/lib/activity/recipients";
import type { EmailCampaign } from "@/lib/appwrite";
import { formatDate } from "@/lib/utils";
import type { CampaignAnalytics, ClickHeatmapData } from "@/types/activity";

import { CampaignRecipientsSection } from "./campaign-recipients-section";

function getAttachmentUrl(attachment: {
  fileUrl?: string;
  appwrite_file_id?: string;
}) {
  if (attachment.appwrite_file_id) {
    return `/api/appwrite/attachments/${attachment.appwrite_file_id}`;
  }
  if (attachment.fileUrl) {
    const match = attachment.fileUrl.match(/\/files\/([^/]+)\//);
    if (match?.[1]) {
      return `/api/appwrite/attachments/${match[1]}`;
    }
  }
  return attachment.fileUrl || "#";
}

interface CampaignDetailsDialogProps {
  selectedCampaign: EmailCampaign | null;
  onOpenChange: (open: boolean) => void;
  campaignStats: any;
  isLoadingEngagement: boolean;
  recipientEngagement: any[];
  heatmap: ClickHeatmapData | null;
  insightsCampaigns: CampaignAnalytics[];
  isExporting: boolean;
  setIsExporting: (value: boolean) => void;
  recipientSearch: string;
  setRecipientSearch: (value: string) => void;
  filterStatus: "all" | "success" | "failed";
  setFilterStatus: (value: "all" | "success" | "failed") => void;
  fetchHistory: () => void | Promise<void>;
}

export function CampaignDetailsDialog({
  selectedCampaign,
  onOpenChange,
  campaignStats,
  isLoadingEngagement,
  recipientEngagement,
  heatmap,
  insightsCampaigns,
  isExporting,
  setIsExporting,
  recipientSearch,
  setRecipientSearch,
  filterStatus,
  setFilterStatus,
  fetchHistory,
}: CampaignDetailsDialogProps) {
  return (
    <Dialog open={!!selectedCampaign} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Campaign Details
          </DialogTitle>
          <DialogDescription>
            Full details and delivery information for this campaign
          </DialogDescription>
        </DialogHeader>

        {selectedCampaign && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Campaign Header */}
            <div className="bg-muted/40 rounded-xl p-5 space-y-4 border border-border/70">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {selectedCampaign.subject}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sent on {formatDate(selectedCampaign.created_at)}
                  </p>
                </div>
                <Badge
                  variant={
                    selectedCampaign.status === "completed"
                      ? "success"
                      : "secondary"
                  }
                  className="capitalize"
                >
                  {selectedCampaign.status}
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-primary">
                    {getRecipientsArray(selectedCampaign.recipients).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-success">
                    {selectedCampaign.sent || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Sent</div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-destructive">
                    {selectedCampaign.failed || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="bg-background rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-secondary">
                    {selectedCampaign.attachments?.length || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Files</div>
                </div>
              </div>

              {/* Engagement Timeline */}
              {campaignStats?.timeSeries &&
                campaignStats.timeSeries.length > 0 && (
                  <div className="bg-background rounded-lg p-4 border">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                      Engagement Timeline
                    </h4>
                    <LineChartWidget
                      title=""
                      data={campaignStats.timeSeries.map((d: any) => ({
                        name: new Date(d.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        }),
                        opens: d.opens,
                        clicks: d.clicks,
                      }))}
                      dataKey="opens"
                      label="Opens"
                      color="hsl(var(--primary))"
                      size="small"
                      className="border-0 shadow-none p-0"
                    />
                  </div>
                )}

              {/* Advanced Insights */}
              {campaignStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-background rounded-lg p-4 border">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Timing
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          First Open
                        </span>
                        <span className="font-medium">
                          {campaignStats.timing?.timeToFirstOpen
                            ? `${Math.round(campaignStats.timing.timeToFirstOpen / 60)}m`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          First Click
                        </span>
                        <span className="font-medium">
                          {campaignStats.timing?.timeToFirstClick
                            ? `${Math.round(campaignStats.timing.timeToFirstClick / 60)}m`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Avg. Open</span>
                        <span className="font-medium">
                          {campaignStats.timing?.averageTimeToOpen
                            ? `${Math.round(campaignStats.timing.averageTimeToOpen / 3600)}h`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background rounded-lg p-4 border">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Email Clients
                    </h4>
                    {campaignStats.emailClients &&
                    campaignStats.emailClients.length > 0 &&
                    campaignStats.emailClients.some((c: any) => c.value > 0) ? (
                      <PieChartWidget
                        title=""
                        data={campaignStats.emailClients}
                        size="small"
                        showLabels={false}
                        className="border-0 shadow-none p-0 bg-transparent"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                        No email client data yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Email Content & Heatmap */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Email Content & Heatmap
                </h4>
                {heatmap && heatmap.campaignId === selectedCampaign.$id && (
                  <Badge variant="outline" className="text-[10px]">
                    {heatmap.totalClicks} Total Clicks
                  </Badge>
                )}
              </div>

              {selectedCampaign.content ? (
                <EmailHeatmapOverlay
                  htmlContent={selectedCampaign.content}
                  linkStats={
                    campaignStats?.linkStats
                      ? campaignStats.linkStats.map((l: any) => ({
                          link_id: l.linkId,
                          url: l.url,
                          clicks: l.clicks,
                          uniqueClicks: l.uniqueClicks,
                        }))
                      : heatmap && heatmap.campaignId === selectedCampaign.$id
                        ? heatmap.links.map((l) => ({
                            link_id: "", // We'll match by URL if link_id is missing
                            url: l.url,
                            clicks: l.clicks,
                            uniqueClicks: l.uniqueClicks,
                          }))
                        : []
                  }
                  className="border rounded-lg overflow-hidden"
                />
              ) : (
                <div className="bg-muted/50 border rounded-lg p-4 text-center italic text-sm text-muted-foreground">
                  No content preview available
                </div>
              )}
            </div>

            {/* Attachments */}
            {selectedCampaign.attachments &&
              selectedCampaign.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    Attachments ({selectedCampaign.attachments.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCampaign.attachments.map(
                      (attachment: any, index: number) => (
                        <div
                          key={index}
                          className="bg-muted/50 border rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {attachment.fileName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {(attachment.fileSize / 1024 / 1024).toFixed(2)}{" "}
                                MB
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            asChild
                            className="h-8 w-8"
                          >
                            <a
                              href={getAttachmentUrl(attachment)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

            <CampaignRecipientsSection
              selectedCampaign={selectedCampaign}
              onOpenChange={onOpenChange}
              recipientEngagement={recipientEngagement}
              isLoadingEngagement={isLoadingEngagement}
              insightsCampaigns={insightsCampaigns}
              isExporting={isExporting}
              setIsExporting={setIsExporting}
              recipientSearch={recipientSearch}
              setRecipientSearch={setRecipientSearch}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              fetchHistory={fetchHistory}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
