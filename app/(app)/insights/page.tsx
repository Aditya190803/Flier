"use client";

import { useState, useCallback, useMemo } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { History, Plus } from "lucide-react";
import { toast } from "sonner";

import { MeasurementNote } from "@/components/insights/measurement-note";
import { CampaignSelector } from "@/components/insights/campaign-selector";
import { InsightsExportActions } from "@/components/insights/insights-export-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, PageShell, EmptyState } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useBilling } from "@/hooks/useBilling";
import { useCampaignDetails } from "@/hooks/useCampaignDetails";
import { useInsightsData } from "@/hooks/useInsightsData";
import { buildCampaignChartData } from "@/lib/activity/chart-data";
import { generateCSV, generatePDF, downloadFile } from "@/lib/activity/export";
import { getRecipientsArray } from "@/lib/activity/recipients";
import type { EmailCampaign } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";

import { CampaignDetailsDialog } from "./_components/campaign-details-dialog";
import { CampaignsTab } from "./_components/campaigns-tab";
import { HeatmapTab } from "./_components/heatmap-tab";
import { OverviewTab } from "./_components/overview-tab";
import { PerformanceTab } from "./_components/performance-tab";
import { RecipientsTab } from "./_components/recipients-tab";
import { TrackingTab } from "./_components/tracking-tab";

