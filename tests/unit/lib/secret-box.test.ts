import { beforeEach, afterEach, describe, expect, it } from "vite-plus/test";

import {
  decryptSecret,
  encryptSecret,
  canEncryptSecrets,
  __resetKeyCacheForTests,
} from "@/lib/crypto/secret-box";

const ORIGINAL_KEY = process.env.TOKEN_ENCRYPTION_KEY;
const ORIGINAL_SECRET = process.env.NEXTAUTH_SECRET;

describe("secret-box", () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    __resetKeyCacheForTests();
  });

  afterEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = ORIGINAL_KEY;
    process.env.NEXTAUTH_SECRET = ORIGINAL_SECRET;
    __resetKeyCacheForTests();
  });

  it("round-trips a secret", () => {
    const plaintext = "1//0abc-refresh-token_value";
    expect(decryptSecret(encryptSecret(plaintext))).toBe(plaintext);
  });

  it("never emits the plaintext in the ciphertext", () => {
    const plaintext = "super-secret-refresh-token";
    expect(encryptSecret(plaintext)).not.toContain(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same-input");
    const b = encryptSecret("same-input");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it("rejects a tampered payload rather than returning garbage", () => {
    const token = encryptSecret("tamper-me");
    const parts = token.split(".");
    // Flip a character in the ciphertext segment.
    parts[3] = parts[3].startsWith("A")
      ? `B${parts[3].slice(1)}`
      : `A${parts[3].slice(1)}`;
    expect(decryptSecret(parts.join("."))).toBeNull();
  });

  it("returns null for malformed or foreign values", () => {
    expect(decryptSecret("")).toBeNull();
    expect(decryptSecret("not-a-token")).toBeNull();
    expect(decryptSecret("v2.a.b.c")).toBeNull();
  });

  it("returns null when decrypting with a different key", () => {
    const token = encryptSecret("keyed-to-first");
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    __resetKeyCacheForTests();
    expect(decryptSecret(token)).toBeNull();
  });

  it("accepts hex key material", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
    __resetKeyCacheForTests();
    expect(decryptSecret(encryptSecret("hex-keyed"))).toBe("hex-keyed");
  });

  it("falls back to deriving a key from NEXTAUTH_SECRET", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    process.env.NEXTAUTH_SECRET = "a-long-random-nextauth-secret";
    __resetKeyCacheForTests();

    expect(canEncryptSecrets()).toBe(true);
    expect(decryptSecret(encryptSecret("derived"))).toBe("derived");
  });

  it("reports no key when neither env var is set", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.NEXTAUTH_SECRET;
    __resetKeyCacheForTests();

    expect(canEncryptSecrets()).toBe(false);
    expect(() => encryptSecret("nope")).toThrow();
  });
});
