/**
 * Login throttling stored in PostgreSQL (works across serverless instances).
 *
 * Two buckets per attempt: one for the client IP and one for the submitted
 * login ID. Both are keyed by hashes, and the same rules apply whether or not
 * the ID exists, so lockouts reveal nothing about which IDs are real.
 */
import "server-only";
import { createHash } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { loginAttempts } from "@/lib/db/schema";

export const WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_ID = 5;
export const MAX_FAILURES_PER_IP = 20;

const key = (kind: "ip" | "id", value: string) => `${kind}:${createHash("sha256").update(`${kind}:${value}`).digest("hex")}`;

function keysFor(ip: string | null, loginId: string) {
  return { idKey: key("id", loginId), ipKey: key("ip", ip ?? "unknown") };
}

/** Returns the number of milliseconds until the attempt may proceed (0 = allowed). */
export async function lockRemaining(ip: string | null, loginId: string): Promise<number> {
  const { idKey, ipKey } = keysFor(ip, loginId);
  const rows = await getDb().select().from(loginAttempts).where(inArray(loginAttempts.key, [idKey, ipKey]));
  const now = Date.now();
  let wait = 0;
  for (const r of rows) if (r.lockedUntil && r.lockedUntil.getTime() > now) wait = Math.max(wait, r.lockedUntil.getTime() - now);
  return wait;
}

async function bump(k: string, limit: number) {
  const now = new Date();
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const lockUntil = new Date(Date.now() + LOCK_MS);
  await getDb()
    .insert(loginAttempts)
    .values({ key: k, failures: 1, windowStart: now })
    .onConflictDoUpdate({
      target: loginAttempts.key,
      set: {
        // Restart the window when the previous one has expired.
        failures: sql`case when ${loginAttempts.windowStart} < ${windowStart} then 1 else ${loginAttempts.failures} + 1 end`,
        windowStart: sql`case when ${loginAttempts.windowStart} < ${windowStart} then ${now} else ${loginAttempts.windowStart} end`,
        lockedUntil: sql`case when (case when ${loginAttempts.windowStart} < ${windowStart} then 1 else ${loginAttempts.failures} + 1 end) >= ${limit} then ${lockUntil} else ${loginAttempts.lockedUntil} end`,
      },
    });
}

export async function recordFailure(ip: string | null, loginId: string) {
  const { idKey, ipKey } = keysFor(ip, loginId);
  await bump(idKey, MAX_FAILURES_PER_ID);
  await bump(ipKey, MAX_FAILURES_PER_IP);
}

export async function recordSuccess(loginId: string) {
  const { idKey } = keysFor(null, loginId);
  await getDb().delete(loginAttempts).where(eq(loginAttempts.key, idKey));
}
