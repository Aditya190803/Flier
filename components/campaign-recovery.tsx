"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/appwrite/api-request";
import type { ScheduledCampaign } from "@/types/scheduled-campaign";

type Result = { email: string; status: string; error?: string };
type Health = {
  configured: boolean;
  offlineReady: boolean;
  last_tick?: string;
  overdue?: number;
  failed?: number;
};

export function DeliveryHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () =>
      apiRequest<Health>("/api/campaign-recovery")
        .then((result) => {
          if (active) {
            setHealth(result);
            setError("");
          }
        })
        .catch(() => {
          if (active) {
            setError("Delivery health unavailable. Refresh to check worker status.");
          }
        });
    void load();
    const timer = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const healthy =
    health?.last_tick && Date.now() - new Date(health.last_tick).getTime() < 5 * 60_000;
  return (
    <section aria-label="Delivery health" className="rounded-lg border p-4 space-y-2 text-sm">
      <h2 className="font-medium">Delivery health</h2>
      {error ? (
        <output>{error}</output>
      ) : !health ? (
        <p>Checking delivery…</p>
      ) : (
        <>
          <p>
            {!health.configured
              ? "Background delivery is not configured. An administrator must configure the database and worker."
              : healthy
                ? "Worker is responding."
                : "Worker heartbeat is missing or overdue. Ask your administrator to check the scheduled clock."}
          </p>
          {health.configured && (
            <p>
              {health.overdue || 0} overdue campaigns · {health.failed || 0} need attention
            </p>
          )}
          {!health.offlineReady && (
            <Button
              variant="outline"
              onClick={() => signIn("google", { callbackUrl: "/scheduled" })}
            >
              Reconnect Google for background delivery
            </Button>
          )}
        </>
      )}
    </section>
  );
}

export function CampaignRecovery({
  campaign,
  onChange,
}: {
  campaign: ScheduledCampaign;
  onChange: () => Promise<void>;
}) {
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const data = await apiRequest<{ results: Result[] }>(
        `/api/campaign-recovery?id=${encodeURIComponent(campaign.$id)}`,
      );
      setResults(data.results);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load delivery results");
    }
  }, [campaign.$id]);
  const act = async (action: Record<string, unknown>) => {
    setBusy(true);
    try {
      await apiRequest("/api/campaign-recovery", {
        method: "POST",
        body: JSON.stringify({ id: campaign.$id, ...action }),
      });
      await load();
      await onChange();
      toast.success("Recovery action saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Recovery failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3 mt-3">
      <Button variant="outline" onClick={load}>
        Review delivery results
      </Button>
      {results && (
        <div className="space-y-2 text-sm">
          <p>
            Successful and excluded recipients are kept. Retry sends only confirmed failures and
            recipients not yet attempted.
          </p>
          <ul className="max-h-72 overflow-y-auto space-y-2">
            {results.map((result) => (
              <li key={result.email} className="rounded border p-2">
                <p>
                  {result.email} · {result.status}
                </p>
                {result.error && <p className="text-muted-foreground">{result.error}</p>}
                {result.status === "unknown" && (
                  <details>
                    <summary>Resolve uncertain outcome</summary>
                    <p>
                      Check this recipient in Gmail Sent. Confirming “not sent” makes this recipient
                      eligible for retry and may create a duplicate if your check is incorrect.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          act({
                            action: "resolve",
                            email: result.email,
                            sent: true,
                            confirmed: true,
                          })
                        }
                      >
                        I checked Gmail: sent
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          act({
                            action: "resolve",
                            email: result.email,
                            sent: false,
                            confirmed: true,
                          })
                        }
                      >
                        I checked Gmail: not sent
                      </Button>
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
          <Button disabled={busy} onClick={() => act({ action: "retry" })}>
            Retry confirmed failures and unsent recipients
          </Button>
        </div>
      )}
    </div>
  );
}
