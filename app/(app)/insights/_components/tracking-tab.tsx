import { ExternalLink, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { TrackingEvent } from "@/types/activity";

interface TrackingTabProps {
  selectedHeatmapCampaignId: string | null;
  allTrackingEvents: TrackingEvent[];
}

export function TrackingTab({ selectedHeatmapCampaignId, allTrackingEvents }: TrackingTabProps) {
  if (!selectedHeatmapCampaignId) {
    return (
      <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm">
        <History className="h-10 w-10 mb-4 opacity-40 text-[var(--color-chart-1)]" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No Campaign Selected</h3>
        <p className="max-w-sm text-sm">
          Select a campaign from the selector above to view its chronological raw event log.
        </p>
      </div>
    );
  }

  const events = allTrackingEvents
    .filter((e) => e.campaign_id === selectedHeatmapCampaignId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="border border-border/50 rounded-xl bg-card shadow-sm flex flex-col">
      <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <History className="h-5 w-5 text-[var(--color-chart-1)]" />
            Raw Event Stream
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time chronological log of all interactions.
          </p>
        </div>
        <Badge variant="secondary" className="font-medium bg-background border shadow-xs px-3 py-1">
          {events.length} events
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
            <tr>
              <th className="px-6 py-4">Time (Local)</th>
              <th className="px-6 py-4">Event</th>
              <th className="px-6 py-4">Recipient</th>
              <th className="px-6 py-4">Context (Link / Tech)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  No tracking events recorded yet.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.$id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-[13px] font-medium">
                    {formatDate(e.created_at)}
                    <span className="text-[11px] opacity-70 ml-2 font-mono">
                      {new Date(e.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] uppercase font-bold tracking-wider rounded-md border",
                        e.event_type === "open" &&
                          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
                        e.event_type === "click" &&
                          "bg-[var(--color-chart-1)]/10 text-[var(--color-chart-1)] border-[var(--color-chart-1)]/20",
                      )}
                    >
                      {e.event_type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">{e.email}</td>
                  <td className="px-6 py-4 text-[13px] text-muted-foreground">
                    {e.event_type === "click" && e.link_url ? (
                      <a
                        href={e.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1.5 w-fit max-w-[350px] truncate"
                        title={e.link_url}
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50" />
                        <span className="truncate">{e.link_url}</span>
                      </a>
                    ) : (
                      <div
                        className="flex items-center gap-2 opacity-80"
                        title={e.user_agent || "Unknown device"}
                      >
                        <span className="truncate max-w-[150px]">
                          {e.user_agent ? e.user_agent.split(" ")[0] : "Unknown device"}
                        </span>
                        <span className="text-border text-[10px]">•</span>
                        <span className="font-mono text-[11px]">
                          {e.ip_address || "Unknown IP"}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
