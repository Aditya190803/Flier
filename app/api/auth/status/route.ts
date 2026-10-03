import { type NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "No session found",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      hasAccessToken: !!session.accessToken,
      tokenError: session.error,
      gmail: {
        // No gmail.readonly — From uses session.user.email; token proves OAuth grant
        status: session.accessToken ? "working" : "no_token",
        error: null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to check auth status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
