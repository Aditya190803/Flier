import crypto from "crypto";

import { getRazorpayPlanId, type BillingInterval, type PlanId } from "@/lib/plans";

function keyId(): string {
  return process.env.RAZORPAY_KEY_ID || "";
}

function keySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET || "";
}

export function isRazorpayConfigured(): boolean {
  return Boolean(keyId() && keySecret());
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString("base64")}`;
}

async function razorpayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not configured");
  }

  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (body as { error?: { description?: string } })?.error?.description ||
      `Razorpay error ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string;
  current_end?: number;
  current_start?: number;
  customer_id?: string;
  notes?: Record<string, string>;
}

export async function createRazorpaySubscription(opts: {
  planId: PlanId;
  interval: BillingInterval;
  userEmail: string;
  userName?: string | null;
}): Promise<RazorpaySubscription> {
  const razorpayPlanId = getRazorpayPlanId(opts.planId, opts.interval);
  if (!razorpayPlanId) {
    throw new Error(`No Razorpay plan configured for ${opts.planId} ${opts.interval}`);
  }

  return razorpayFetch<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: razorpayPlanId,
      total_count: opts.interval === "annual" ? 10 : 120, // ~10yr monthly / 10yr annual
      quantity: 1,
      customer_notify: 1,
      notes: {
        user_email: opts.userEmail,
        plan: opts.planId,
        interval: opts.interval,
      },
    }),
  });
}

export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd = true,
): Promise<RazorpaySubscription> {
  return razorpayFetch<RazorpaySubscription>(`/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd }),
  });
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function periodEndFromUnix(seconds?: number): string | null {
  if (!seconds) {
    return null;
  }
  return new Date(seconds * 1000).toISOString();
}
