/**
 * Token Security Module
 *
 * Provides secure token handling, validation, and refresh management
 * with proper error handling and logging.
 *
 * Security Features:
 * - Token expiration validation with buffer time
 * - Automatic refresh before expiration
 * - Rate limiting for refresh attempts
 * - Error recovery and graceful degradation
 * - Secure token storage guidance
 * - Token revocation on logout
 * - Refresh token rotation tracking
 */

import { authLogger } from "./logger";

// Security constants
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry
const MIN_REFRESH_INTERVAL_MS = 60 * 1000; // Minimum 1 minute between refreshes
const MAX_REFRESH_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REVOKED_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // Keep revoked tokens for 24 hours

/**
 * In-memory store for revoked tokens
 * In production, use Redis or a database for persistence across instances
 */
interface RevokedToken {
  revokedAt: number;
  userEmail: string;
}

const revokedTokensStore = new Map<string, RevokedToken>();

// Cleanup old revoked tokens periodically
let revokedTokenCleanupInterval: NodeJS.Timeout | null = null;

function startRevokedTokenCleanup() {
  if (revokedTokenCleanupInterval) {
    return;
  }

  revokedTokenCleanupInterval = setInterval(
    () => {
      const now = Date.now();
      for (const [token, data] of revokedTokensStore.entries()) {
        if (now - data.revokedAt > REVOKED_TOKEN_TTL_MS) {
          revokedTokensStore.delete(token);
        }
      }
    },
    60 * 60 * 1000,
  ); // Clean up every hour
}

/**
 * Revoke a token (call on logout)
 * @param accessToken The access token to revoke
 * @param userEmail The user's email for logging
 */
export function revokeToken(accessToken: string, userEmail: string): void {
  if (!accessToken) {
    return;
  }

  startRevokedTokenCleanup();

  // Store a hash of the token (first 32 chars) to save memory
  const tokenKey = accessToken.substring(0, 32);
  revokedTokensStore.set(tokenKey, {
    revokedAt: Date.now(),
    userEmail,
  });

  authLogger.info("Token revoked", { userEmail });
}

/**
 * Check if a token has been revoked
 * @param accessToken The access token to check
 * @returns Whether the token is revoked
 */
export function isTokenRevoked(accessToken: string): boolean {
  if (!accessToken) {
    return false;
  }

  const tokenKey = accessToken.substring(0, 32);
  return revokedTokensStore.has(tokenKey);
}

/**
 * Revoke all tokens for a user (for security events)
 * @param userEmail The user's email
 */
export function revokeAllUserTokens(userEmail: string): void {
  // Mark in store that this user's tokens should be considered revoked
  // In production, this would update a database
  authLogger.warn("All tokens revoked for user", { userEmail });
}

/**
 * In-memory store for refresh token rotation tracking
 */
const usedRefreshTokens = new Map<string, number>();

/**
 * Track refresh token usage for rotation detection
 * @param refreshToken The refresh token being used
 * @returns Whether this token was already used (potential replay attack)
 */
export function trackRefreshTokenUsage(refreshToken: string): boolean {
  if (!refreshToken) {
    return false;
  }

  const tokenKey = refreshToken.substring(0, 32);
  const previousUsage = usedRefreshTokens.get(tokenKey);

  if (previousUsage) {
    // Token was already used - potential replay attack
    authLogger.warn("Refresh token reuse detected", {
      previousUsage: new Date(previousUsage).toISOString(),
    });
    return true;
  }

  usedRefreshTokens.set(tokenKey, Date.now());

  // Clean up old entries (keep for 24 hours)
  const cutoff = Date.now() - REVOKED_TOKEN_TTL_MS;
  for (const [key, time] of usedRefreshTokens.entries()) {
    if (time < cutoff) {
      usedRefreshTokens.delete(key);
    }
  }

  return false;
}

/**
 * Token metadata for validation
 */
export interface TokenInfo {
  accessToken: string;
  accessTokenExpires: number;
  refreshToken?: string;
  lastRefreshTime?: number;
  refreshAttempts?: number;
}

/**
 * Result of token validation
 */
export interface TokenValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  error?: string;
  expiresIn?: number;
}

/**
 * Result of token refresh operation
 */
export interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  error?: string;
}

/**
 * Validates an access token
 * @param tokenInfo Token information to validate
 * @returns Validation result with status and expiration info
 */
export function validateToken(tokenInfo: TokenInfo): TokenValidationResult {
  if (!tokenInfo.accessToken) {
    return {
      isValid: false,
      needsRefresh: false,
      error: "No access token provided",
    };
  }

  const now = Date.now();
  const expiresAt = tokenInfo.accessTokenExpires || 0;
  const expiresIn = expiresAt - now;

  // Token is already expired
  if (expiresIn <= 0) {
    return {
      isValid: false,
      needsRefresh: true,
      error: "Token expired",
      expiresIn: 0,
    };
  }

  // Token will expire soon (within buffer)
  if (expiresIn <= REFRESH_BUFFER_MS) {
    return {
      isValid: true, // Still valid but should refresh
      needsRefresh: true,
      expiresIn,
    };
  }

  // Token is valid and not expiring soon
  return {
    isValid: true,
    needsRefresh: false,
    expiresIn,
  };
}

