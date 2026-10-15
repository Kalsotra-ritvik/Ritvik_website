/**
 * Data Access Layer for authentication (see the Next.js authentication guide).
 * Every admin page, Server Action and Route Handler calls one of these helpers
 * itself; layouts and the UI are never trusted to enforce access.
 */
import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isDatabaseConfigured } from "@/lib/db/client";
import { sessionCookieName, validateSessionToken, type ValidSession } from "./session";

export const getSession = cache(async (): Promise<ValidSession | null> => {
  if (!isDatabaseConfigured()) return null;
  const token = (await cookies()).get(sessionCookieName())?.value;
  try {
    return await validateSessionToken(token);
  } catch (err) {
    console.error("Session validation failed:", err);
    return null;
  }
});

/** For admin pages and Server Actions: redirect to the login page when signed out. */
export async function requireAdmin(): Promise<ValidSession> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * For Route Handlers: reject unauthenticated requests and cross-site requests.
 * Server Actions get Next.js's built-in Origin/Host check; route handlers check it here.
 */
export async function requireAdminApi(request: Request): Promise<ValidSession> {
  assertSameOrigin(request);
  const session = await getSession();
  if (!session) throw new HttpError(401, "Sign in to continue.");
  return session;
}

export function assertSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) throw new HttpError(403, "Missing origin.");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Invalid origin.");
  }
  if (originHost !== host) throw new HttpError(403, "Cross-site request blocked.");
}

export async function clientMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return { ip: forwarded || h.get("x-real-ip") || null, userAgent: h.get("user-agent") };
}

export function apiError(err: unknown) {
  if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
  console.error(err);
  return Response.json({ error: "Something went wrong on the server." }, { status: 500 });
}
