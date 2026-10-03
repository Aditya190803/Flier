"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import { Loader2, MousePointerClick } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LinkStat {
  link_id: string;
  url: string;
  clicks: number;
  uniqueClicks: number;
}

interface EmailHeatmapOverlayProps {
  htmlContent: string;
  linkStats: LinkStat[];
  loading?: boolean;
  className?: string;
}

export function EmailHeatmapOverlay({
  htmlContent,
  linkStats,
  loading = false,
  className,
}: EmailHeatmapOverlayProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);

  useEffect(() => {
    setTotalClicks(linkStats.reduce((sum, s) => sum + s.clicks, 0));
  }, [linkStats]);

  const injectHeatmap = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) {
      return;
    }

    const doc = iframe.contentDocument;
    const links = doc.querySelectorAll("a");

    // Remove existing overlays if any
    doc.querySelectorAll(".heatmap-overlay").forEach((el) => el.remove());

    links.forEach((link) => {
      const href = link.getAttribute("href");
      const linkId = link.getAttribute("data-link-id");

      // Find matching stat
      const stat = linkStats.find((s) => s.link_id === linkId || s.url === href);

      if (stat && stat.clicks > 0) {
        const percentage = totalClicks > 0 ? (stat.clicks / totalClicks) * 100 : 0;

        // Create overlay badge
        const badge = doc.createElement("span");
        badge.className = "heatmap-overlay";
        badge.textContent = `${stat.clicks}`;

        // Style the badge
        Object.assign(badge.style, {
          position: "absolute",
          top: "-10px",
          right: "-10px",
          backgroundColor: percentage > 50 ? "#ef4444" : percentage > 20 ? "#f97316" : "#3b82f6",
          color: "white",
          borderRadius: "10px",
          padding: "2px 6px",
          fontSize: "10px",
          fontWeight: "bold",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          zIndex: "1000",
          pointerEvents: "none",
        });

        // Ensure link is relative for positioning
        if (window.getComputedStyle(link).position === "static") {
          link.style.position = "relative";
        }

        link.appendChild(badge);

        // Highlight the link itself
        link.style.outline = `2px solid ${percentage > 50 ? "#ef4444" : percentage > 20 ? "#f97316" : "#3b82f6"}`;
        link.style.outlineOffset = "2px";
        link.style.backgroundColor =
          percentage > 50 ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)";
      }
    });
  }, [linkStats, totalClicks]);

  useEffect(() => {
    if (iframeLoaded) {
      injectHeatmap();
    }
  }, [iframeLoaded, injectHeatmap, htmlContent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MousePointerClick className="h-4 w-4" />
            Click Heatmap
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px]">
              {linkStats.length} Links Tracked
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {totalClicks} Total Clicks
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative w-full aspect-[4/5] sm:aspect-[16/10]">
          <iframe
            ref={iframeRef}
            title="Email click heatmap"
            className="w-full h-full border-0"
            srcDoc={`
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { margin: 0; padding: 20px; font-family: sans-serif; }
                    * { box-sizing: border-box; }
                  </style>
                </head>
                <body>${htmlContent}</body>
              </html>
            `}
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
