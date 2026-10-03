import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  Loader2,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { HistoryData } from "@/hooks/useInsightsData";
import { getRecipientsArray } from "@/lib/activity/recipients";
import type { EmailCampaign } from "@/lib/appwrite";
import { cn, formatDate } from "@/lib/utils";
import type { CampaignAnalytics } from "@/types/activity";

interface CampaignsTabProps {
  historyData: HistoryData;
  insightsCampaigns: CampaignAnalytics[];
  expandedCampaigns: Set<string>;
  setExpandedCampaigns: (value: Set<string>) => void;
  toggleCampaignExpansion: (campaignId: string) => void;
  duplicatingCampaignId: string | null;
  duplicateCampaign: (campaign: EmailCampaign) => void;
  onViewCampaign: (campaign: EmailCampaign) => void;
}

export function CampaignsTab({
  historyData,
  insightsCampaigns,
  expandedCampaigns,
  setExpandedCampaigns,
  toggleCampaignExpansion,
  duplicatingCampaignId,
  duplicateCampaign,
  onViewCampaign,
}: CampaignsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sent Campaigns</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpandedCampaigns(new Set())}>
            Collapse All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setExpandedCampaigns(new Set(historyData?.recentCampaigns.map((c) => c.$id) || []))
            }
          >
            <Eye className="h-4 w-4 mr-2" />
            Expand All
          </Button>
        </div>
      </div>

      {historyData.recentCampaigns.map((campaign) => {
        const isExpanded = expandedCampaigns.has(campaign.$id);
        const analytics = insightsCampaigns.find((a) => a.id === campaign.$id);

        return (
          <Card
            key={campaign.$id}
            className={cn(
              "transition-all duration-200",
              isExpanded ? "ring-1 ring-primary/20" : "hover:bg-muted/50",
            )}
          >
            <CardContent className="p-0">
              <div
                className="p-4 sm:p-6 cursor-pointer flex items-center justify-between gap-4"
                onClick={() => toggleCampaignExpansion(campaign.$id)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={cn(
                      "p-2 rounded-full shrink-0",
                      campaign.status === "completed"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning",
                    )}
                  >
                    {campaign.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{campaign.subject}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(campaign.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {getRecipientsArray(campaign.recipients).length} recipients
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden sm:flex items-center gap-6 mr-4">
                    <div className="text-center">
                      <div className="text-sm font-bold">{analytics?.opens || 0}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Opens
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold">{analytics?.clicks || 0}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Clicks
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 sm:px-6 pb-6 pt-2 border-t bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Campaign Details
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <Badge
                            variant={campaign.status === "completed" ? "success" : "secondary"}
                          >
                            {campaign.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sent At</span>
                          <span className="font-medium">
                            {new Date(campaign.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Performance Metrics
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="text-xs text-muted-foreground mb-1">Open Rate</div>
                          <div className="text-lg font-bold">
                            {analytics?.openRate === undefined
                              ? "Unavailable"
                              : `${analytics.openRate.toFixed(1)}%`}
                          </div>
                        </div>
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="text-xs text-muted-foreground mb-1">Click Rate</div>
                          <div className="text-lg font-bold">
                            {analytics?.clickRate === undefined
                              ? "Unavailable"
                              : `${analytics.clickRate.toFixed(1)}%`}
                          </div>
                        </div>
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="text-xs text-muted-foreground mb-1">Gmail accepted</div>
                          <div className="text-lg font-bold">{campaign.sent || 0}</div>
                        </div>
                        <div className="p-3 bg-background rounded-lg border">
                          <div className="text-xs text-muted-foreground mb-1">Failed sends</div>
                          <div className="text-lg font-bold">{campaign.failed || 0}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" size="sm" onClick={() => onViewCampaign(campaign)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Content
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateCampaign(campaign)}
                      disabled={duplicatingCampaignId === campaign.$id}
                    >
                      {duplicatingCampaignId === campaign.$id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {duplicatingCampaignId === campaign.$id ? "Loading..." : "Duplicate"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
