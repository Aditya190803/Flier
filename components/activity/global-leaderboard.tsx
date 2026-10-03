"use client";

import { useMemo } from "react";

import { Trophy, Mail, MousePointer2 } from "lucide-react";

import type { TrackingEvent } from "@/types/activity";

interface Props {
  events: TrackingEvent[];
  limit?: number;
}

export function GlobalLeaderboard({ events, limit = 10 }: Props) {
  const topUsers = useMemo(() => {
    const userStats = new Map<string, { opens: number; clicks: number; score: number }>();

    events.forEach((ev) => {
      if (!ev.email) {
        return;
      }

      if (!userStats.has(ev.email)) {
        userStats.set(ev.email, { opens: 0, clicks: 0, score: 0 });
      }

      const stats = userStats.get(ev.email)!;
      if (ev.event_type === "open") {
        stats.opens += 1;
        stats.score += 1; // 1 point per open
      } else if (ev.event_type === "click") {
        stats.clicks += 1;
        stats.score += 3; // 3 points per click (higher intent)
      }
    });

    return Array.from(userStats.entries())
      .map(([email, stats]) => ({
        email,
        ...stats,
      }))
      .filter((u) => u.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }, [events, limit]);

  if (topUsers.length === 0) {
    return (
      <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm h-full">
        <Trophy className="h-10 w-10 mb-4 opacity-40 text-amber-500" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No Superfans Yet</h3>
        <p className="max-w-sm text-sm">Send more campaigns to see your most engaged recipients.</p>
      </div>
    );
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b bg-muted/10 flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2 text-foreground">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top Engaged Superfans
          </h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Most active contacts across all campaigns.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
            <tr>
              <th className="px-6 py-3">Rank</th>
              <th className="px-6 py-3">Recipient</th>
              <th className="px-6 py-3 text-right">Opens</th>
              <th className="px-6 py-3 text-right">Clicks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {topUsers.map((user, i) => (
              <tr key={user.email} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-3">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                        : i === 1
                          ? "bg-slate-200 text-slate-700 dark:bg-slate-400/20 dark:text-slate-300"
                          : i === 2
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                </td>
                <td className="px-6 py-3 font-medium text-foreground">{user.email}</td>
                <td className="px-6 py-3 text-right whitespace-nowrap">
                  <span className="flex items-center justify-end gap-1.5 text-muted-foreground text-[13px]">
                    <Mail className="h-3 w-3 opacity-70" /> {user.opens}
                  </span>
                </td>
                <td className="px-6 py-3 text-right whitespace-nowrap">
                  <span className="flex items-center justify-end gap-1.5 text-muted-foreground text-[13px]">
                    <MousePointer2 className="h-3 w-3 opacity-70" /> {user.clicks}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
