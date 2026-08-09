/**
 * Shared authorization for cron-triggered routes.
 *
 * Vercel Cron invokes these endpoints with `Authorization: Bearer $CRON_SECRET`.
 * Fails closed in production so an unconfigured deployment can't expose a
 * background worker to the open internet; stays open in development so
 * `curl localhost:3000/api/cron/...` works without ceremony.
 *
 * @module cron-auth
 */

import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

/**
 * @returns A response to return immediately when the caller isn't authorized,
 *   or `null` when the request may proceed.
 */
export function authorizeCron(request: NextRequest): NextResponse | null {
  const secret = env.CRON_SECRET || process.env.CRON_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 503 },
      );
    }
    return null;
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
