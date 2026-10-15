/**
 * Create the first administrator (one-time setup).
 *
 * Interactive:      npm run admin:create
 * Non-interactive:  ADMIN_LOGIN_ID=... ADMIN_PASSWORD=... npm run admin:create
 *   (pass the values only for this one command, e.g. from a secrets manager;
 *    never store them in the repository or in deployment env files)
 *
 * Refuses to run when an administrator already exists. To regain access, use
 * npm run admin:reset-password instead.
 */
import "./_env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql as dsql } from "drizzle-orm";
import { admins } from "../lib/db/schema";
import { LOGIN_ID_PATTERN, hashPassword, normaliseLoginId, passwordProblems } from "../lib/auth/password";
import { ask, askHidden } from "./_prompt";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set.");
  const conn = postgres(url, { max: 1, prepare: false, onnotice: () => undefined });
  const db = drizzle(conn);
  try {
    const count = Number((await db.select({ n: dsql<number>`count(*)` }).from(admins))[0]?.n ?? 0);
    if (count > 0) {
      throw new Error("An administrator already exists. Use `npm run admin:reset-password` to change a password.");
    }
    const loginId = normaliseLoginId(process.env.ADMIN_LOGIN_ID ?? (await ask("Administrator ID (3–64 characters: a–z, 0–9, . _ @ -): ")));
    if (!LOGIN_ID_PATTERN.test(loginId)) throw new Error("The ID must be 3–64 characters using a–z, 0–9, '.', '_', '@' or '-'.");
    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      password = await askHidden("Password (at least 12 characters): ");
      const confirm = await askHidden("Repeat the password: ");
      if (password !== confirm) throw new Error("The passwords do not match.");
    }
    const problems = passwordProblems(password, loginId);
    if (problems.length) throw new Error(problems.join(" "));
    await db.insert(admins).values({ loginId, passwordHash: await hashPassword(password) });
    console.log(`admin:create — administrator "${loginId}" created. Sign in at /admin/login.`);
  } finally {
    await conn.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("admin:create failed:", err.message ?? err);
  process.exit(1);
});
