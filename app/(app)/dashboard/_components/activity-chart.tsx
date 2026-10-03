"use client";

import Link from "next/link";

import { ArrowRight, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { Button } from "@/components/ui/button";
import type { EmailCampaign } from "@/lib/appwrite";

function formatDate(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface Props {
  campaigns: EmailCampaign[];
}

export function ActivityChart({ campaigns }: Props) {
  // Aggregate by day (last 30 campaigns)
  const sorted = [...campaigns].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return (Number.isNaN(timeA) ? 0 : timeA) - (Number.isNaN(timeB) ? 0 : timeB);
  });

  const map: Record<string, { sent: number; failed: number }> = {};
  sorted.slice(-30).forEach((c) => {
    const day = formatDate(c.created_at || "");
    if (!map[day]) {
      map[day] = { sent: 0, failed: 0 };
    }
    map[day].sent += c.sent || 0;
    map[day].failed += c.failed || 0;
  });

  const data = Object.entries(map).map(([name, vals]) => ({ name, ...vals }));

  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center h-60 text-muted-foreground text-sm">
        <TrendingUp className="h-8 w-8 mb-2 opacity-30" />
        No campaign data yet
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold">Campaign Activity</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Emails sent over time</p>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <Link href="/insights">
            Full analytics <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              boxShadow: "0 2px 8px -2px rgba(0,0,0,0.05),0 4px 6px -4px rgba(0,0,0,0.05)",
              fontSize: 12,
              color: "var(--color-foreground)",
            }}
            itemStyle={{ color: "var(--color-foreground)" }}
            cursor={{ stroke: "var(--color-border)" }}
          />
          <Area
            type="monotone"
            dataKey="sent"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            fill="var(--color-chart-1)"
            fillOpacity={0.14}
            name="Sent"
          />
          <Area
            type="monotone"
            dataKey="failed"
            stroke="var(--color-chart-2)"
            strokeWidth={1.5}
            fill="var(--color-chart-2)"
            fillOpacity={0.1}
            name="Failed"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-chart-1 inline-block" />
          Sent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-chart-2 inline-block" />
          Failed
        </span>
      </div>
    </div>
  );
}
