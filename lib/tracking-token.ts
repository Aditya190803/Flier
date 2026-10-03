import crypto from "crypto";

export type TrackingPurpose = "open" | "click" | "unsubscribe";

export interface TrackingTokenPayload {
  campaignId: string;
  recipientEmail: string;
  userEmail: string;
  recipientId?: string;
  linkId?: string;
  targetUrl?: string;
  purpose?: TrackingPurpose;
  exp?: number;
}

function getTrackingSecret(): string {
  const secret = process.env.TRACKING_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("Tracking token secret is not configured");
  }

  return secret;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function signTrackingToken(payload: TrackingTokenPayload): string {
  const body = base64UrlEncode(
    JSON.stringify({
      ...payload,
      exp: payload.exp ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90,
    }),
  );
  const signature = crypto
    .createHmac("sha256", getTrackingSecret())
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

export function verifyTrackingToken(
  token: string,
  expectedPurpose?: TrackingPurpose,
): TrackingTokenPayload | null {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) {
      return null;
    }

    const expectedSignature = crypto
      .createHmac("sha256", getTrackingSecret())
      .update(body)
      .digest("base64url");

    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(body)) as TrackingTokenPayload;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!payload.campaignId || !payload.recipientEmail || !payload.userEmail) {
      return null;
    }

    if (expectedPurpose && payload.purpose && payload.purpose !== expectedPurpose) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
