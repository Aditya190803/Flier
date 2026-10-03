import { type NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export type AuthedSession = {
  email: string;
  accessToken: string;
  name?: string | null;
};

type RequireOptions = {
  /** Require Google access token (email send routes). Default false. */
  accessToken?: boolean;
};

/**
 * Shared session gate for API routes.
 * Returns session fields or a 401 NextResponse.
 */
export async function requireSession(
  _request?: NextRequest,
  options: RequireOptions = {},
): Promise<AuthedSession | NextResponse> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (options.accessToken && !session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return {
    email,
    accessToken: (session?.accessToken as string | undefined) || "",
    name: session?.user?.name,
  };
}

export function isAuthed(result: AuthedSession | NextResponse): result is AuthedSession {
  return !(result instanceof NextResponse);
}
