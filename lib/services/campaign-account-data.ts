import { dbQuery, isDatabaseConfigured } from "@/lib/db";

/** Account export excludes offline OAuth secrets and other submitters' campaign snapshots. */
export async function exportCampaignAccountData(userEmail: string) {
  if (!isDatabaseConfigured()) {
    return {};
  }
  const result = await dbQuery(
    `SELECT
    (SELECT coalesce(jsonb_agg(c), '[]'::jsonb) FROM scheduled_campaigns c WHERE user_email = $1) AS queued_campaigns,
    (SELECT coalesce(jsonb_agg(d), '[]'::jsonb) FROM campaign_deliveries d
      JOIN scheduled_campaigns c ON c.id = d.campaign_id WHERE c.user_email = $1) AS delivery_results,
    (SELECT coalesce(jsonb_agg(a), '[]'::jsonb) FROM saved_audiences a WHERE user_email = $1) AS saved_audiences,
    (SELECT coalesce(jsonb_agg(r), '[]'::jsonb) FROM campaign_reviews r WHERE submitter_email = $1) AS submitted_reviews,
    (SELECT coalesce(jsonb_agg(n), '[]'::jsonb) FROM campaign_review_comments n WHERE author_email = $1) AS review_comments`,
    [userEmail],
  );
  return result.rows[0] || {};
}
