/**
 * Prepares the end-to-end test database: migrate, wipe, seed the default
 * content and create a throwaway administrator. Runs against
 * TEST_DATABASE_URL only (passed in as DATABASE_URL by playwright.config.ts).
 */
import { execSync } from "node:child_process";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url || url !== process.env.TEST_DATABASE_URL) throw new Error("E2E must run against TEST_DATABASE_URL.");
  const run = (cmd: string, env: Record<string, string> = {}) => execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
  run("npx tsx scripts/db-migrate.ts");
  const sql = postgres(url, { max: 1, onnotice: () => undefined });
  await sql`truncate table content_revisions, content_entries, media, sessions, login_attempts, admins restart identity cascade`;
  await sql.end();
  run("npx tsx scripts/db-seed.ts");
  run("npx tsx scripts/admin-create.ts", { ADMIN_LOGIN_ID: process.env.E2E_ADMIN_ID!, ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD! });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
