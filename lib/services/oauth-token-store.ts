/**
 * Offline OAuth Token Store
 *
 * Scheduled campaigns are dispatched by a cron worker long after the user has
 * closed their browser, so the Gmail access token in the NextAuth JWT cookie
 * isn't available. This module persists the user's Google *refresh* token
 * (encrypted — see {@link module:crypto/secret-box}) in Appwrite and exchanges
 * it for a short-lived access token at send time.
 *
 * Nothing here is used by the interactive send path; that keeps using the
 * session token from `requireSession`.
 *
 * @module services/oauth-token-store
 */

import { databases, config, Query, ID } from "@/lib/appwrite-server";
import { canEncryptSecrets, decryptSecret, encryptSecret } from "@/lib/crypto";
import { authLogger } from "@/lib/logger";

/** Access tokens are cached until this long before their real expiry. */
const ACCESS_TOKEN_SKEW_MS = 60_000;

/** Reuse fresh access tokens within a warm worker process. */
const accessTokenCache = new Map<
  string,
  { accessToken: string; expiresAt: number }
>();

interface StoredTokenDoc {
  $id: string;
  user_email: string;
  refresh_token: string;
  scope?: string;
  revoked?: boolean;
  updated_at?: string;
}

function isConfigured(): boolean {
  return Boolean(config.databaseId && config.oauthTokensCollectionId);
}

async function findTokenDoc(userEmail: string): Promise<StoredTokenDoc | null> {
  const response = await databases.listDocuments(
    config.databaseId,
    config.oauthTokensCollectionId,
    [Query.equal("user_email", userEmail), Query.limit(1)],
  );
  return (response.documents[0] as unknown as StoredTokenDoc) ?? null;
}

/**
 * Persist (or refresh) the stored refresh token for a user.
 *
 * Called from the NextAuth `jwt` callback on sign-in and whenever Google
 * rotates the refresh token. Failures are logged and swallowed: a broken
 * token store must never block a user from signing in — it only means
 * scheduled sends won't work until the next successful write.
 */
