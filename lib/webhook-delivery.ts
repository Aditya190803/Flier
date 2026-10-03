import { createHmac } from "crypto";

import {
  WEBHOOK_HEADER_EVENT,
  WEBHOOK_HEADER_SIGNATURE,
  WEBHOOK_HEADER_SIGNATURE_LEGACY,
  WEBHOOK_HEADER_TIMESTAMP,
} from "@/lib/brand";

export type OutboundWebhookPayload = {
  event: string;
  timestamp: string;
  webhook_id: string;
  data: Record<string, unknown>;
};

/** HMAC-SHA256 hex digest for webhook body (matches settings docs). */
export function signWebhookPayload(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function buildWebhookHeaders(
  event: string,
  body: string,
  secret?: string,
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    [WEBHOOK_HEADER_EVENT]: event,
    [WEBHOOK_HEADER_TIMESTAMP]: timestamp,
  };

  if (secret) {
    const signature = signWebhookPayload(body, secret);
    headers[WEBHOOK_HEADER_SIGNATURE] = signature;
    // ponytail: legacy integrators on EchoMail header name
    headers[WEBHOOK_HEADER_SIGNATURE_LEGACY] = signature;
  }

  return headers;
}

export async function deliverWebhook(
  url: string,
  payload: OutboundWebhookPayload,
  secret?: string,
): Promise<Response> {
  const body = JSON.stringify(payload);
  const headers = buildWebhookHeaders(payload.event, body, secret);

  return fetch(url, {
    method: "POST",
    headers,
    body,
  });
}
