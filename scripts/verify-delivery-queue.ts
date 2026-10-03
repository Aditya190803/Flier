import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { closeDatabase, dbQuery } from "../lib/db";
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
