/**
 * Server-managed sessions stored in PostgreSQL.
 *
 * The browser holds a random 256-bit token in an HttpOnly cookie; the database
 * stores only its SHA-256, so a leaked database row cannot be replayed.
 * Sessions expire after 7 days without activity and after 30 days in any case.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { admins, sessions } from "@/lib/db/schema";

export const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const secureCookies = () => process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1";

/** `__Host-` prefix pins the cookie to this host, HTTPS and path "/" in production. */
export function sessionCookieName() {
  return secureCookies() ? "__Host-rk_admin" : "rk_admin";
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashIp(ip: string | null | undefined) {
  return ip ? createHash("sha256").update(`ip:${ip}`).digest("hex").slice(0, 32) : null;
}

export interface SessionAdmin {
  id: string;
  loginId: string;
  displayName: string | null;
  role: string;
}

export interface ValidSession {
  sessionId: string;
  admin: SessionAdmin;
  expiresAt: Date;
}

export async function createSession(adminId: string, meta: { ip?: string | null; userAgent?: string | null }) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_IDLE_MS);
  // Use the application clock (same as passwordChangedAt) rather than the DB default.
  await getDb()
    .insert(sessions)
    .values({
      id: hashToken(token),
      adminId,
      createdAt: new Date(now),
      lastSeenAt: new Date(now),
      expiresAt,
      ipHash: hashIp(meta.ip),
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
    });
  return { token, cookieExpires: new Date(now + SESSION_ABSOLUTE_MS) };
}

export async function validateSessionToken(token: string | undefined | null): Promise<ValidSession | null> {
  if (!token || token.length > 100) return null;
  const db = getDb();
  const id = hashToken(token);
  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      adminId: admins.id,
      loginId: admins.loginId,
      displayName: admins.displayName,
      role: admins.role,
      passwordChangedAt: admins.passwordChangedAt,
    })
    .from(sessions)
    .innerJoin(admins, eq(admins.id, sessions.adminId))
    .where(eq(sessions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const now = Date.now();
  const absoluteEnd = row.createdAt.getTime() + SESSION_ABSOLUTE_MS;
  // Sessions created before the latest password change are no longer valid.
  if (row.expiresAt.getTime() <= now || absoluteEnd <= now || row.createdAt < row.passwordChangedAt) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  let expiresAt = row.expiresAt;
  if (now - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    expiresAt = new Date(Math.min(now + SESSION_IDLE_MS, absoluteEnd));
    await db.update(sessions).set({ lastSeenAt: new Date(now), expiresAt }).where(eq(sessions.id, id));
  }
  return {
    sessionId: row.sessionId,
    expiresAt,
    admin: { id: row.adminId, loginId: row.loginId, displayName: row.displayName, role: row.role },
  };
}

export async function invalidateSession(sessionId: string) {
  await getDb().delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateAllSessions(adminId: string) {
  await getDb().delete(sessions).where(eq(sessions.adminId, adminId));
}

export async function listSessions(adminId: string) {
  return getDb()
    .select({ id: sessions.id, createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt, userAgent: sessions.userAgent })
    .from(sessions)
    .where(eq(sessions.adminId, adminId));
}

export async function purgeExpiredSessions() {
  await getDb().delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export async function sessionBelongsTo(sessionId: string, adminId: string) {
  const rows = await getDb()
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.adminId, adminId)));
  return rows.length > 0;
}
