/**
 * Click heatmap functionality for email analytics
 * Aggregates and visualizes click data by link
 */

import type { ClickHeatmapData, LinkClickData, TrackingEvent } from "@/types/activity";

/**
 * Aggregate tracking events into heatmap data
 */
export function aggregateClickData(events: TrackingEvent[], campaignId: string): ClickHeatmapData {
  // Filter to only click events for this campaign
  const clickEvents = events.filter(
    (e) => e.event_type === "click" && e.campaign_id === campaignId,
  );

  // Group clicks by URL
  const clicksByUrl = new Map<string, { total: number; unique: Set<string> }>();

  clickEvents.forEach((event) => {
    if (!event.link_url) {
      return;
    }

    const existing = clicksByUrl.get(event.link_url);
    if (existing) {
      existing.total++;
      existing.unique.add(event.email);
    } else {
      clicksByUrl.set(event.link_url, {
        total: 1,
        unique: new Set([event.email]),
      });
    }
  });

  const totalClicks = clickEvents.length;

  // Transform to LinkClickData array
  const links: LinkClickData[] = Array.from(clicksByUrl.entries())
    .map(([url, data]) => ({
      url,
      displayText: extractLinkText(url),
      clicks: data.total,
      uniqueClicks: data.unique.size,
      percentage: totalClicks > 0 ? (data.total / totalClicks) * 100 : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  return {
    campaignId,
    links,
    totalClicks,
  };
}

/**
 * Extract readable text from URL for display
 */
function extractLinkText(url: string): string {
  try {
    const urlObj = new URL(url);
    // Return hostname + pathname, limited length
    const display = urlObj.hostname + urlObj.pathname;
    return display.length > 50 ? display.substring(0, 47) + "..." : display;
  } catch {
    // If URL parsing fails, return truncated URL
    return url.length > 50 ? url.substring(0, 47) + "..." : url;
  }
}

/**
 * Get heat color based on percentage (for visual representation)
 */
export function getHeatColor(percentage: number): string {
  // Gradient from cool (blue) to hot (red)
  if (percentage >= 50) {
    return "hsl(0, 85%, 50%)"; // Red - hot
  }
  if (percentage >= 30) {
    return "hsl(25, 85%, 50%)"; // Orange
  }
  if (percentage >= 15) {
    return "hsl(45, 85%, 50%)"; // Yellow
  }
  if (percentage >= 5) {
    return "hsl(120, 60%, 45%)"; // Green
  }
  return "hsl(200, 70%, 50%)"; // Blue - cool
}

/**
 * Get heat intensity class for Tailwind styling
 */
export function getHeatIntensityClass(percentage: number): string {
  if (percentage >= 50) {
    return "bg-red-500/20 border-red-500 text-red-700 dark:text-red-300";
  }
  if (percentage >= 30) {
    return "bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300";
  }
  if (percentage >= 15) {
    return "bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-300";
  }
  if (percentage >= 5) {
    return "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300";
  }
  return "bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300";
}

/**
 * Calculate click-through rate for a specific link
 */
export function calculateLinkCTR(clicks: number, totalSent: number): number {
  if (totalSent === 0) {
    return 0;
  }
  return (clicks / totalSent) * 100;
}

/**
 * Get top performing links from heatmap data
 */
export function getTopLinks(heatmapData: ClickHeatmapData, limit: number = 5): LinkClickData[] {
  return heatmapData.links.slice(0, limit);
}

/**
 * Generate link performance summary
 */
export function generateLinkPerformanceSummary(heatmapData: ClickHeatmapData): {
  totalLinks: number;
  totalClicks: number;
  topLink: LinkClickData | null;
  avgClicksPerLink: number;
} {
  const totalLinks = heatmapData.links.length;
  const totalClicks = heatmapData.totalClicks;
  const topLink = heatmapData.links[0] || null;
  const avgClicksPerLink = totalLinks > 0 ? totalClicks / totalLinks : 0;

  return {
    totalLinks,
    totalClicks,
    topLink,
    avgClicksPerLink,
  };
}

/**
 * Parse email content to extract links and their positions
 * This is used for visual heatmap overlays
 */
export function extractLinksFromContent(
  htmlContent: string,
): { url: string; text: string; position: number }[] {
  const links: { url: string; text: string; position: number }[] = [];
  const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(htmlContent)) !== null) {
    links.push({
      url: match[1],
      text: match[2].replace(/<[^>]*>/g, ""), // Strip inner HTML tags
      position: match.index,
    });
  }

  return links;
}

/**
 * Merge heatmap data with content links for visualization
 */
export function mergeHeatmapWithContent(
  heatmapData: ClickHeatmapData,
  contentLinks: { url: string; text: string; position: number }[],
): {
  url: string;
  text: string;
  position: number;
  clicks: number;
  percentage: number;
  heatClass: string;
}[] {
  return contentLinks.map((link) => {
    const clickData = heatmapData.links.find((l) => l.url === link.url);
    const clicks = clickData?.clicks ?? 0;
    const percentage = clickData?.percentage ?? 0;

    return {
      ...link,
      clicks,
      percentage,
      heatClass: getHeatIntensityClass(percentage),
    };
  });
}
