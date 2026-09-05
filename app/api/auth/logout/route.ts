import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { apiLogger } from "@/lib/logger";
import { deleteStoredRefreshToken } from "@/lib/services/oauth-token-store";
import { revokeAllUserTokens } from "@/lib/token-security";

/**
 * POST /api/auth/logout
 * Handles secure logout by revoking user tokens before NextAuth signOut
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: true, message: "No active session" },
        { status: 200 },
      );
    }

    const userEmail = session.user.email;

    // Revoke the local session tokens and remove background-send access.
    revokeAllUserTokens(userEmail);
    await deleteStoredRefreshToken(userEmail);

    // Optionally revoke Google OAuth token
    if (session.accessToken) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${session.accessToken}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
        );
        apiLogger.info("Google OAuth token revoked", { userEmail });
      } catch (error) {
        // Non-critical - continue with logout even if Google revocation fails
        apiLogger.warn("Failed to revoke Google OAuth token", {
          userEmail,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    apiLogger.info("User logged out successfully", { userEmail });

    return NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 },
    );
  } catch (error) {
    apiLogger.error("Logout error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 },
    );
  }
}
