import { readFile } from "node:fs/promises";

import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const hostname = new URL(connectionString).hostname;
const local = hostname === "localhost" || hostname === "127.0.0.1";
const client = new pg.Client({
  connectionString,
  ssl: local
    ? false
    : {
        ca: process.env.DYNO
          ? await readFile("/usr/lib/ssl/certs/ca-certificates.crt", "utf8")
          : undefined,
        rejectUnauthorized: true,
      },
});

try {
  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await client.connect();
  await client.query("BEGIN");
  await client.query(schema);
  await client.query("COMMIT");
  console.log("Database schema is up to date");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
