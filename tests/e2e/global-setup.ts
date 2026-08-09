import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { encode } from "next-auth/jwt";

const storageStatePath = resolve("test-results/e2e-auth.json");

export default async function globalSetup() {
  loadEnv({ path: resolve(".env.local") });

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for authenticated E2E tests");
  }

  const user = {
    id: "e2e-user",
    name: "E2E User",
    email: "e2e@example.com",
    image: null,
  };
  const sessionToken = await encode({
    secret,
    token: {
      sub: user.id,
      name: user.name,
      email: user.email,
      user,
      accessToken: "e2e-access-token",
      accessTokenExpires: Date.now() + 60 * 60 * 1000,
      refreshToken: "e2e-refresh-token",
    },
  });

  await mkdir(dirname(storageStatePath), { recursive: true });
  await writeFile(
    storageStatePath,
    JSON.stringify({
      cookies: [
        {
          name: "next-auth.session-token",
          value: sessionToken,
          domain: "localhost",
          path: "/",
          expires: Math.floor(Date.now() / 1000) + 60 * 60,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
}
