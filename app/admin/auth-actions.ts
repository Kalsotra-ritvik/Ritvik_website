"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clientMeta, getSession, requireAdmin } from "@/lib/auth/dal";
import { PASSWORD_MAX, burnVerification, hashPassword, normaliseLoginId, passwordProblems, verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  hashToken,
  invalidateAllSessions,
  invalidateSession,
  sessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { lockRemaining, recordFailure, recordSuccess } from "@/lib/auth/throttle";
import { getDb, isDatabaseConfigured } from "@/lib/db/client";
import { admins, sessions } from "@/lib/db/schema";

export interface LoginState {
  error?: string;
  loginId?: string;
}

/** One message for unknown IDs and wrong passwords alike. */
const INVALID = "Invalid administrator ID or password.";

function waitMessage(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  return `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

async function startSession(adminId: string) {
  const jar = await cookies();
  // Session rotation: a session token present before sign-in is discarded.
  const previous = jar.get(sessionCookieName())?.value;
  if (previous && previous.length <= 100) await invalidateSession(hashToken(previous));
  const { token, cookieExpires } = await createSession(adminId, await clientMeta());
  jar.set(sessionCookieName(), token, sessionCookieOptions(cookieExpires));
}

async function clearSessionCookie() {
  // Re-send the same attributes: a __Host- cookie can only be overwritten with Secure and path=/.
  (await cookies()).set(sessionCookieName(), "", { ...sessionCookieOptions(new Date(0)), maxAge: 0 });
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawId = String(formData.get("loginId") ?? "");
  const password = String(formData.get("password") ?? "");
  const loginId = normaliseLoginId(rawId).slice(0, 100);
  if (!loginId || !password) return { error: "Enter your administrator ID and password.", loginId: rawId };
  if (!isDatabaseConfigured()) return { error: "Sign-in is unavailable because the database is not configured.", loginId: rawId };

  const { ip } = await clientMeta();
  const wait = await lockRemaining(ip, loginId);
  if (wait > 0) return { error: waitMessage(wait), loginId: rawId };

  const admin = password.length <= PASSWORD_MAX ? (await getDb().select().from(admins).where(eq(admins.loginId, loginId)).limit(1))[0] : undefined;
  let ok = false;
  if (admin) ok = await verifyPassword(admin.passwordHash, password);
  else await burnVerification(password.slice(0, PASSWORD_MAX)); // same cost whether or not the ID exists

  if (!admin || !ok) {
    await recordFailure(ip, loginId);
    const after = await lockRemaining(ip, loginId);
    return { error: after > 0 ? waitMessage(after) : INVALID, loginId: rawId };
  }

  await recordSuccess(loginId);
  await getDb().update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));
  await startSession(admin.id);
  redirect("/admin");
}

export async function logout() {
  const session = await getSession();
  if (session) await invalidateSession(session.sessionId);
  await clearSessionCookie();
  redirect("/admin/login");
}

export interface PasswordState {
  ok?: boolean;
  error?: string;
  problems?: string[];
}

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const session = await requireAdmin();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current || !next) return { error: "Fill in all fields." };

  const { ip } = await clientMeta();
  const wait = await lockRemaining(ip, session.admin.loginId);
  if (wait > 0) return { error: waitMessage(wait) };

  const admin = (await getDb().select().from(admins).where(eq(admins.id, session.admin.id)).limit(1))[0];
  if (!admin || current.length > PASSWORD_MAX || !(await verifyPassword(admin.passwordHash, current))) {
    await recordFailure(ip, session.admin.loginId);
    return { error: "The current password is incorrect." };
  }
  if (next !== confirm) return { error: "The new passwords do not match." };
  if (next === current) return { error: "Choose a password different from the current one." };
  const problems = passwordProblems(next, admin.loginId);
  if (problems.length) return { error: "Choose a stronger password.", problems };

  const now = new Date();
  await getDb()
    .update(admins)
    .set({ passwordHash: await hashPassword(next), passwordChangedAt: now, updatedAt: now })
    .where(eq(admins.id, admin.id));
  // Every existing session (including this one) ends; this browser gets a fresh one.
  await invalidateAllSessions(admin.id);
  await startSession(admin.id);
  return { ok: true };
}

/** Sign out every other browser, keeping the current session. */
export async function signOutOthers() {
  const session = await requireAdmin();
  const others = await getDb().select({ id: sessions.id }).from(sessions).where(eq(sessions.adminId, session.admin.id));
  for (const s of others) if (s.id !== session.sessionId) await invalidateSession(s.id);
  redirect("/admin/account?signedOut=1");
}

export async function signOutEverywhere() {
  const session = await requireAdmin();
  await invalidateAllSessions(session.admin.id);
  await clearSessionCookie();
  redirect("/admin/login");
}
