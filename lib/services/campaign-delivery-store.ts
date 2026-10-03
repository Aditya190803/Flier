import { dbQuery } from "@/lib/db";

export interface DeliveryResult {
  email: string;
  status: "sending" | "success" | "error" | "skipped" | "unknown";
  message_id?: string;
  error?: string;
}

export async function listDeliveries(id: string): Promise<DeliveryResult[]> {
  const result = await dbQuery<DeliveryResult & Record<string, unknown>>(
    "SELECT email, status, message_id, error FROM campaign_deliveries WHERE campaign_id = $1 ORDER BY email",
    [id],
  );
  return result.rows;
}

/** Durable reservation before Gmail is called. A crash leaves an uncertain result, never a resend. */
export async function beginDelivery(id: string, email: string): Promise<boolean> {
  const result = await dbQuery(
    `INSERT INTO campaign_deliveries(campaign_id, email, status) VALUES ($1, $2, 'sending')
     ON CONFLICT DO NOTHING RETURNING email`,
    [id, email.toLowerCase()],
  );
  return result.rowCount === 1;
}

export async function finishDelivery(id: string, result: DeliveryResult): Promise<void> {
  await dbQuery(
    `INSERT INTO campaign_deliveries(campaign_id, email, status, message_id, error)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (campaign_id, email) DO UPDATE
     SET status = EXCLUDED.status, message_id = EXCLUDED.message_id, error = EXCLUDED.error, updated_at = now()`,
    [
      id,
      result.email.toLowerCase(),
      result.status,
      result.message_id || null,
      result.error?.slice(0, 2000) || null,
    ],
  );
}

export async function markInterruptedDeliveries(id: string): Promise<void> {
  await dbQuery(
    `UPDATE campaign_deliveries SET status = 'unknown',
    error = 'Worker interrupted. Check Gmail Sent before deciding whether to resend.', updated_at = now()
    WHERE campaign_id = $1 AND status = 'sending'`,
    [id],
  );
}

/** Claim the terminal campaign and clear only confirmed failures in the same statement. */
export async function retryCampaign(id: string, userEmail: string): Promise<boolean> {
  const result = await dbQuery(
    `WITH retry AS (
    UPDATE scheduled_campaigns SET status = 'scheduled', scheduled_at = now(), attempts = 0,
      cancel_requested = false, locked_at = NULL, last_error = NULL, updated_at = now()
    WHERE id = $1 AND user_email = $2 AND status IN ('failed', 'partial', 'cancelled')
    RETURNING id
  ), cleared AS (
    DELETE FROM campaign_deliveries WHERE campaign_id IN (SELECT id FROM retry) AND status = 'error'
  ) SELECT id FROM retry`,
    [id, userEmail],
  );
  return result.rows.length === 1;
}

export async function resolveUnknown(id: string, email: string, sent: boolean): Promise<boolean> {
  const result = await dbQuery(
    `UPDATE campaign_deliveries
    SET status = $3, error = $4, updated_at = now()
    WHERE campaign_id = $1 AND email = $2 AND status = 'unknown' RETURNING email`,
    [
      id,
      email.toLowerCase(),
      sent ? "success" : "error",
      sent ? "Confirmed in Gmail Sent by sender" : "Sender confirmed not sent",
    ],
  );
  return result.rowCount === 1;
}

export function isUncertainDeliveryError(error: string): boolean {
  // Explicit Gmail rejections are safe to retry. Network/timeout/5xx outcomes are uncertain.
  return !/Gmail API error \(4\d\d\)|Invalid email address|rate limit exceeded|quota exceeded/i.test(
    error,
  );
}

export async function recordWorkerTick(): Promise<void> {
  await dbQuery(`INSERT INTO delivery_worker_health(id, last_tick) VALUES (1, now())
    ON CONFLICT (id) DO UPDATE SET last_tick = EXCLUDED.last_tick`);
}

export async function getDeliveryHealth(userEmail: string) {
  const result = await dbQuery(
    `SELECT
    (SELECT last_tick FROM delivery_worker_health WHERE id = 1) AS last_tick,
    count(*) FILTER (WHERE status = 'scheduled' AND scheduled_at < now() - interval '5 minutes')::int AS overdue,
    count(*) FILTER (WHERE status IN ('failed', 'partial'))::int AS failed
    FROM scheduled_campaigns WHERE user_email = $1`,
    [userEmail],
  );
  return result.rows[0];
}
