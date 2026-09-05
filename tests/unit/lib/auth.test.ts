import { describe, expect, it } from "vite-plus/test";

import { authOptions } from "@/lib/auth";

describe("authOptions", () => {
  it("uses static Google OAuth endpoints instead of runtime OIDC discovery", () => {
    const provider = authOptions.providers?.[0] as {
      id?: string;
      issuer?: string;
      wellKnown?: string;
      jwks_endpoint?: string;
      token?: string;
      userinfo?: string;
      httpOptions?: {
        timeout?: number;
      };
      authorization?: {
        url?: string;
        params?: Record<string, string>;
      };
    };

    expect(provider).toMatchObject({
      id: "google",
      issuer: "https://accounts.google.com",
      wellKnown: undefined,
      jwks_endpoint: "https://www.googleapis.com/oauth2/v3/certs",
      token: "https://oauth2.googleapis.com/token",
      userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
      httpOptions: {
        timeout: 10000,
      },
    });

    expect(provider?.authorization).toMatchObject({
      url: "https://accounts.google.com/o/oauth2/v2/auth",
      params: {
        access_type: "offline",
        prompt: "consent",
      },
    });
  });
});
