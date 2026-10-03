import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { closeDatabase, dbQuery } from "../lib/db";
import { exportCampaignAccountData } from "../lib/services/campaign-account-data";
import {
  beginDelivery,
  finishDelivery,
  listDeliveries,
  markInterruptedDeliveries,
  resolveUnknown,
  retryCampaign,
} from "../lib/services/campaign-delivery-store";
import {
  claimNextDueCampaign,
  createScheduledCampaign,
  deleteScheduledDataForUser,
  updateScheduledCampaign,
} from "../lib/services/scheduled-campaign-store";

// Never defaults to DATABASE_URL: this script only uses an explicitly supplied disposable test DB.
async function main() {
  const testUrl = process.env.QUEUE_TEST_DATABASE_URL;
  assert(testUrl, "Set QUEUE_TEST_DATABASE_URL to a disposable PostgreSQL database");
  const schema = `flier_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: testUrl });
  const scopedUrl = new URL(testUrl);
  scopedUrl.searchParams.set("options", `-c search_path=${schema}`);
  process.env.DATABASE_URL = scopedUrl.toString();
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    await dbQuery(await readFile("db/schema.sql", "utf8"));
    const input = {
      subject: "Hello",
      content: "Message",
      recipients: ["one@example.com", "two@example.com"],
      scheduledAt: new Date(Date.now() - 1000),
      userEmail: "owner@example.com",
      trackingEnabled: false,
      isMarketing: false,
      hasPersonalizedAttachments: false,
      requestId: randomUUID(),
    };
    const duplicates = await Promise.all([
      createScheduledCampaign(input),
      createScheduledCampaign(input),
    ]);
    assert.equal(duplicates[0].$id, duplicates[1].$id, "lost-response retry creates only one job");
    await createScheduledCampaign({ ...input, requestId: randomUUID() });
    const claimed = await Promise.all([
      claimNextDueCampaign(new Date()),
      claimNextDueCampaign(new Date()),
      claimNextDueCampaign(new Date()),
    ]);
    const jobs = claimed.filter(Boolean);
    assert.equal(jobs.length, 2);
    assert.equal(
      new Set(jobs.map((job) => job!.$id)).size,
      2,
      "concurrent workers claim distinct jobs",
    );
    const id = jobs[0]!.$id;
    const reservations = await Promise.all([
      beginDelivery(id, "one@example.com"),
      beginDelivery(id, "ONE@example.com"),
    ]);
    assert.equal(reservations.filter(Boolean).length, 1, "only one Gmail reservation wins");
    await markInterruptedDeliveries(id);
    assert.equal((await listDeliveries(id))[0].status, "unknown");
    await finishDelivery(id, {
      email: "two@example.com",
      status: "success",
      message_id: "gmail-2",
    });
    await updateScheduledCampaign(id, { status: "partial" });
    assert(await retryCampaign(id, input.userEmail));
    assert.equal(
      await beginDelivery(id, "one@example.com"),
      false,
      "uncertain send is held on retry",
    );
    assert.equal(await beginDelivery(id, "two@example.com"), false, "success is never retried");
    assert.equal(
      await retryCampaign(id, "other@example.com"),
      false,
      "foreign sender cannot retry",
    );
    await updateScheduledCampaign(id, { status: "partial" });
    assert(await resolveUnknown(id, "one@example.com", false));
    assert(await retryCampaign(id, input.userEmail));
    assert(
      await beginDelivery(id, "one@example.com"),
      "explicit not-sent confirmation allows retry",
    );
    const reviewId = randomUUID();
    const reviewHash = "approved-snapshot-hash";
    await dbQuery(
      `INSERT INTO campaign_reviews(id,team_id,submitter_email,snapshot,snapshot_hash,status)
      VALUES ($1,'team',$2,'{}'::jsonb,$3,'approved')`,
      [reviewId, input.userEmail, reviewHash],
    );
    const reviewed = { ...input, teamId: "team", reviewId, reviewHash, requestId: randomUUID() };
    await assert.rejects(
      createScheduledCampaign({ ...reviewed, reviewHash: "changed" }),
      /REVIEW_CONFLICT/,
    );
    assert.equal(
      (await dbQuery("SELECT status FROM campaign_reviews WHERE id = $1", [reviewId])).rows[0]
        .status,
      "approved",
      "failed approval validation rolls back consumption",
    );
    const racing = await Promise.allSettled([
      createScheduledCampaign(reviewed),
      createScheduledCampaign({ ...reviewed, requestId: randomUUID() }),
    ]);
    assert.equal(
      racing.filter((result) => result.status === "fulfilled").length,
      1,
      "one approval can queue only one campaign",
    );
    const winner = racing.find((result) => result.status === "fulfilled");
    assert(winner?.status === "fulfilled");
    const winningRow = (
      await dbQuery("SELECT request_id FROM scheduled_campaigns WHERE id = $1", [winner.value.$id])
    ).rows[0];
    const lostResponseRetry = await createScheduledCampaign({
      ...reviewed,
      requestId: winningRow.request_id,
    });
    assert.equal(
      lostResponseRetry.$id,
      winner.value.$id,
      "retry after approval consumption returns the original job",
    );
    const review = (
      await dbQuery("SELECT status, queued_campaign_id FROM campaign_reviews WHERE id = $1", [
        reviewId,
      ])
    ).rows[0];
    assert.equal(review.status, "queued");
    assert.equal(review.queued_campaign_id, winner.value.$id);
    await dbQuery(
      "INSERT INTO saved_audiences(id,user_email,name,filters) VALUES ($1,$2,'Audience','{}'::jsonb)",
      [randomUUID(), input.userEmail],
    );
    const foreignReview = randomUUID();
    await dbQuery(
      `INSERT INTO campaign_reviews(id,team_id,submitter_email,snapshot,snapshot_hash,reviewed_by)
      VALUES ($1,'team','other@example.com','{}'::jsonb,'hash',$2)`,
      [foreignReview, input.userEmail],
    );
    await dbQuery(
      "INSERT INTO campaign_review_comments(id,review_id,author_email,content) VALUES ($1,$2,$3,'Note')",
      [randomUUID(), foreignReview, input.userEmail],
    );
    const exported = await exportCampaignAccountData(input.userEmail);
    assert.equal(exported.submitted_reviews.length, 1, "export includes only owned reviews");
    assert.equal(exported.submitted_reviews[0].id, reviewId);
    assert.equal(exported.saved_audiences.length, 1);
    assert.equal(exported.review_comments.length, 1, "own comments on team reviews are exported");
    assert.equal(exported.delivery_results.length, 2);
    assert(!("oauth_tokens" in exported), "offline credentials are excluded from export");
    const removed = await deleteScheduledDataForUser(input.userEmail);
    assert(removed.savedAudiences > 0);
    assert(removed.campaignReviews > 0);
    assert(removed.reviewComments > 0);
    assert.equal(
      (await dbQuery("SELECT * FROM campaign_deliveries")).rows.length,
      0,
      "delivery results cascade with account jobs",
    );
    assert.equal(
      (await dbQuery("SELECT reviewed_by FROM campaign_reviews WHERE id = $1", [foreignReview]))
        .rows[0].reviewed_by,
      "Deleted member",
    );
    console.log("Delivery queue PostgreSQL integration checks passed");
  } finally {
    await closeDatabase();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
