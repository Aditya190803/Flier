import { describe, expect, it } from "vite-plus/test";

import {
  WEBHOOK_HEADER_SIGNATURE,
  WEBHOOK_HEADER_SIGNATURE_LEGACY,
} from "@/lib/brand";
import {
  buildWebhookHeaders,
  signWebhookPayload,
} from "@/lib/webhook-delivery";

describe("webhook-delivery", () => {
  it("signWebhookPayload is stable for same input", () => {
    const a = signWebhookPayload('{"a":1}', "secret");
    const b = signWebhookPayload('{"a":1}', "secret");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("buildWebhookHeaders includes Flier and legacy signature when secret set", () => {
    const body = '{"event":"email.sent"}';
    const headers = buildWebhookHeaders("email.sent", body, "s3cr3t");
    expect(headers[WEBHOOK_HEADER_SIGNATURE]).toBe(
      signWebhookPayload(body, "s3cr3t"),
    );
    expect(headers[WEBHOOK_HEADER_SIGNATURE_LEGACY]).toBe(
      headers[WEBHOOK_HEADER_SIGNATURE],
    );
  });
});
