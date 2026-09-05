import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const { dbQuery, decryptSecret, encryptSecret } = vi.hoisted(() => ({
  dbQuery: vi.fn(),
  decryptSecret: vi.fn(),
  encryptSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  dbQuery,
  isDatabaseConfigured: () => true,
}));

vi.mock("@/lib/crypto", () => ({
  canEncryptSecrets: () => true,
  decryptSecret,
  encryptSecret,
}));

vi.mock("@/lib/logger", () => ({
  authLogger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  deleteStoredRefreshToken,
  hasUsableRefreshToken,
  persistRefreshToken,
} from "@/lib/services/oauth-token-store";

describe("offline OAuth token storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    encryptSecret.mockReturnValue("encrypted-token");
    decryptSecret.mockReturnValue("refresh-token");
  });

  it("upserts only encrypted refresh tokens", async () => {
    await persistRefreshToken({
      userEmail: "owner@example.com",
      refreshToken: "refresh-token",
      scope: "gmail.send",
    });

    expect(encryptSecret).toHaveBeenCalledWith("refresh-token");
    expect(dbQuery.mock.calls[0]?.[0]).toContain("ON CONFLICT (user_email)");
    expect(dbQuery.mock.calls[0]?.[1]).toEqual([
      "owner@example.com",
      "encrypted-token",
      "gmail.send",
    ]);
  });

  it("deletes authorization by user email", async () => {
    await deleteStoredRefreshToken("owner@example.com");

    expect(dbQuery).toHaveBeenCalledWith(
      "DELETE FROM oauth_tokens WHERE user_email = $1",
      ["owner@example.com"],
    );
  });

  it("accepts only decryptable, non-revoked grants", async () => {
    dbQuery.mockResolvedValue({
      rows: [
        {
          user_email: "owner@example.com",
          refresh_token: "encrypted-token",
          scope: "gmail.send",
          revoked: false,
        },
      ],
      rowCount: 1,
    });

    await expect(hasUsableRefreshToken("owner@example.com")).resolves.toBe(
      true,
    );
    expect(decryptSecret).toHaveBeenCalledWith("encrypted-token");
  });
});
