import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import type { TrackingEvent } from "@/types/activity";

interface RecipientsTabProps {
  selectedHeatmapCampaignId: string | null;
  allTrackingEvents: TrackingEvent[];
  recipientSearch: string;
  setRecipientSearch: (value: string) => void;
}

export function RecipientsTab({
  selectedHeatmapCampaignId,
  allTrackingEvents,
  recipientSearch,
  setRecipientSearch,
}: RecipientsTabProps) {
  if (!selectedHeatmapCampaignId) {
    return (
      <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm">
        <Users className="h-10 w-10 mb-4 opacity-40 text-primary" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No Campaign Selected</h3>
        <p className="max-w-sm text-sm">
          Select a campaign from the selector above to view its recipient leaderboard.
        </p>
      </div>
    );
  }

  const recs: Record<string, { opens: number; clicks: number; lastAction: Date }> = {};
  allTrackingEvents
    .filter((e) => e.campaign_id === selectedHeatmapCampaignId)
    .forEach((e) => {
      if (e.email) {
        if (!recs[e.email]) {
          recs[e.email] = { opens: 0, clicks: 0, lastAction: new Date(0) };
        }
        if (e.event_type === "open") {
          recs[e.email].opens++;
        }
        if (e.event_type === "click") {
          recs[e.email].clicks++;
        }

        const t = new Date(e.created_at);
        if (t > recs[e.email].lastAction) {
          recs[e.email].lastAction = t;
        }
      }
    });

  const entries = Object.entries(recs)
    .filter(([email]) => email.toLowerCase().includes(recipientSearch.toLowerCase()))
    .sort((a, b) => b[1].lastAction.getTime() - a[1].lastAction.getTime());

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Recipients Leaderboard
        </h2>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center bg-muted/10 gap-3">
          <div className="flex gap-2 w-full md:w-auto">
            <Input
              placeholder="Search recipients…"
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              className="max-w-xs h-9 bg-background shadow-xs focus-visible:ring-primary/40"
            />
          </div>
        </div>
        <div className="divide-y divide-border overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-xs uppercase text-muted-foreground whitespace-nowrap">
              <tr>
                <th className="px-6 py-3 font-medium">Recipient</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Clicks</th>
                <th className="px-6 py-3 font-medium text-right">Last Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No recipients found
                  </td>
                </tr>
              ) : (
                entries.map(([email, stats]) => (
                  <tr key={email} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-3 font-medium text-foreground">{email}</td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={stats.opens > 0 ? "success" : "secondary"}
                        className="font-normal capitalize text-xs"
                      >
                        {stats.opens > 0 ? "Opened" : "Not Opened"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{stats.clicks} clicks</td>
                    <td className="px-6 py-3 text-right whitespace-nowrap text-muted-foreground">
                      {stats.lastAction.getTime() > 0
                        ? formatDate(stats.lastAction.toISOString())
                        : "Never"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
