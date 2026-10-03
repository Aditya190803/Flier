"use client";

import { useMemo } from "react";

import { Link2, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { TrackingEvent } from "@/types/activity";

interface Props {
  events: TrackingEvent[];
  uniqueOpens: number;
}

export function LinkPerformanceTable({ events, uniqueOpens }: Props) {
  const linkStats = useMemo(() => {
    const map = new Map<string, { totalClicks: number; uniqueClickers: Set<string> }>();

    events.forEach((ev) => {
      if (ev.event_type === "click" && ev.link_url) {
        const url = ev.link_url.trim();
        if (!map.has(url)) {
          map.set(url, { totalClicks: 0, uniqueClickers: new Set<string>() });
        }
        const stat = map.get(url)!;
        stat.totalClicks += 1;
        if (ev.email) {
          stat.uniqueClickers.add(ev.email);
        }
      }
    });

    return Array.from(map.entries())
      .map(([url, data]) => ({
        url,
        totalClicks: data.totalClicks,
        uniqueClicks: data.uniqueClickers.size,
      }))
      .sort((a, b) => b.totalClicks - a.totalClicks);
  }, [events]);

  if (linkStats.length === 0) {
    return (
      <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm h-full min-h-[400px]">
        <Link2 className="h-10 w-10 mb-4 opacity-40 text-[var(--color-chart-1)]" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No Link Clicks Yet</h3>
        <p className="max-w-sm text-sm">
          When recipients click links in this campaign, the specific URLs and performance map will
          appear here.
        </p>
      </div>
    );
  }

  const maxTotalClicks = Math.max(...linkStats.map((s) => s.totalClicks), 1);

  return (
    <div className="border border-border/50 rounded-xl bg-card shadow-sm flex flex-col h-full min-h-[400px] overflow-hidden">
      <div className="p-5 border-b bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2 text-foreground">
            <Link2 className="h-4 w-4 text-[var(--color-chart-1)]" />
            Top Clicked Links
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Which links are driving the most engagement.
          </p>
        </div>
        <Badge variant="secondary" className="font-medium bg-background border shadow-xs px-3 py-1">
          {linkStats.length} Unique Links
        </Badge>
      </div>
      <div className="overflow-x-auto overflow-y-auto flex-1 hide-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
            <tr>
              <th className="px-6 py-4 w-1/2">URL</th>
              <th className="px-6 py-4">Total Clicks</th>
              <th className="px-6 py-4">Unique Clicks</th>
              <th className="px-6 py-4">Click-to-Open %</th>
              <th className="px-6 py-4">Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {linkStats.map((stat, i) => {
              const ctor =
                uniqueOpens > 0 ? ((stat.uniqueClicks / uniqueOpens) * 100).toFixed(1) : "0.0";
              const barWidth = `${(stat.totalClicks / maxTotalClicks) * 100}%`;
              let safeUrl = "#";
              try {
                const parsed = new URL(stat.url);
                if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
                  safeUrl = parsed.href;
                }
              } catch {
                // invalid url
              }

              return (
                <tr key={i} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 max-w-[300px]">
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1.5 truncate group-hover:text-[var(--color-chart-1)] transition-colors font-medium"
                      title={stat.url}
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50 block" />
                      <span className="truncate block">{stat.url}</span>
                    </a>
                  </td>
                  <td className="px-6 py-4 font-bold text-foreground">
                    {stat.totalClicks.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {stat.uniqueClicks.toLocaleString()}
                    <span className="text-xs ml-1 opacity-50 inline-block">(users)</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-[13px] text-[var(--color-chart-3)]">
                    {ctor}%
                  </td>
                  <td className="px-6 py-4 w-32 min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/40">
                        <div
                          className="h-full bg-[var(--color-chart-1)] rounded-full transition-all"
                          style={{ width: barWidth }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
