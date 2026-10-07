"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { teamsService } from "@/lib/appwrite";
import { apiRequest } from "@/lib/appwrite/api-request";

// Radix Select cannot use "" as an item value.
const PERSONAL = "__personal__";

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
      <div className="space-y-1.5">
        <p className="font-medium">Campaign workspace</p>
        <Select
          value={teamId || PERSONAL}
          disabled={busy}
          onValueChange={(value) => setTeamId(value === PERSONAL ? "" : value)}
        >
          <SelectTrigger aria-label="Campaign workspace" className="sm:max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PERSONAL}>Personal campaign</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.$id} value={team.$id} disabled={team.user_role === "viewer"}>
                {team.name}
                {team.user_role === "viewer" ? " (viewer)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-destructive">{error}</p>}
      {teamId && (
        <>
          <p className="text-muted-foreground">
            Another owner or admin must approve the exact content, audience, attachments and send
            options before this can be sent. Any change needs a new review.
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
              <Badge variant="outline" aria-live="polite" className="capitalize">
                {status || "Review requested"}
              </Badge>
              <Link
                className="text-primary underline-offset-4 hover:underline"
                href={`/reviews?id=${encodeURIComponent(reviewId)}`}
              >
                View review
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
