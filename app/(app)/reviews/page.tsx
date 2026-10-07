"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EmptyState, PageHeader, PageShell } from "@/components/ui/page-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { teamsService } from "@/lib/appwrite";
import { apiRequest } from "@/lib/appwrite/api-request";
import { replacePlaceholders } from "@/lib/email/placeholders";
import type { CampaignSnapshot } from "@/lib/services/campaign-eligibility";

interface Review {
  id: string;
  team_id: string;
  submitter_email: string;
  status: string;
  subject?: string;
  reviewed_by?: string;
  snapshot?: CampaignSnapshot;
}
interface Detail {
  review: Review;
  role: string;
  comments: { author_email: string; content: string; created_at: string }[];
}

const STATUS_VARIANTS: Record<string, BadgeProps["variant"]> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

function ReviewStatus({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? "outline"} className="capitalize">
      {status}
    </Badge>
  );
}

const MAX_RECIPIENT_ROWS = 50;

function ReviewsPanel() {
  const { session } = useAuthGuard();
  const params = useSearchParams();
  const [teams, setTeams] = useState<{ $id: string; name: string }[] | null>(null);
  const [teamId, setTeamId] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loadDetail = useCallback(async (id: string) => {
    try {
      const result = await apiRequest<Detail>(`/api/campaign-reviews?id=${encodeURIComponent(id)}`);
      setDetail(result);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Review unavailable");
    }
  }, []);
  const loadList = useCallback(async () => {
    if (!teamId) {
      return;
    }
    setListLoading(true);
    try {
      const data = await apiRequest<{ documents: Review[] }>(
        `/api/campaign-reviews?team_id=${encodeURIComponent(teamId)}`,
      );
      setReviews(data.documents);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Reviews unavailable");
    } finally {
      setListLoading(false);
    }
  }, [teamId]);
  useEffect(() => {
    if (!session?.user?.email) {
      return;
    }
    let active = true;
    teamsService
      .list()
      .then((result) => {
        if (active) {
          setTeams(result.documents);
          // Nothing to choose between when there is a single team.
          if (result.documents.length === 1) {
            setTeamId((current) => current || result.documents[0].$id);
          }
        }
      })
      .catch(() => {
        if (active) {
          setTeams([]);
          setError("Team list unavailable");
        }
      });
    return () => {
      active = false;
    };
  }, [session?.user?.email]);
  useEffect(() => {
    void loadList();
  }, [loadList]);
  useEffect(() => {
    const id = params.get("id");
    if (id) {
      void loadDetail(id);
    }
  }, [params, loadDetail]);
  const act = async (action: string) => {
    if (!detail) {
      return;
    }
    setBusy(true);
    try {
      await apiRequest("/api/campaign-reviews", {
        method: "PUT",
        body: JSON.stringify({
          id: detail.review.id,
          action,
          comment: comment.trim() || undefined,
        }),
      });
      setComment("");
      await loadDetail(detail.review.id);
      await loadList();
      toast.success("Review updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review action failed");
    } finally {
      setBusy(false);
    }
  };
  const snapshot = detail?.review.snapshot;
  const firstEmail = snapshot?.recipients[0] || "";
  const fields =
    snapshot?.csv_data?.find((row) =>
      Object.entries(row).some(
        ([key, value]) =>
          key.toLowerCase() === "email" && value.toLowerCase() === firstEmail.toLowerCase(),
      ),
    ) || {};
  const canDecide =
    detail &&
    ["owner", "admin"].includes(detail.role) &&
    detail.review.submitter_email !== session?.user?.email &&
    detail.review.status === "pending";
  const csvColumns = Array.from(
    new Set((snapshot?.csv_data ?? []).flatMap((row) => Object.keys(row))),
  ).filter((key) => key.toLowerCase() !== "email");
  const csvByEmail = new Map(
    (snapshot?.csv_data ?? []).map((row) => [
      (Object.entries(row).find(([key]) => key.toLowerCase() === "email")?.[1] ?? "").toLowerCase(),
      row,
    ]),
  );
  return (
    <PageShell>
      <PageHeader
        title="Reviews"
        description="Approve team campaigns before they can be sent"
        actions={
          teamId ? (
            <Button variant="outline" onClick={loadList} disabled={listLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${listLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          ) : null
        }
      />
      {error && (
        <output className="block rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </output>
      )}
      {teams === null ? (
        <Skeleton className="h-10 w-64" />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="You are not in any teams yet"
          description="Reviews happen inside a team. Create or join one to review campaigns together."
          action={
            <Button asChild>
              <Link href="/settings/teams">Go to Teams</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="review-team">Review team</Label>
            <Select
              value={teamId || undefined}
              onValueChange={(value) => {
                setTeamId(value);
                setDetail(null);
                setReviews([]);
              }}
            >
              <SelectTrigger id="review-team">
                <SelectValue placeholder="Choose a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.$id} value={team.$id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {teamId && (
            <div className="grid gap-6 lg:grid-cols-[20rem_1fr] items-start">
              <div className="rounded-lg border bg-card">
                {listLoading && reviews.length === 0 ? (
                  <div className="p-3 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <EmptyState
                    className="py-12"
                    icon={<ClipboardCheck className="h-6 w-6" />}
                    title="No reviews yet"
                    description="Campaigns sent for team review will appear here."
                  />
                ) : (
                  <ul className="divide-y">
                    {reviews.map((review) => {
                      const selected = detail?.review.id === review.id;
                      return (
                        <li
                          key={review.id}
                          className={`p-3 space-y-2 ${selected ? "bg-accent/60" : ""}`}
                          aria-current={selected ? "true" : undefined}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm truncate">
                              {review.subject || "(No subject)"}
                            </p>
                            <ReviewStatus status={review.status} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            From {review.submitter_email}
                          </p>
                          <Button
                            variant={selected ? "secondary" : "outline"}
                            size="sm"
                            className="w-full"
                            onClick={() => loadDetail(review.id)}
                          >
                            Inspect campaign
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {detail && snapshot ? (
                <section
                  aria-label="Campaign review details"
                  className="rounded-lg border bg-card p-5 space-y-5 min-w-0"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{snapshot.subject}</h2>
                      <ReviewStatus status={detail.review.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Submitted by {detail.review.submitter_email}
                      {detail.review.reviewed_by
                        ? ` · reviewed by ${detail.review.reviewed_by}`
                        : ""}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {[
                      ["Recipients", String(snapshot.recipients.length)],
                      [
                        "Delivery",
                        snapshot.send_now
                          ? "Send now after approval"
                          : new Date(snapshot.scheduled_at).toLocaleString(),
                      ],
                      ["Type", snapshot.is_marketing ? "Marketing" : "Transactional"],
                      ["Tracking", snapshot.tracking_enabled === false ? "Off" : "On"],
                      ["Cc", snapshot.cc?.join(", ") || "None"],
                      ["Bcc", snapshot.bcc?.join(", ") || "None"],
                      [
                        "Attachments",
                        snapshot.attachments?.map((file) => file.fileName).join(", ") || "None",
                      ],
                      [
                        "Personalized files",
                        snapshot.has_personalized_attachments
                          ? `Column: ${snapshot.personalized_attachment_column}`
                          : "None",
                      ],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md bg-muted/40 p-2.5 min-w-0">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="font-medium break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">
                      Sample for {firstEmail}:{" "}
                      <span className="font-normal">
                        {replacePlaceholders(snapshot.subject, { email: firstEmail, ...fields })}
                      </span>
                    </h3>
                    <iframe
                      title="Reviewed email sample"
                      sandbox=""
                      className="w-full h-80 border rounded-md bg-white"
                      srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><body>${replacePlaceholders(snapshot.content, { email: firstEmail, ...fields })}</body>`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Remote images and scripts are blocked in this preview. Approval does not send
                      anything; the sender still sends it, and any change needs a new approval.
                    </p>
                  </div>
                  <details className="rounded-md border">
                    <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">
                      Recipients and personalization fields ({snapshot.recipients.length})
                    </summary>
                    <div className="max-h-72 overflow-auto border-t">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted text-left">
                          <tr>
                            <th className="px-3 py-2 font-medium">Email</th>
                            {csvColumns.map((column) => (
                              <th key={column} className="px-3 py-2 font-medium">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {snapshot.recipients.slice(0, MAX_RECIPIENT_ROWS).map((email) => {
                            const row = csvByEmail.get(email.toLowerCase()) ?? {};
                            return (
                              <tr key={email}>
                                <td className="px-3 py-1.5">{email}</td>
                                {csvColumns.map((column) => (
                                  <td key={column} className="px-3 py-1.5">
                                    {row[column] ?? ""}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {snapshot.recipients.length > MAX_RECIPIENT_ROWS && (
                        <p className="px-3 py-2 text-xs text-muted-foreground border-t">
                          Showing the first {MAX_RECIPIENT_ROWS} of {snapshot.recipients.length}{" "}
                          recipients.
                        </p>
                      )}
                    </div>
                  </details>
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">Discussion</h3>
                    {detail.comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No comments yet.</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {detail.comments.map((note, index) => (
                          <li key={index} className="rounded-md bg-muted/50 p-3">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {note.author_email}
                              </span>{" "}
                              · {new Date(note.created_at).toLocaleString()}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap">{note.content}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {detail.role !== "viewer" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="review-comment">Review comment</Label>
                        <textarea
                          id="review-comment"
                          className="w-full min-h-20 rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={comment}
                          maxLength={2000}
                          disabled={busy}
                          placeholder={
                            canDecide ? "Required when rejecting" : "Add a note for the team"
                          }
                          onChange={(event) => setComment(event.target.value)}
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {canDecide && (
                        <>
                          <Button disabled={busy} onClick={() => act("approved")}>
                            Approve campaign
                          </Button>
                          <Button
                            variant="destructive"
                            disabled={busy || !comment.trim()}
                            onClick={() => act("rejected")}
                          >
                            Reject with comment
                          </Button>
                        </>
                      )}
                      {detail.role !== "viewer" && (
                        <Button
                          variant="outline"
                          disabled={busy || !comment.trim()}
                          onClick={() => act("comment")}
                        >
                          Add comment
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => loadDetail(detail.review.id)}
                        className="ml-auto"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </section>
              ) : (
                reviews.length > 0 && (
                  <div className="hidden lg:flex rounded-lg border border-dashed p-10 text-sm text-muted-foreground items-center justify-center">
                    Select a review to inspect the campaign.
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
export default function ReviewsPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </PageShell>
      }
    >
      <ReviewsPanel />
    </Suspense>
  );
}
