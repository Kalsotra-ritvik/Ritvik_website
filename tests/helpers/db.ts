import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getDb } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";

export const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

let migrated = false;
export async function resetDb() {
  const db = getDb();
  if (!migrated) {
    await migrate(db, { migrationsFolder: "drizzle" });
    migrated = true;
  }
  await db.execute(sql`truncate table content_revisions, content_entries, media, sessions, login_attempts, admins restart identity cascade`);
}

/** A throwaway administrator in the test database, with a random password generated per run. */
export async function createTestAdmin(loginId = "tester", password = randomBytes(18).toString("base64url")) {
  const [row] = await getDb()
    .insert(admins)
    .values({ loginId, passwordHash: await hashPassword(password) })
    .returning();
  return { admin: row, password, actor: { id: row.id, loginId: row.loginId } };
}
