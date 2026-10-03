"use client";

import { useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/appwrite/api-request";
import type { PreflightInput, PreflightReport } from "@/lib/email/preflight";

export function CampaignReview({
  input,
  isMarketing,
  onSendTest,
  isSendingTest,
}: {
  input: PreflightInput;
  isMarketing: boolean;
  onSendTest: () => Promise<void>;
  isSendingTest: boolean;
}) {
  const [result, setResult] = useState<{ fingerprint: string; report: PreflightReport } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const fingerprint = JSON.stringify({ ...input, isMarketing });
  const report = result?.fingerprint === fingerprint ? result.report : null;

  const review = async () => {
    setBusy(true);
    try {
      const report = await apiRequest<PreflightReport>("/api/campaign-preflight", {
        method: "POST",
        body: fingerprint,
      });
      setResult({ fingerprint, report });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to review campaign");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border p-4" aria-label="Pre-send review">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Check before sending</h3>
          <p className="text-sm text-muted-foreground">
            Review recipient data and attachments, then send a sample to yourself.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={review}>
            {busy ? "Checking…" : "Check campaign"}
          </Button>
          <Button
            variant="outline"
            disabled={isSendingTest || !input.subject.trim() || !input.recipients.length}
            onClick={onSendTest}
          >
            {isSendingTest ? "Sending test…" : "Send test to myself"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        The test uses the selected preview recipient's data and attachments. It excludes Cc/Bcc,
        campaign tracking, and unsubscribe actions.
      </p>
      {report && (
        <div aria-live="polite" className="space-y-2 text-sm">
          <p>
            {report.recipients.length} eligible recipients · {report.duplicates} duplicates excluded
            · {report.suppressed.length} unsubscribed excluded
          </p>
          {!report.issues.length ? (
            <p className="text-success">Ready to send. Eligibility is checked again at dispatch.</p>
          ) : (
            <ul className="max-h-60 overflow-y-auto space-y-1 text-destructive">
              {report.issues.map((issue, index) => (
                <li key={index}>
                  {issue.recipient ? `${issue.recipient}: ` : ""}
                  {issue.message}
                </li>
              ))}
            </ul>
          )}
          {!!report.suppressed.length && (
            <details>
              <summary>Excluded recipients</summary>
              <ul>
                {report.suppressed.map((email) => (
                  <li key={email}>{email}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {result && !report && (
        <p className="text-sm text-muted-foreground">Campaign changed. Check it again.</p>
      )}
    </section>
  );
}
