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
    <section aria-label="Metric definitions" className="rounded-lg border p-4 text-sm space-y-2">
      <h2 className="font-medium">What these metrics measure</h2>
      {error && <p className="text-destructive">Campaign history unavailable: {error}</p>}
      <p>
        Sent means Gmail accepted the request. Failed means a send attempt failed; it does not mean
        a bounce. Inbox placement and bounce reports are unavailable.
      </p>
      <p>
        Open and click rates are estimates based on distinct recorded recipients per campaign,
        divided by accepted sends. Repeat events are counted once. Image blocking, privacy proxies
        and automated scanners can hide or inflate activity; these rates cannot prove someone read
        an email.
      </p>
      <p>
        {trackingStatus === "unavailable"
          ? "Tracking data is unavailable. Engagement rates are shown as unavailable until the source responds."
          : trackingStatus === "partial"
            ? `Showing ${loaded} of ${total} tracking events. Engagement metrics cover this loaded subset and may undercount.`
            : `${loaded} tracking events loaded. Zero means no activity was recorded; disabled tracking and blocked images can also produce no events.`}
      </p>
    </section>
  );
}
