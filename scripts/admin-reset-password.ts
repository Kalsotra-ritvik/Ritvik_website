/**
 * Account recovery: set a new password for an administrator and sign out all
 * of its sessions. Requires server-side access to DATABASE_URL, which is what
 * makes it a genuine recovery path (there is deliberately no email reset).
 *
 * Interactive:      npm run admin:reset-password
 * Non-interactive:  ADMIN_LOGIN_ID=... ADMIN_PASSWORD=... npm run admin:reset-password
 */
import "./_env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { admins, sessions } from "../lib/db/schema";
import { hashPassword, normaliseLoginId, passwordProblems } from "../lib/auth/password";
import { ask, askHidden } from "./_prompt";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set.");
  const conn = postgres(url, { max: 1, prepare: false, onnotice: () => undefined });
  const db = drizzle(conn);
  try {
    const loginId = normaliseLoginId(process.env.ADMIN_LOGIN_ID ?? (await ask("Administrator ID: ")));
    const admin = (await db.select().from(admins).where(eq(admins.loginId, loginId)))[0];
    if (!admin) throw new Error(`No administrator with ID "${loginId}".`);
    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      password = await askHidden("New password (at least 12 characters): ");
      const confirm = await askHidden("Repeat the new password: ");
      if (password !== confirm) throw new Error("The passwords do not match.");
    }
    const problems = passwordProblems(password, loginId);
    if (problems.length) throw new Error(problems.join(" "));
    const now = new Date();
    await db.update(admins).set({ passwordHash: await hashPassword(password), passwordChangedAt: now, updatedAt: now }).where(eq(admins.id, admin.id));
    await db.delete(sessions).where(eq(sessions.adminId, admin.id));
    console.log(`admin:reset-password — password updated for "${loginId}"; all sessions signed out.`);
  } finally {
    await conn.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("admin:reset-password failed:", err.message ?? err);
  process.exit(1);
});
