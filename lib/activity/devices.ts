/**
 * Device distribution aggregation
 */

import type { TrackingEvent } from "@/types/activity";

export interface DeviceData {
  name: string;
  value: number;
  color: string;
}

/**
 * Aggregates device distribution from tracking events
 */
export function aggregateDeviceData(events: TrackingEvent[]): DeviceData[] {
  const counts = {
    Desktop: 0,
    Mobile: 0,
    Tablet: 0,
  };

  events.forEach((event) => {
    if (!event.user_agent) {
      counts.Desktop++; // Default to desktop if no UA
      return;
    }

    const ua = event.user_agent.toLowerCase();

    if (
      ua.includes("tablet") ||
      ua.includes("ipad") ||
      (ua.includes("android") && !ua.includes("mobile"))
    ) {
      counts.Tablet++;
    } else if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
      counts.Mobile++;
    } else {
      counts.Desktop++;
    }
  });

  const total = counts.Desktop + counts.Mobile + counts.Tablet;

  if (total === 0) {
    return [
      { name: "Desktop", value: 0, color: "#3b82f6" },
      { name: "Mobile", value: 0, color: "#10b981" },
      { name: "Tablet", value: 0, color: "#f59e0b" },
    ];
  }

  return [
    { name: "Desktop", value: counts.Desktop, color: "#3b82f6" },
    { name: "Mobile", value: counts.Mobile, color: "#10b981" },
    { name: "Tablet", value: counts.Tablet, color: "#f59e0b" },
  ];
}
