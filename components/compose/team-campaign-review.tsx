"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { teamsService } from "@/lib/appwrite";
import { apiRequest } from "@/lib/appwrite/api-request";

export function TeamCampaignReview({
  teamId,
  setTeamId,
  reviewId,
  requestReview,
  busy,
}: {
  teamId: string;
  setTeamId: (id: string) => void;
  reviewId: string;
  requestReview: () => Promise<void>;
  busy: boolean;
}) {
  const [teams, setTeams] = useState<{ $id: string; name: string; user_role?: string }[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
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
          setError("Team list unavailable. Refresh before choosing a team campaign.");
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setStatus("");
  }, [reviewId, teamId]);
  return (
    <section
      aria-label="Team campaign approval"
      className="rounded-lg border p-4 space-y-3 text-sm"
    >
      <label className="flex flex-col gap-1">
        Campaign workspace
        <select
          aria-label="Campaign workspace"
          value={teamId}
          disabled={busy}
          className="rounded border p-2 bg-background"
          onChange={(event) => setTeamId(event.target.value)}
        >
          <option value="">Personal campaign</option>
          {teams.map((team) => (
            <option key={team.$id} value={team.$id} disabled={team.user_role === "viewer"}>
              {team.name}
              {team.user_role === "viewer" ? " (viewer)" : ""}
            </option>
          ))}
        </select>
      </label>
      {error && <p>{error}</p>}
      {teamId && (
        <>
          <p>
            Team approval policy is checked on the server. Another owner or admin must approve the
            exact content, audience, attachments and send options. Changes require a new review.
          </p>
          <Button variant="outline" disabled={busy} onClick={requestReview}>
            Request team review
          </Button>
          {reviewId && (
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant="outline"
                disabled={busy}
                onClick={async () => {
                  try {
                    const data = await apiRequest<{ review: { status: string } }>(
                      `/api/campaign-reviews?id=${encodeURIComponent(reviewId)}`,
                    );
                    setStatus(data.review.status);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Review unavailable");
                  }
                }}
              >
                Refresh approval status
              </Button>
              <span aria-live="polite">{status || "Review requested"}</span>
              <Link className="underline" href={`/reviews?id=${encodeURIComponent(reviewId)}`}>
                View review
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
