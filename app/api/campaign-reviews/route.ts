import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAuthed, requireSession } from "@/lib/api-auth";
import { dbQuery } from "@/lib/db";
import { checkCampaignEligibility } from "@/lib/services/campaign-eligibility";
import { campaignSnapshotHash, getTeamPolicy, TeamReviewError } from "@/lib/services/team-review";
import { scheduledCampaignSchema } from "@/lib/validation";

function failure(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof TeamReviewError
          ? error.message
          : "Review unavailable. Refresh before taking another action.",
    },
    { status: error instanceof TeamReviewError ? error.status : 503 },
  );
}
export async function GET(request: NextRequest) {
  const auth = await requireSession(request);
  if (!isAuthed(auth)) {
    return auth;
  }
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      if (!z.string().uuid().safeParse(id).success) {
        throw new TeamReviewError("Invalid review ID", 400);
      }
      const result = await dbQuery("SELECT * FROM campaign_reviews WHERE id = $1", [id]);
      const review = result.rows[0];
      if (!review) {
        throw new TeamReviewError("Not found", 404);
      }
      const policy = await getTeamPolicy(review.team_id, auth.email);
      const comments = await dbQuery(
        "SELECT author_email, content, created_at FROM campaign_review_comments WHERE review_id = $1 ORDER BY created_at",
        [id],
      );
      return NextResponse.json({ review, comments: comments.rows, role: policy.role });
    }
    const teamId = request.nextUrl.searchParams.get("team_id");
    if (!teamId) {
      throw new TeamReviewError("Choose a team", 400);
    }
    const policy = await getTeamPolicy(teamId, auth.email);
    const result = await dbQuery(
      `SELECT id, team_id, submitter_email, status, reviewed_by, created_at,
      snapshot->>'subject' AS subject, jsonb_array_length(snapshot->'recipients') AS recipient_count
      FROM campaign_reviews WHERE team_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [teamId],
    );
    return NextResponse.json({ documents: result.rows, role: policy.role });
  } catch (error) {
    return failure(error);
  }
}
const createSchema = z.object({
  team_id: z.string().min(1).max(100),
  snapshot: scheduledCampaignSchema,
});
export async function POST(request: NextRequest) {
  const auth = await requireSession(request);
  if (!isAuthed(auth)) {
    return auth;
  }
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new TeamReviewError("Invalid review snapshot", 400);
    }
    const { team_id, snapshot: input } = parsed.data;
    const policy = await getTeamPolicy(team_id, auth.email);
    if (policy.role === "viewer") {
      throw new TeamReviewError("Viewers cannot submit campaigns");
    }
    const report = await checkCampaignEligibility(input, auth.email);
    if (report.issues.length) {
      throw new TeamReviewError(report.issues[0].message, 400);
    }
    const snapshot = {
      ...input,
      recipients: report.recipients,
      team_id: undefined,
      review_id: undefined,
      request_id: undefined,
    };
    const result = await dbQuery(
      `INSERT INTO campaign_reviews(id, team_id, submitter_email, snapshot, snapshot_hash)
      VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING id, status`,
      [randomUUID(), team_id, auth.email, JSON.stringify(snapshot), campaignSnapshotHash(snapshot)],
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approved", "rejected", "comment"]),
  comment: z.string().trim().max(2000).optional(),
});
export async function PUT(request: NextRequest) {
  const auth = await requireSession(request);
  if (!isAuthed(auth)) {
    return auth;
  }
  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new TeamReviewError("Invalid review action", 400);
    }
    const data = parsed.data;
    const found = await dbQuery(
      "SELECT team_id, submitter_email, status FROM campaign_reviews WHERE id = $1",
      [data.id],
    );
    const review = found.rows[0];
    if (!review) {
      throw new TeamReviewError("Not found", 404);
    }
    const policy = await getTeamPolicy(review.team_id, auth.email);
    if (policy.role === "viewer") {
      throw new TeamReviewError("Viewers cannot change reviews");
    }
    if (data.action === "comment") {
      if (!data.comment) {
        throw new TeamReviewError("Write a comment", 400);
      }
      await dbQuery(
        "INSERT INTO campaign_review_comments(id,review_id,author_email,content) VALUES ($1,$2,$3,$4)",
        [randomUUID(), data.id, auth.email, data.comment],
      );
    } else {
      if (!["owner", "admin"].includes(policy.role)) {
        throw new TeamReviewError("Only owners and admins may approve or reject");
      }
      if (review.submitter_email === auth.email) {
        throw new TeamReviewError("Another owner or admin must review your campaign");
      }
      if (data.action === "rejected" && !data.comment) {
        throw new TeamReviewError("Explain why this campaign was rejected", 400);
      }
      const result = await dbQuery(
        `WITH decision AS (
        UPDATE campaign_reviews SET status = $2, reviewed_by = $3, reviewed_at = now()
        WHERE id = $1 AND status = 'pending' RETURNING id
      ), note AS (
        INSERT INTO campaign_review_comments(id,review_id,author_email,content)
        SELECT $4,id,$3,$5 FROM decision WHERE $5::text IS NOT NULL
      ) SELECT id FROM decision`,
        [data.id, data.action, auth.email, randomUUID(), data.comment || null],
      );
      if (!result.rows.length) {
        throw new TeamReviewError("Review changed. Refresh before deciding.", 409);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
