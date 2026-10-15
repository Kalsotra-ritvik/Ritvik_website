import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { hashPassword, passwordProblems, verifyPassword, LOGIN_ID_PATTERN, normaliseLoginId } from "@/lib/auth/password";
import { createSession, hashToken, invalidateAllSessions, sessionCookieOptions, validateSessionToken, SESSION_IDLE_MS } from "@/lib/auth/session";
import { MAX_FAILURES_PER_ID, lockRemaining, recordFailure, recordSuccess } from "@/lib/auth/throttle";
import { closeDb, getDb } from "@/lib/db/client";
import { admins, sessions } from "@/lib/db/schema";
import { createTestAdmin, hasTestDb, resetDb } from "./helpers/db";

describe("passwords", () => {
  it("hashes with Argon2id and verifies", async () => {
    const sample = `sample-${Date.now()}-passphrase`;
    const hash = await hashPassword(sample);
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).not.toContain(sample);
    expect(await verifyPassword(hash, sample)).toBe(true);
    expect(await verifyPassword(hash, sample.toUpperCase())).toBe(false);
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });

  it("enforces basic strength rules", () => {
    expect(passwordProblems("short")).not.toEqual([]);
    expect(passwordProblems("aaaaaaaaaaaaaaaa")).not.toEqual([]);
    expect(passwordProblems("ritvik-admin-2026-pass", "ritvik-admin")).not.toEqual([]);
    expect(passwordProblems("a long and unusual passphrase", "ritvik")).toEqual([]);
  });

  it("normalises administrator IDs", () => {
    expect(normaliseLoginId("  Ritvik.K ")).toBe("ritvik.k");
    expect(LOGIN_ID_PATTERN.test("ritvik.k")).toBe(true);
    expect(LOGIN_ID_PATTERN.test("a")).toBe(false);
    expect(LOGIN_ID_PATTERN.test("bad id")).toBe(false);
  });

  it("session cookies are HttpOnly, SameSite=Lax and scoped to the site", () => {
    const o = sessionCookieOptions(new Date());
    expect(o.httpOnly).toBe(true);
    expect(o.sameSite).toBe("lax");
    expect(o.path).toBe("/");
  });
});

describe.skipIf(!hasTestDb)("sessions and throttling (database)", () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  it("stores only a hash of the session token", async () => {
    const { admin } = await createTestAdmin();
    const { token } = await createSession(admin.id, { ip: "203.0.113.5", userAgent: "test" });
    const rows = await getDb().select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(hashToken(token));
    expect(rows[0].id).not.toBe(token);
    expect(rows[0].ipHash).not.toContain("203.0.113.5");
    const valid = await validateSessionToken(token);
    expect(valid?.admin.loginId).toBe("tester");
    expect(await validateSessionToken("forged-token")).toBeNull();
    expect(await validateSessionToken(undefined)).toBeNull();
  });

  it("expires idle sessions and deletes them", async () => {
    const { admin } = await createTestAdmin();
    const { token } = await createSession(admin.id, {});
    await getDb().update(sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await validateSessionToken(token)).toBeNull();
    expect(await getDb().select().from(sessions)).toHaveLength(0);
    expect(SESSION_IDLE_MS).toBe(7 * 24 * 3600 * 1000);
  });

  it("invalidates sessions created before a password change", async () => {
    const { admin } = await createTestAdmin();
    const { token } = await createSession(admin.id, {});
    await getDb().update(admins).set({ passwordChangedAt: new Date(Date.now() + 1000) }).where(eq(admins.id, admin.id));
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("signs out every session", async () => {
    const { admin } = await createTestAdmin();
    const a = await createSession(admin.id, {});
    const b = await createSession(admin.id, {});
    await invalidateAllSessions(admin.id);
    expect(await validateSessionToken(a.token)).toBeNull();
    expect(await validateSessionToken(b.token)).toBeNull();
  });

  it("locks an ID after repeated failures, whether or not it exists", async () => {
    for (const id of ["tester", "nobody-at-all"]) {
      expect(await lockRemaining("198.51.100.1", id)).toBe(0);
      for (let i = 0; i < MAX_FAILURES_PER_ID; i++) await recordFailure("198.51.100.1", id);
      expect(await lockRemaining("198.51.100.1", id)).toBeGreaterThan(0);
      // The lock is per ID: another ID from a different address is unaffected.
      expect(await lockRemaining("198.51.100.2", `${id}-other`)).toBe(0);
    }
  });

  it("clears the ID bucket after a successful sign-in", async () => {
    await recordFailure("198.51.100.9", "tester");
    await recordFailure("198.51.100.9", "tester");
    await recordSuccess("tester");
    for (let i = 0; i < MAX_FAILURES_PER_ID - 1; i++) await recordFailure("198.51.100.9", "tester");
    expect(await lockRemaining("198.51.100.9", "tester")).toBe(0);
  });
});