export default function HistoryPage() {
  const { isPremiumAnalytics } = useBilling();
  const goUpgrade = () => {
    window.location.href = "/pricing";
  };
  const { session, status, isLoading: _isLoading } = useAuthGuard();
  const router = useRouter();
  const {
    historyData,
    trackingStatus,
    trackingTotal,
    historyError,
    insightsCampaigns,
    summary,
    comparison,
    heatmap,
    isLoadingData,
    allTrackingEvents,
    selectedHeatmapCampaignId,
    setSelectedHeatmapCampaignId,
    fetchHistory,
  } = useInsightsData(session?.user?.email ?? undefined);

  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [duplicatingCampaignId, setDuplicatingCampaignId] = useState<string | null>(null);

  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const { recipientEngagement, campaignStats, isLoadingEngagement } =
    useCampaignDetails(selectedCampaign);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "failed">("all");

  const chartData = useMemo(() => buildCampaignChartData(insightsCampaigns), [insightsCampaigns]);

  // Duplicate campaign - same behavior as dashboard
  const duplicateCampaign = useCallback(
    (campaign: EmailCampaign) => {
      setDuplicatingCampaignId(campaign.$id);

      const duplicateData = {
        subject: `${campaign.subject} (Copy)`,
        content: campaign.content || "",
        recipients: getRecipientsArray(campaign.recipients),
        attachments: campaign.attachments || [],
      };

      sessionStorage.setItem("duplicateCampaign", JSON.stringify(duplicateData));
      toast.success("Campaign data copied! Redirecting to compose...");
      router.push("/compose");
    },
    [router],
  );

  // Helper functions for campaign details
  const toggleCampaignExpansion = (campaignId: string) => {
    setExpandedCampaigns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const handleExportCSV = () => {
    if (!summary || insightsCampaigns.length === 0) {
      return;
    }
    const csv = generateCSV({
      campaigns: insightsCampaigns,
      summary,
      dateRange: {
        start: new Date(insightsCampaigns[insightsCampaigns.length - 1].createdAt),
        end: new Date(),
      },
    });
    downloadFile(csv, `flier-insights-${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
    toast.success("CSV report exported!");
  };

  const handleExportPDF = async () => {
    if (!summary || insightsCampaigns.length === 0) {
      return;
    }
    setIsExporting(true);
    try {
      const pdf = await generatePDF({
        campaigns: insightsCampaigns,
        summary,
        dateRange: {
          start: new Date(insightsCampaigns[insightsCampaigns.length - 1].createdAt),
          end: new Date(),
        },
      });
      downloadFile(
        pdf,
        `flier-insights-${new Date().toISOString().split("T")[0]}.pdf`,
        "application/pdf",
      );
      toast.success("PDF report exported!");
    } catch (error) {
      componentLogger.error("PDF export failed", error as Error);
      toast.error("Failed to generate PDF report");
    } finally {
      setIsExporting(false);
    }
  };

  if (status === "loading" || isLoadingData) {
    return (
      <PageShell>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (!historyData || historyData.totalCampaigns === 0) {
    return (
      <PageShell>
        <MeasurementNote
          trackingStatus={trackingStatus}
          loaded={allTrackingEvents.length}
          total={trackingTotal}
          error={historyError}
        />
        <EmptyState
          icon={<History className="w-8 h-8" />}
          title="No Emails Sent Yet"
          description="Start sending campaigns to see your email history and performance insights here."
          action={
            <Button asChild>
              <Link href="/compose">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <>
      <PageShell>
        <PageHeader
          title="Insights & History"
          description="Track your campaign performance and delivery metrics"
          actions={
            isPremiumAnalytics ? (
              <InsightsExportActions
                isExporting={isExporting}
                onExportCSV={handleExportCSV}
                onExportPDF={handleExportPDF}
              />
            ) : (
              <Button size="sm" variant="outline" onClick={goUpgrade}>
                Upgrade for export
              </Button>
            )
          }
        />

        <MeasurementNote
          trackingStatus={trackingStatus}
          loaded={allTrackingEvents.length}
          total={trackingTotal}
          error={historyError}
        />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 hide-scrollbar">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 h-10 p-1 bg-muted/30">
              <TabsTrigger value="overview" className="rounded-md">
                Overview
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="rounded-md">
                Campaigns
              </TabsTrigger>
              <TabsTrigger
                disabled={trackingStatus === "unavailable"}
                value="performance"
                className="rounded-md"
              >
                Performance
              </TabsTrigger>
              <TabsTrigger
                disabled={trackingStatus === "unavailable"}
                value="heatmap"
                className="rounded-md"
              >
                Heatmap
              </TabsTrigger>
              <TabsTrigger
                disabled={trackingStatus === "unavailable"}
                value="recipients"
                className="rounded-md"
              >
                Recipients
              </TabsTrigger>
              <TabsTrigger
                disabled={trackingStatus === "unavailable"}
                value="tracking"
                className="rounded-md"
              >
                Raw Events
              </TabsTrigger>
            </TabsList>
          </div>

          {/* SHARED CAMPAIGN SELECTOR FOR ANALYTICS TABS */}
          {["performance", "heatmap", "recipients", "tracking"].includes(activeTab) && (
            <CampaignSelector
              campaigns={historyData?.recentCampaigns || []}
              allTrackingEvents={allTrackingEvents}
              selectedCampaignId={selectedHeatmapCampaignId}
              onSelectCampaign={(campaignId, heatmapData) => {
                setSelectedHeatmapCampaignId(campaignId, heatmapData);
              }}
            />
          )}

          <TabsContent value="overview">
            <OverviewTab
              historyData={historyData}
              summary={summary}
              comparison={comparison}
              chartData={chartData}
              insightsCampaigns={insightsCampaigns}
              allTrackingEvents={allTrackingEvents}
              onViewCampaign={(id) => {
                const c = historyData.recentCampaigns.find((rc) => rc.$id === id);
                if (c) {
                  setSelectedCampaign(c);
                }
              }}
              isPremium={isPremiumAnalytics}
            />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignsTab
              historyData={historyData}
              insightsCampaigns={insightsCampaigns}
              expandedCampaigns={expandedCampaigns}
              setExpandedCampaigns={setExpandedCampaigns}
              toggleCampaignExpansion={toggleCampaignExpansion}
              duplicatingCampaignId={duplicatingCampaignId}
              duplicateCampaign={duplicateCampaign}
              onViewCampaign={setSelectedCampaign}
            />
          </TabsContent>

          <TabsContent value="tracking" className="space-y-6">
            <TrackingTab
              selectedHeatmapCampaignId={selectedHeatmapCampaignId}
              allTrackingEvents={allTrackingEvents}
            />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceTab
              selectedHeatmapCampaignId={selectedHeatmapCampaignId}
              historyData={historyData}
              allTrackingEvents={allTrackingEvents}
              isPremium={isPremiumAnalytics}
            />
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-6">
            <HeatmapTab
              selectedHeatmapCampaignId={selectedHeatmapCampaignId}
              heatmap={heatmap}
              isPremium={isPremiumAnalytics}
            />
          </TabsContent>

          <TabsContent value="recipients" className="space-y-6">
            <RecipientsTab
              selectedHeatmapCampaignId={selectedHeatmapCampaignId}
              allTrackingEvents={allTrackingEvents}
              recipientSearch={recipientSearch}
              setRecipientSearch={setRecipientSearch}
            />
          </TabsContent>
        </Tabs>
      </PageShell>

      {/* Full Campaign Details Modal */}
      <CampaignDetailsDialog
        selectedCampaign={selectedCampaign}
        onOpenChange={(open) => !open && setSelectedCampaign(null)}
        campaignStats={campaignStats}
        isLoadingEngagement={isLoadingEngagement}
        recipientEngagement={recipientEngagement}
        heatmap={heatmap}
        insightsCampaigns={insightsCampaigns}
        isExporting={isExporting}
        setIsExporting={setIsExporting}
        recipientSearch={recipientSearch}
        setRecipientSearch={setRecipientSearch}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        fetchHistory={fetchHistory}
      />
    </>
  );
}
