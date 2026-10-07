"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Copy, Mail, PenSquare, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, PageShell, PageHeader } from "@/components/ui/page-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { campaignsService, draftEmailsService } from "@/lib/appwrite";
import {
  buildCampaignLibrary,
  filterCampaignLibrary,
  type LibraryCampaign,
} from "@/lib/campaign-library";
import { scheduledCampaignsService } from "@/lib/services/scheduled-campaigns-client";

const STATUSES: { value: string; label: string; variant: BadgeProps["variant"] }[] = [
  { value: "draft", label: "Draft", variant: "secondary" },
  { value: "scheduled", label: "Scheduled", variant: "info" },
  { value: "processing", label: "Sending", variant: "warning" },
  { value: "sent", label: "Sent", variant: "success" },
  { value: "partial", label: "Partially sent", variant: "warning" },
  { value: "failed", label: "Failed", variant: "destructive" },
  { value: "cancelled", label: "Cancelled", variant: "ghost" },
];

function StatusBadge({ status }: { status: string }) {
  const meta = STATUSES.find((s) => s.value === status);
  return (
    <Badge variant={meta?.variant ?? "outline"} className="capitalize">
      {meta?.label ?? status}
    </Badge>
  );
}

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
              `${["Drafts", "Scheduled campaigns", "Sent history"][index]} couldn't be loaded${result.reason instanceof Error ? `: ${result.reason.message}` : ""}.`,
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
  const hasFilters = Boolean(query || from || to || status !== "all");
  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setFrom("");
    setTo("");
  };
  return (
    <PageShell>
      <PageHeader
        title="Campaigns"
        description="Every draft, scheduled and sent campaign in one place"
        actions={
          <>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/compose">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Link>
            </Button>
          </>
        }
      />
      {!!errors.length && (
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <ul className="space-y-1">
            {errors.map((error) => (
              <li key={error}>{error} Refresh to try again.</li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_10rem_10rem] items-end">
        <div className="space-y-1.5">
          <Label htmlFor="campaign-search">Search campaigns</Label>
          <Input
            id="campaign-search"
            icon={<Search className="h-4 w-4" />}
            placeholder="Subject or recipient"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campaign-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="campaign-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campaign-from">From</Label>
          <Input
            id="campaign-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campaign-to">To</Label>
          <Input
            id="campaign-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 -mt-4">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {loading
            ? "Loading campaigns…"
            : `${filtered.length} matching ${filtered.length === 1 ? "campaign" : "campaigns"}`}
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-6 w-6" />}
          title={hasFilters ? "No campaigns match these filters" : "No campaigns yet"}
          description={
            hasFilters
              ? "Try a different search or clear the filters."
              : "Drafts, scheduled and sent campaigns will all show up here."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/compose">
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {filtered.map((item) => (
            <li
              key={`${item.source}:${item.id}`}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium truncate">{item.subject || "(No subject)"}</h2>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.recipients.length}{" "}
                  {item.recipients.length === 1 ? "recipient" : "recipients"} ·{" "}
                  {new Date(item.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {item.source === "draft" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => edit(item, false)}
                  >
                    <PenSquare className="h-4 w-4 mr-2" />
                    Edit draft
                  </Button>
                )}
                {item.source === "queue" && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/scheduled">Delivery details</Link>
                  </Button>
                )}
                {item.source === "history" && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/insights?campaign=${encodeURIComponent(item.id)}`}>
                      View results
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => edit(item, true)}
                  title="Creates an editable draft copy. Nothing is sent."
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate and edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
