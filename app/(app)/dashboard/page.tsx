"use client";

import { useEffect, useState, useCallback } from "react";

import { useRouter } from "next/navigation";

import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { FirstCampaignChecklist } from "@/components/first-campaign-checklist";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import type { EmailCampaign } from "@/lib/appwrite";
import { campaignsService } from "@/lib/appwrite";
import { componentLogger } from "@/lib/client-logger";
import { parseRecipients } from "@/lib/utils/recipients";

import { ActivityChart } from "./_components/activity-chart";
import { AnalyticsMetrics } from "./_components/analytics-metrics";
import { DashboardHeader } from "./_components/dashboard-header";
import { EngagementFunnel } from "./_components/engagement-funnel";
import { RecentActivityFeed } from "./_components/recent-activity";

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
  const [isDuplicating, setIsDuplicating] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    const unsub = campaignsService.subscribeToUserCampaigns(session.user.email, () =>
      fetchCampaigns(),
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

  /* guards */
  if (status === "loading" || !isMounted || isLoading) {
    return <DashboardSkeleton />;
  }
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <PageShell>
      {/* Header */}
      <DashboardHeader userName={session?.user?.name?.split(" ")[0] || "there"} />
      {session?.user?.email && (
        <FirstCampaignChecklist
          userEmail={session.user.email}
          sent={campaigns.some((campaign) => campaign.sent > 0)}
        />
      )}

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
        onViewDetails={(c) => router.push(`/insights?campaign=${encodeURIComponent(c.$id)}`)}
        onDuplicate={duplicateCampaign}
        isDuplicating={isDuplicating}
      />
    </PageShell>
  );
}
