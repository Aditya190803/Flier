import { createHash } from "node:crypto";
import { databases, config, Query } from "@/lib/appwrite-server";
import { dbQuery } from "@/lib/db";
import type { CampaignSnapshot } from "@/lib/services/campaign-eligibility";

export class TeamReviewError extends Error {
  constructor(
    message: string,
    public status = 403,
  ) {
    super(message);
  }
}

export async function getTeamPolicy(teamId: string, userEmail: string) {
  if (!config.teamsCollectionId || !config.teamMembersCollectionId) {
    throw new TeamReviewError("Teams are not configured", 503);
  }
  const memberships = await databases.listDocuments(
    config.databaseId,
    config.teamMembersCollectionId,
    [
      Query.equal("team_id", teamId),
      Query.equal("user_email", userEmail),
      Query.equal("status", "active"),
      Query.limit(1),
    ],
  );
  const role = memberships.documents[0]?.role as string | undefined;
  if (!role || !["owner", "admin", "member", "viewer"].includes(role)) {
    throw new TeamReviewError("Active team membership required");
  }
  const team = await databases.getDocument(config.databaseId, config.teamsCollectionId, teamId);
  let settings: { require_approval?: boolean };
  try {
    settings = typeof team.settings === "string" ? JSON.parse(team.settings) : team.settings || {};
  } catch {
    throw new TeamReviewError("Team policy cannot be verified", 503);
  }
  return { role, requiresApproval: settings?.require_approval !== false };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

/** Binds the approval to every delivery-affecting field, excluding request IDs and immediate timestamps. */
export function campaignSnapshotHash(snapshot: CampaignSnapshot): string {
  const normalized = {
    subject: snapshot.subject,
    content: snapshot.content,
    recipients: snapshot.recipients.map((email) => email.trim().toLowerCase()),
    scheduled_at: snapshot.send_now ? "now" : snapshot.scheduled_at,
    send_now: snapshot.send_now || false,
    timezone: snapshot.timezone || "",
    attachments: snapshot.attachments || [],
    csv_data: snapshot.csv_data || [],
    cc: snapshot.cc || [],
    bcc: snapshot.bcc || [],
    tracking_enabled: snapshot.tracking_enabled !== false,
    is_marketing: snapshot.is_marketing === true,
    has_personalized_attachments: snapshot.has_personalized_attachments === true,
    personalized_attachment_column: snapshot.personalized_attachment_column || "",
  };
  return createHash("sha256")
    .update(JSON.stringify(canonical(normalized)))
    .digest("hex");
}

export async function authorizeTeamCampaign(
  teamId: string,
  reviewId: string | undefined,
  snapshot: CampaignSnapshot,
  userEmail: string,
) {
  const policy = await getTeamPolicy(teamId, userEmail);
  if (policy.role === "viewer") {
    throw new TeamReviewError("Viewers cannot submit or send team campaigns");
  }
  if (!policy.requiresApproval && !reviewId) {
    return undefined;
  }
  if (!reviewId) {
    throw new TeamReviewError("Request team review before sending this campaign", 412);
  }
  const hash = campaignSnapshotHash(snapshot);
  const result = await dbQuery(
    `SELECT id FROM campaign_reviews WHERE id = $1 AND team_id = $2
    AND submitter_email = $3 AND snapshot_hash = $4 AND status IN ('approved', 'queued')`,
    [reviewId, teamId, userEmail, hash],
  );
  if (!result.rows.length) {
    throw new TeamReviewError(
      "Approval is pending, rejected, or the campaign changed. Request a new review.",
      412,
    );
  }
  return { reviewId, hash };
}
