import { Pool, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | undefined;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    const hostname = new URL(connectionString).hostname;
    const local = hostname === "localhost" || hostname === "127.0.0.1";
    const configuredPoolSize = Number(process.env.DATABASE_POOL_SIZE || 5);
    const max = Number.isFinite(configuredPoolSize)
      ? Math.min(20, Math.max(1, Math.trunc(configuredPoolSize)))
      : 5;

    pool = new Pool({
      connectionString,
      max,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      ssl: local ? false : { rejectUnauthorized: true },
    });
  }

  return pool;
}

export function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, [...values]);
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
