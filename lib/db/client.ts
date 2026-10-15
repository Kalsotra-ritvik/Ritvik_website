/**
 * PostgreSQL connection (postgres-js + Drizzle). Server-only.
 *
 * DATABASE_URL must point to a persistent PostgreSQL database (for example a
 * managed Neon, Supabase or Vercel Marketplace Postgres instance in production,
 * or a local server in development). When it is missing, the public site falls
 * back to the bundled default content and the admin explains what to configure.
 */
import "server-only";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

type Holder = { sql: ReturnType<typeof postgres>; db: Database; url: string };
const globalForDb = globalThis as unknown as { __portfolioDb?: Holder };

export function databaseUrl(): string | null {
  return process.env.DATABASE_URL?.trim() || null;
}

export function isDatabaseConfigured(): boolean {
  return databaseUrl() !== null;
}

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL is not set. Configure a PostgreSQL database to use the admin dashboard.");
    this.name = "DatabaseNotConfiguredError";
  }
}

export function getDb(): Database {
  const url = databaseUrl();
  if (!url) throw new DatabaseNotConfiguredError();
  const cached = globalForDb.__portfolioDb;
  if (cached && cached.url === url) return cached.db;
  const sql = postgres(url, {
    // Small pool: serverless functions run many short-lived instances.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 10,
    // Required for transaction-mode poolers (PgBouncer, Neon pooled URLs).
    prepare: false,
    onnotice: () => undefined,
  });
  const db = drizzle(sql, { schema });
  globalForDb.__portfolioDb = { sql, db, url };
  return db;
}

/** Close the shared pool (scripts and tests). */
export async function closeDb() {
  const cached = globalForDb.__portfolioDb;
  if (cached) {
    await cached.sql.end({ timeout: 5 });
    globalForDb.__portfolioDb = undefined;
  }
}
