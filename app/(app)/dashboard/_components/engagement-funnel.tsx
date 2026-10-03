"use client";

import { useMemo } from "react";

import { Filter, Users, Send } from "lucide-react";

import type { EmailCampaign } from "@/lib/appwrite";
import { getRecipientsCount } from "@/lib/utils/recipients";

interface Props {
  campaigns: EmailCampaign[];
}

export function EngagementFunnel({ campaigns }: Props) {
  const data = useMemo(() => {
    // 1. Total targeted (all recipients across all campaigns)
    const targeted = campaigns.reduce((acc, c) => acc + getRecipientsCount(c), 0);

    // 2. Delivered (successfully sent)
    const delivered = campaigns.reduce((acc, c) => acc + (c.sent || 0), 0);

    return [
      {
        name: "Targeted",
        value: targeted,
        icon: Users,
        colorClass: "bg-primary/20",
        percentage: "100.0",
      },
      {
        name: "Delivered",
        value: delivered,
        icon: Send,
        colorClass: "bg-primary/40",
      },
    ];
  }, [campaigns]);

  if (campaigns.length === 0 || data[0].value === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center h-full min-h-[290px] text-muted-foreground text-sm">
        <Filter className="h-8 w-8 mb-2 opacity-30" />
        No funnel data yet
      </div>
    );
  }

  // Calculate highest for relative percentage widths
  const maxVal = Math.max(data[0].value, 1);

  return (
    <div className="rounded-xl border bg-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-[32px]">
        <div>
          <h2 className="text-base font-semibold">Engagement Funnel</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Overall conversion rates</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-[28px]">
        {data.map((step, i) => {
          // Calculate conversion from the *previous* step
          const dropoffPercentage =
            i === 0 || data[i - 1].value === 0
              ? null
              : ((step.value / data[i - 1].value) * 100).toFixed(1);

          return (
            <div key={step.name} className="relative group">
              <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-[6px] bg-secondary/60 rounded-md">
                    <step.icon className="h-4 w-4 text-primary w-[16px] h-[16px]" />
                  </div>
                  <span className="text-[13px] font-medium">{step.name}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  {dropoffPercentage && (
                    <span className="text-[11px] font-medium text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">
                      {dropoffPercentage}%
                    </span>
                  )}
                  <span className="text-[13px] font-semibold tabular-nums text-right min-w-[4ch] whitespace-nowrap">
                    {step.value.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="h-[6px] w-full bg-secondary/40 rounded-full overflow-hidden flex items-center">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${step.colorClass}`}
                  style={{
                    width: `${Math.max((step.value / maxVal) * 100, 1)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
