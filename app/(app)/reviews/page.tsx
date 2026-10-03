"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
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

function ReviewsPanel() {
  const { session } = useAuthGuard();
  const params = useSearchParams();
  const [teams, setTeams] = useState<{ $id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
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
    try {
      const data = await apiRequest<{ documents: Review[] }>(
        `/api/campaign-reviews?team_id=${encodeURIComponent(teamId)}`,
      );
      setReviews(data.documents);
      setError("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Reviews unavailable");
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
        }
      })
      .catch(() => {
        if (active) {
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
  return (
    <PageShell>
      <PageHeader
        title="Campaign Reviews"
        description="Review frozen team campaigns before they enter the delivery queue"
      />
      <label className="text-sm space-y-1">
        Review team
        <select
          aria-label="Review team"
          className="block rounded border p-2 bg-background"
          value={teamId}
          onChange={(event) => {
            setTeamId(event.target.value);
            setDetail(null);
            setReviews([]);
          }}
        >
          <option value="">Choose a team</option>
          {teams.map((team) => (
            <option key={team.$id} value={team.$id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      {error && <output className="text-sm text-destructive">{error}</output>}
      {teamId && (
        <Button variant="outline" onClick={loadList}>
          Refresh reviews
        </Button>
      )}
      <ul className="space-y-2">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="rounded border p-3 flex flex-wrap justify-between gap-2 text-sm"
          >
            <span>
              {review.subject} · {review.status} · {review.submitter_email}
            </span>
            <Button variant="outline" size="sm" onClick={() => loadDetail(review.id)}>
              Inspect campaign
            </Button>
          </li>
        ))}
      </ul>
      {detail && snapshot && (
        <section aria-label="Campaign review details" className="rounded-lg border p-4 space-y-4">
          <h2 className="font-medium">{snapshot.subject}</h2>
          <p className="text-sm">
            {detail.review.status} · submitted by {detail.review.submitter_email}
            {detail.review.reviewed_by ? ` · reviewed by ${detail.review.reviewed_by}` : ""}
          </p>
          <p className="text-sm">
            {snapshot.recipients.length} recipients ·{" "}
            {snapshot.send_now
              ? "Send now after approval"
              : new Date(snapshot.scheduled_at).toLocaleString()}{" "}
            · {snapshot.is_marketing ? "Marketing" : "Transactional"} · tracking{" "}
            {snapshot.tracking_enabled === false ? "off" : "on"}
          </p>
          <p className="text-sm">
            Cc: {snapshot.cc?.join(", ") || "none"} · Bcc: {snapshot.bcc?.join(", ") || "none"}
          </p>
          <details>
            <summary>Recipients and frozen fields</summary>
            <pre className="max-h-60 overflow-auto text-xs whitespace-pre-wrap">
              {JSON.stringify(
                { recipients: snapshot.recipients, fields: snapshot.csv_data },
                null,
                2,
              )}
            </pre>
          </details>
          <p className="text-sm">
            Attachments: {snapshot.attachments?.map((file) => file.fileName).join(", ") || "none"}
            {snapshot.has_personalized_attachments
              ? ` · personalized column: ${snapshot.personalized_attachment_column}`
              : ""}
          </p>
          <p className="text-sm">
            Sample for {firstEmail}:{" "}
            {replacePlaceholders(snapshot.subject, { email: firstEmail, ...fields })}
          </p>
          <iframe
            title="Reviewed email sample"
            sandbox=""
            className="w-full h-80 border rounded"
            srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><body>${replacePlaceholders(snapshot.content, { email: firstEmail, ...fields })}</body>`}
          />
          <p className="text-xs text-muted-foreground">
            Remote images and scripts are blocked in this review preview. Changing delivery details
            requires a new approval. Approval does not send mail; the original sender must dispatch
            it.
          </p>
          <ul className="space-y-2 text-sm">
            {detail.comments.map((note, index) => (
              <li key={index} className="rounded bg-muted p-2">
                <p className="font-medium">
                  {note.author_email} · {new Date(note.created_at).toLocaleString()}
                </p>
                <p className="whitespace-pre-wrap">{note.content}</p>
              </li>
            ))}
          </ul>
          {detail.role !== "viewer" && (
            <label className="block text-sm">
              Review comment
              <textarea
                className="mt-1 w-full rounded border p-2 bg-background"
                value={comment}
                maxLength={2000}
                disabled={busy}
                onChange={(event) => setComment(event.target.value)}
              />
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            {detail.role !== "viewer" && (
              <Button
                variant="outline"
                disabled={busy || !comment.trim()}
                onClick={() => act("comment")}
              >
                Add comment
              </Button>
            )}
            {canDecide && (
              <>
                <Button disabled={busy} onClick={() => act("approved")}>
                  Approve campaign
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !comment.trim()}
                  onClick={() => act("rejected")}
                >
                  Reject with comment
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => loadDetail(detail.review.id)}>
              Refresh details
            </Button>
          </div>
        </section>
      )}
    </PageShell>
  );
}
export default function ReviewsPage() {
  return (
    <Suspense fallback={<p>Loading reviews…</p>}>
      <ReviewsPanel />
    </Suspense>
  );
}