export async function persistRefreshToken(input: {
  userEmail: string;
  refreshToken: string;
  scope?: string;
}): Promise<void> {
  const { userEmail, refreshToken, scope } = input;

  if (!userEmail || !refreshToken || !isConfigured()) {
    return;
  }

  if (!canEncryptSecrets()) {
    authLogger.warn(
      "Refresh token not stored: no TOKEN_ENCRYPTION_KEY or NEXTAUTH_SECRET",
    );
    return;
  }

  try {
    const encrypted = encryptSecret(refreshToken);
    const existing = await findTokenDoc(userEmail);

    const payload = {
      user_email: userEmail,
      refresh_token: encrypted,
      scope: scope ?? "",
      revoked: false,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await databases.updateDocument(
        config.databaseId,
        config.oauthTokensCollectionId,
        existing.$id,
        payload,
      );
    } else {
      await databases.createDocument(
        config.databaseId,
        config.oauthTokensCollectionId,
        ID.unique(),
        { ...payload, created_at: new Date().toISOString() },
      );
    }
  } catch (error) {
    authLogger.error("Failed to persist refresh token", {
      userEmail,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Mark a user's stored token as unusable.
 *
 * Called when Google rejects the refresh token (revoked access, password
 * change, consent withdrawn) so the worker stops retrying and the UI can tell
 * the user to sign in again.
 */
export async function markRefreshTokenRevoked(
  userEmail: string,
): Promise<void> {
  accessTokenCache.delete(userEmail);

  if (!isConfigured()) {
    return;
  }

  try {
    const existing = await findTokenDoc(userEmail);
    if (!existing) {
      return;
    }
    await databases.updateDocument(
      config.databaseId,
      config.oauthTokensCollectionId,
      existing.$id,
      { revoked: true, updated_at: new Date().toISOString() },
    );
  } catch (error) {
    authLogger.error("Failed to mark refresh token revoked", {
      userEmail,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Delete a user's stored token (sign-out / GDPR erasure). */
export async function deleteStoredRefreshToken(
  userEmail: string,
): Promise<void> {
  accessTokenCache.delete(userEmail);

  if (!isConfigured()) {
    return;
  }

  try {
    const existing = await findTokenDoc(userEmail);
    if (!existing) {
      return;
    }
    await databases.deleteDocument(
      config.databaseId,
      config.oauthTokensCollectionId,
      existing.$id,
    );
  } catch (error) {
    authLogger.error("Failed to delete stored refresh token", {
      userEmail,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Whether a usable (non-revoked, decryptable) token exists for a user. */
export async function hasUsableRefreshToken(
  userEmail: string,
): Promise<boolean> {
  if (!isConfigured()) {
    return false;
  }

  try {
    const doc = await findTokenDoc(userEmail);
    if (!doc || doc.revoked) {
      return false;
    }
    return decryptSecret(doc.refresh_token) !== null;
  } catch {
    return false;
  }
}

/**
 * Result of an offline access-token request.
 *
 * `reason` distinguishes "the user must re-consent" (terminal — stop retrying
 * the campaign) from "something transient went wrong" (retry next tick).
 */
export type OfflineTokenResult =
  | { ok: true; accessToken: string; expiresAt: number }
  | { ok: false; reason: "no_token" | "revoked" | "transient"; error: string };

/**
 * Exchange a user's stored refresh token for a fresh Gmail access token.
 *
 * @param userEmail - The account the campaign sends as.
 */
export async function getOfflineAccessToken(
  userEmail: string,
): Promise<OfflineTokenResult> {
  const cached = accessTokenCache.get(userEmail);
  if (cached && cached.expiresAt - ACCESS_TOKEN_SKEW_MS > Date.now()) {
    return {
      ok: true,
      accessToken: cached.accessToken,
      expiresAt: cached.expiresAt,
    };
  }

  if (!isConfigured()) {
    return {
      ok: false,
      reason: "no_token",
      error: "Offline token storage is not configured",
    };
  }

  let doc: StoredTokenDoc | null;
  try {
    doc = await findTokenDoc(userEmail);
  } catch (error) {
    return {
      ok: false,
      reason: "transient",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (!doc) {
    return {
      ok: false,
      reason: "no_token",
      error: "No stored Google authorization for this account",
    };
  }

  if (doc.revoked) {
    return {
      ok: false,
      reason: "revoked",
      error: "Google access was revoked — sign in again to re-authorize",
    };
  }

  const refreshToken = decryptSecret(doc.refresh_token);
  if (!refreshToken) {
    return {
      ok: false,
      reason: "revoked",
      error: "Stored authorization could not be read — sign in again",
    };
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // `invalid_grant` means the grant is gone for good (revoked consent,
      // expired unused token, password reset). Anything else may be transient.
      const terminal = data?.error === "invalid_grant";
      if (terminal) {
        await markRefreshTokenRevoked(userEmail);
      }
      return {
        ok: false,
        reason: terminal ? "revoked" : "transient",
        error: data?.error_description || data?.error || "Token refresh failed",
      };
    }

    const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;

    // Google may hand back a rotated refresh token; keep the store current.
    if (data.refresh_token && data.refresh_token !== refreshToken) {
      await persistRefreshToken({
        userEmail,
        refreshToken: data.refresh_token,
        scope: data.scope,
      });
    }

    accessTokenCache.set(userEmail, {
      accessToken: data.access_token,
      expiresAt,
    });

    return { ok: true, accessToken: data.access_token, expiresAt };
  } catch (error) {
    return {
      ok: false,
      reason: "transient",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Clear the in-process access-token cache (tests / long-lived processes). */
export function clearOfflineTokenCache(): void {
  accessTokenCache.clear();
}
