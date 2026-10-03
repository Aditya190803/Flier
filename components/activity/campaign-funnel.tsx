"use client";

import { useMemo } from "react";

import { Mail, Eye, MousePointer2 } from "lucide-react";

import type { TrackingEvent } from "@/types/activity";

interface Props {
  sent: number;
  events: TrackingEvent[];
}

export function CampaignFunnelWidget({ sent, events }: Props) {
  const { uniqueOpens, uniqueClicks } = useMemo(() => {
    const openedEmails = new Set<string>();
    const clickedEmails = new Set<string>();

    events.forEach((x) => {
      if (x.email) {
        if (x.event_type === "open") {
          openedEmails.add(x.email.trim().toLowerCase());
        }
        if (x.event_type === "click") {
          clickedEmails.add(x.email.trim().toLowerCase());
        }
      }
    });

    return {
      uniqueOpens: openedEmails.size,
      uniqueClicks: clickedEmails.size,
    };
  }, [events]);

  const openRate = sent > 0 ? Math.min(100, (uniqueOpens / sent) * 100).toFixed(1) : "0.0";
  const clickThroughRate = sent > 0 ? Math.min(100, (uniqueClicks / sent) * 100).toFixed(1) : "0.0";
  // Specifically: Click-to-Open Rate (CTOR)
  const clickToOpenRate =
    uniqueOpens > 0 ? Math.min(100, (uniqueClicks / uniqueOpens) * 100).toFixed(1) : "0.0";

  return (
    <div className="border border-border/50 rounded-xl bg-card shadow-sm p-4 md:p-6 mb-6">
      <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 text-foreground">
        <Mail className="h-5 w-5 text-primary" /> Recorded Engagement Funnel
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Sent */}
        <div className="flex flex-col relative group">
          <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
            <div className="flex items-center gap-3 mb-2 text-muted-foreground font-medium text-sm">
              <div className="h-8 w-8 rounded-lg bg-[var(--color-chart-1)]/10 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-[var(--color-chart-1)]" />
              </div>
              Gmail Accepted
            </div>
            <div className="text-3xl font-bold text-foreground">{sent.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-2 hidden md:block opacity-0">.</div>
          </div>
          {/* connector arrow line for desktop */}
          <div className="hidden md:block absolute top-[50%] -right-[15%] w-[30%] h-px bg-border/80 z-0" />
        </div>

        {/* Step 2: Opened */}
        <div className="flex flex-col relative z-10 group">
          <div className="p-4 rounded-xl bg-[var(--color-chart-2)]/5 border border-[var(--color-chart-2)]/20 shadow-sm relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-1 bg-[var(--color-chart-2)]"
              style={{ width: `${Math.min(100, Number(openRate))}%` }}
            />
            <div className="flex items-center gap-3 mb-2 text-muted-foreground font-medium text-sm">
              <div className="h-8 w-8 rounded-lg bg-[var(--color-chart-2)]/10 flex items-center justify-center shrink-0">
                <Eye className="h-4 w-4 text-[var(--color-chart-2)]" />
              </div>
              Unique Opens
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-bold text-foreground">
                {uniqueOpens.toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {openRate}% Open Rate
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              of {sent.toLocaleString()} accepted sends
            </div>
          </div>
          {/* connector arrow line for desktop */}
          <div className="hidden md:block absolute top-[50%] -right-[15%] w-[30%] h-px bg-border/80 z-0" />
        </div>

        {/* Step 3: Clicked */}
        <div className="flex flex-col relative z-20 group">
          <div className="p-4 rounded-xl bg-[var(--color-chart-3)]/5 border border-[var(--color-chart-3)]/20 shadow-sm relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-1 bg-[var(--color-chart-3)]"
              style={{ width: `${Math.min(100, Number(clickThroughRate))}%` }}
            />
            <div className="flex items-center gap-3 mb-2 text-muted-foreground font-medium text-sm">
              <div className="h-8 w-8 rounded-lg bg-[var(--color-chart-3)]/10 flex items-center justify-center shrink-0">
                <MousePointer2 className="h-4 w-4 text-[var(--color-chart-3)]" />
              </div>
              Unique Clicks
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-bold text-foreground">
                {uniqueClicks.toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {clickThroughRate}% CTR
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {clickToOpenRate}% CTOR (Click-to-Open Rate)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
