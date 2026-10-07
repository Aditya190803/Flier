import { Info } from "lucide-react";

export function MeasurementNote({
  trackingStatus,
  loaded,
  total,
  error,
}: {
  trackingStatus: "available" | "partial" | "unavailable";
  loaded: number;
  total: number;
  error?: string;
}) {
  return (
    <section
      aria-label="Metric definitions"
      className="rounded-lg border bg-muted/20 px-4 py-3 text-sm space-y-2"
    >
      {error && <p className="text-destructive">Campaign history unavailable: {error}</p>}
      <p className="flex items-start gap-2 text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          {trackingStatus === "unavailable"
            ? "Tracking data is unavailable, so Performance, Heatmap, Recipients and Raw Events are disabled until the source responds."
            : trackingStatus === "partial"
              ? `Showing ${loaded} of ${total} tracking events. Engagement metrics cover this loaded subset and may undercount.`
              : `${loaded} tracking events loaded. Zero means no activity was recorded; disabled tracking and blocked images can also produce no events.`}
        </span>
      </p>
      <details className="pl-6">
        <summary className="cursor-pointer select-none font-medium text-foreground">
          What these metrics measure
        </summary>
        <div className="mt-2 space-y-2 text-muted-foreground">
          <p>
            Sent means Gmail accepted the request. Failed means a send attempt failed; it does not
            mean a bounce. Inbox placement and bounce reports are unavailable.
          </p>
          <p>
            Open and click rates are estimates based on distinct recorded recipients per campaign,
            divided by accepted sends. Repeat events are counted once. Image blocking, privacy
            proxies and automated scanners can hide or inflate activity; these rates cannot prove
            someone read an email.
          </p>
        </div>
      </details>
    </section>
  );
}
