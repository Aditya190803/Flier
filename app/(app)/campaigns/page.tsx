"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { campaignsService, draftEmailsService } from "@/lib/appwrite";
import {
  buildCampaignLibrary,
  filterCampaignLibrary,
  type LibraryCampaign,
} from "@/lib/campaign-library";
import { scheduledCampaignsService } from "@/lib/services/scheduled-campaigns-client";

export default function CampaignsPage() {
  const { session } = useAuthGuard();
  const router = useRouter();
  const [items, setItems] = useState<LibraryCampaign[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const load = useCallback(async () => {
    if (!session?.user?.email) {
      return;
    }
    setLoading(true);
    const results = await Promise.allSettled([
      draftEmailsService.listByUser(),
      scheduledCampaignsService.listByUser(),
      campaignsService.listByUser(),
    ]);
    const [drafts, queue, history] = results;
    setItems(
      buildCampaignLibrary(
        drafts.status === "fulfilled" ? drafts.value.documents : [],
        queue.status === "fulfilled" ? queue.value.documents : [],
        history.status === "fulfilled" ? history.value.documents : [],
      ),
    );
    setErrors(
      results.flatMap((result, index) =>
        result.status === "rejected"
          ? [
              `${["Drafts", "Delivery queue", "Sent history"][index]} unavailable: ${result.reason instanceof Error ? result.reason.message : "Refresh to retry"}`,
            ]
          : [],
      ),
    );
    setLoading(false);
  }, [session?.user?.email]);
  useEffect(() => {
    void load();
  }, [load]);
  const edit = async (item: LibraryCampaign, copy: boolean) => {
    setBusy(true);
    try {
      const draft = copy
        ? await draftEmailsService.create({
            subject: item.subject,
            content: item.content,
            recipients: item.recipients,
            attachments: item.attachments,
            csv_data: item.csv_data,
            cc: item.cc,
            bcc: item.bcc,
            has_personalized_attachments: item.has_personalized_attachments,
            personalized_attachment_column: item.personalized_attachment_column,
            saved_at: new Date().toISOString(),
          })
        : { ...item, $id: item.id };
      sessionStorage.setItem("editDraftEmail", JSON.stringify({ ...draft, id: draft.$id }));
      router.push("/compose?edit=draft");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open campaign copy");
    } finally {
      setBusy(false);
    }
  };
  const filtered = filterCampaignLibrary(items, query, status, from, to);
  return (
    <PageShell>
      <PageHeader
        title="Campaign Library"
        description="Find drafts, queued campaigns and sent history in one place"
        actions={
          <Button variant="outline" onClick={load}>
            Refresh
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground">
        Search covers the records loaded from each source (up to 100 queue jobs). Date filters use
        your local timezone and creation/save dates. Duplicating creates an editable draft and sends
        nothing.
      </p>
      {!!errors.length && (
        <ul className="text-sm text-destructive">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        <Input
          aria-label="Search campaigns"
          placeholder="Subject or recipient"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Campaign status"
          className="rounded border p-2 bg-background"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {[
            "all",
            "draft",
            "scheduled",
            "processing",
            "sent",
            "partial",
            "failed",
            "cancelled",
          ].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <label className="text-sm">
          From date
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="text-sm">
          To date
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </div>
      <p aria-live="polite" className="text-sm">
        {loading ? "Loading campaigns…" : `${filtered.length} matching campaigns`}
      </p>
      <ul className="space-y-3">
        {filtered.map((item) => (
          <li key={`${item.source}:${item.id}`} className="rounded-lg border p-4 space-y-2">
            <div>
              <h2 className="font-medium">{item.subject}</h2>
              <p className="text-sm text-muted-foreground">
                {item.status} · {item.recipients.length} recipients ·{" "}
                {new Date(item.date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.source === "draft" && (
                <Button variant="outline" disabled={busy} onClick={() => edit(item, false)}>
                  Edit draft
                </Button>
              )}
              <Button variant="outline" disabled={busy} onClick={() => edit(item, true)}>
                Duplicate and edit
              </Button>
              {item.source === "queue" && (
                <Button variant="ghost" asChild>
                  <Link href="/scheduled">Delivery details</Link>
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