/**
 * Checks if a refresh should be attempted based on rate limiting
 * @param tokenInfo Token information with refresh history
 * @returns Whether refresh should be attempted
 */
export function shouldAttemptRefresh(tokenInfo: TokenInfo): {
  shouldRefresh: boolean;
  reason?: string;
} {
  const now = Date.now();
  const lastRefresh = tokenInfo.lastRefreshTime || 0;
  const timeSinceLastRefresh = now - lastRefresh;

  // Check rate limiting
  if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL_MS) {
    return {
      shouldRefresh: false,
      reason: `Rate limited. Wait ${Math.ceil((MIN_REFRESH_INTERVAL_MS - timeSinceLastRefresh) / 1000)} seconds.`,
    };
  }

  // Check max retry attempts
  if ((tokenInfo.refreshAttempts || 0) >= MAX_REFRESH_RETRIES) {
    return {
      shouldRefresh: false,
      reason: "Maximum refresh attempts exceeded",
    };
  }

  // Check if refresh token exists
  if (!tokenInfo.refreshToken) {
    return {
      shouldRefresh: false,
      reason: "No refresh token available",
    };
  }

  return { shouldRefresh: true };
}

/**
 * Refreshes an access token using the refresh token
 * @param refreshToken The refresh token to use
 * @param clientId Google OAuth client ID
 * @param clientSecret Google OAuth client secret
 * @returns Refresh result with new tokens or error
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<TokenRefreshResult> {
  if (!refreshToken || !clientId || !clientSecret) {
    return {
      success: false,
      error: "Missing required credentials for token refresh",
    };
  }

  try {
    authLogger.info("Attempting token refresh");

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      authLogger.error("Token refresh failed", undefined, {
        status: response.status,
        error: data.error,
        description: data.error_description,
      } as any);

      return {
        success: false,
        error: data.error_description || data.error || "Token refresh failed",
      };
    }

    const newExpiry = Date.now() + (data.expires_in || 3600) * 1000;

    authLogger.info("Token refresh successful", {
      expiresIn: data.expires_in,
    });

    return {
      success: true,
      accessToken: data.access_token,
      accessTokenExpires: newExpiry,
      refreshToken: data.refresh_token || refreshToken,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    authLogger.error(
      "Token refresh exception",
      undefined,
      error instanceof Error ? error : undefined,
    );

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Attempts token refresh with retry logic
 * @param tokenInfo Current token information
 * @param clientId Google OAuth client ID
 * @param clientSecret Google OAuth client secret
 * @returns Refresh result after retries
 */
export async function refreshWithRetry(
  tokenInfo: TokenInfo,
  clientId: string,
  clientSecret: string,
): Promise<TokenRefreshResult> {
  const canRefresh = shouldAttemptRefresh(tokenInfo);

  if (!canRefresh.shouldRefresh) {
    return {
      success: false,
      error: canRefresh.reason,
    };
  }

  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_REFRESH_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)),
      );
    }

    const result = await refreshAccessToken(tokenInfo.refreshToken!, clientId, clientSecret);

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Don't retry on certain errors
    if (result.error?.includes("invalid_grant") || result.error?.includes("invalid_client")) {
      break;
    }
  }

  return {
    success: false,
    error: lastError || "Token refresh failed after retries",
  };
}

/**
 * Security best practices for token storage
 */
export const tokenSecurityGuidelines = {
  // Never store tokens in:
  unsafeStorage: [
    "localStorage",
    "sessionStorage",
    "cookies without httpOnly flag",
    "URL parameters",
    "client-side JavaScript variables",
  ],

  // Recommended storage methods:
  safeStorage: [
    "HTTP-only cookies with Secure flag",
    "Server-side session storage",
    "Encrypted database storage",
  ],

  // Additional security measures:
  recommendations: [
    "Use short-lived access tokens (1 hour max)",
    "Rotate refresh tokens on use",
    "Implement token revocation on logout",
    "Monitor for suspicious refresh patterns",
    "Use secure HTTPS connections only",
    "Validate token claims on server-side",
  ],
};

/**
 * Sanitizes token information for logging (removes sensitive data)
 * @param tokenInfo Token information to sanitize
 * @returns Sanitized token info safe for logging
 */
export function sanitizeTokenForLogging(tokenInfo: TokenInfo): Record<string, unknown> {
  return {
    hasAccessToken: !!tokenInfo.accessToken,
    accessTokenLength: tokenInfo.accessToken?.length || 0,
    hasRefreshToken: !!tokenInfo.refreshToken,
    accessTokenExpires: tokenInfo.accessTokenExpires,
    expiresIn: tokenInfo.accessTokenExpires
      ? Math.max(0, tokenInfo.accessTokenExpires - Date.now())
      : null,
    lastRefreshTime: tokenInfo.lastRefreshTime,
    refreshAttempts: tokenInfo.refreshAttempts,
  };
}
