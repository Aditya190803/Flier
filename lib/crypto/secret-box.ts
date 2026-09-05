/**
 * Secret Box — authenticated symmetric encryption for secrets at rest.
 *
 * Used to store Google OAuth refresh tokens in Appwrite so background jobs
 * (scheduled campaign sending) can mint access tokens without a live browser
 * session. Appwrite documents are readable by anything holding the API key,
 * so refresh tokens must never be written in plaintext.
 *
 * Format: `v1.<iv-b64url>.<tag-b64url>.<ciphertext-b64url>` (AES-256-GCM).
 * The version prefix leaves room to rotate the scheme later without having to
 * guess at how an existing value was produced.
 *
 * @module crypto/secret-box
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const VERSION = "v1";

/**
 * Fixed salt for deriving a key from `NEXTAUTH_SECRET`. A constant salt is
 * acceptable here because the input is already a high-entropy secret — the
 * derivation exists to stretch it to 32 bytes, not to resist dictionary
 * attacks on a low-entropy password.
 */
const KEY_DERIVATION_SALT = "echomail.token-encryption.v1";

let cachedKey: Buffer | null = null;

function decodeKeyMaterial(raw: string): Buffer | null {
  const trimmed = raw.trim();

  // Accept hex (64 chars) or base64 / base64url, whichever the operator used.
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === KEY_LENGTH) {
      return decoded;
    }
  } catch {
    // fall through to derivation
  }

  return null;
}

/**
 * Resolve the 32-byte encryption key.
 *
 * Prefers an explicit `TOKEN_ENCRYPTION_KEY` (generate with
 * `openssl rand -base64 32`). Falls back to deriving one from
 * `NEXTAUTH_SECRET` so scheduling works without extra configuration — at the
 * cost of rotating `NEXTAUTH_SECRET` invalidating every stored refresh token
 * (users simply re-authenticate).
 */
function getKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const explicit = process.env.TOKEN_ENCRYPTION_KEY;
  if (explicit) {
    const decoded = decodeKeyMaterial(explicit);
    if (decoded) {
      cachedKey = decoded;
      return cachedKey;
    }
    // Non-32-byte material: stretch it rather than rejecting outright.
    cachedKey = scryptSync(explicit, KEY_DERIVATION_SALT, KEY_LENGTH);
    return cachedKey;
  }

  const fallback = process.env.NEXTAUTH_SECRET;
  if (!fallback) {
    throw new Error(
      "Cannot encrypt secrets: set TOKEN_ENCRYPTION_KEY or NEXTAUTH_SECRET",
    );
  }

  cachedKey = scryptSync(fallback, KEY_DERIVATION_SALT, KEY_LENGTH);
  return cachedKey;
}

/** True when a key is available, i.e. secrets can be stored at all. */
export function canEncryptSecrets(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/** Encrypt a UTF-8 string into a self-describing, versioned token. */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Cannot encrypt an empty secret");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/**
 * Decrypt a token produced by {@link encryptSecret}.
 *
 * Returns `null` for anything that isn't a well-formed, authentic token
 * (tampered payload, key rotated, or a value written by an older scheme) so
 * callers can treat it as "no usable token" instead of crashing a cron run.
 */
export function decryptSecret(payload: string): string | null {
  if (!payload || typeof payload !== "string") {
    return null;
  }

  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    return null;
  }

  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const ciphertext = Buffer.from(parts[3], "base64url");

    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
      return null;
    }

    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Auth tag mismatch (tampering / wrong key) or malformed input.
    return null;
  }
}

/** Reset the memoised key. Test-only seam for swapping env vars. */
export function __resetKeyCacheForTests(): void {
  cachedKey = null;
}
