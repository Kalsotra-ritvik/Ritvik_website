/**
 * Apply SQL migrations in ./drizzle to DATABASE_URL.
 * Usage: npm run db:migrate
 * Exits successfully without doing anything when DATABASE_URL is unset (e.g. a
 * preview build without a database), so it is safe to run before every build.
 */
import "./_env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.log("db:migrate — DATABASE_URL is not set; skipping migrations.");
    return;
  }
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => undefined });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
    console.log("db:migrate — database schema is up to date.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("db:migrate failed:", err.message ?? err);
  process.exit(1);
});
