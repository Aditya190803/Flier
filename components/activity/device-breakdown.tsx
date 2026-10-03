"use client";

import { useMemo } from "react";

import { Laptop } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

import type { TrackingEvent } from "@/types/activity";

interface Props {
  events: TrackingEvent[];
}

function parseDevice(ua: string | undefined | null): string {
  if (!ua) {
    return "Other";
  }
  const lower = ua.toLowerCase();
  if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ipod")) {
    return "iOS";
  }
  if (lower.includes("android")) {
    return "Android";
  }
  if (lower.includes("mac os") || lower.includes("macintosh")) {
    return "macOS";
  }
  if (lower.includes("windows")) {
    return "Windows";
  }
  if (lower.includes("linux")) {
    return "Linux";
  }
  return "Other";
}

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-muted)",
];

export function DeviceBreakdownChart({ events }: Props) {
  const data = useMemo(() => {
    // Only track opens to prevent overcounting from multiple clicks by the same user
    const opens = events.filter((e) => e.event_type === "open");

    // Track unique users per device to get a clean read
    const uniqueDevices = new Map<string, Set<string>>();

    opens.forEach((ev) => {
      const device = parseDevice(ev.user_agent);
      if (!uniqueDevices.has(device)) {
        uniqueDevices.set(device, new Set<string>());
      }
      if (ev.email) {
        uniqueDevices.get(device)!.add(ev.email);
      }
    });

    const breakdown = Array.from(uniqueDevices.entries())
      .map(([name, set]) => ({
        name,
        value: set.size,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const otherIndex = breakdown.findIndex((item) => item.name === "Other");
    let otherValue = 0;
    if (otherIndex !== -1) {
      otherValue = breakdown.splice(otherIndex, 1)[0].value;
    }

    if (breakdown.length > 4) {
      const top4 = breakdown.slice(0, 4);
      const restValue = breakdown.slice(4).reduce((sum, item) => sum + item.value, 0);
      top4.push({ name: "Other", value: otherValue + restValue });
      return top4;
    }

    if (otherValue > 0) {
      breakdown.push({ name: "Other", value: otherValue });
    }

    return breakdown;
  }, [events]);

  if (data.length === 0) {
    return (
      <div className="border border-border/50 rounded-xl bg-card p-12 flex flex-col items-center justify-center text-center text-muted-foreground shadow-sm h-full min-h-[400px]">
        <Laptop className="h-10 w-10 mb-4 opacity-40 text-[var(--color-chart-2)]" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No Device Data</h3>
        <p className="max-w-sm text-sm">
          Recipients haven't opened this campaign yet to capture device statistics.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card shadow-sm flex flex-col h-full min-h-[400px]">
      <div className="p-5 border-b bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2 text-foreground">
            <Laptop className="h-4 w-4 text-[var(--color-chart-2)]" />
            Device & Platform Breakdown
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Where recipients are viewing this campaign.
          </p>
        </div>
      </div>
      <div className="p-6 flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              stroke="var(--color-background)"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "var(--color-popover)",
                borderColor: "var(--color-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-md)",
                color: "var(--color-foreground)",
              }}
              itemStyle={{ color: "var(--color-foreground)", fontWeight: 500 }}
              formatter={(value: number) => [`${value} unique readers`, "Devices"]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: "13px", paddingTop: "20px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
