/**
 * Password hashing with Argon2id (OWASP parameters: 19 MiB memory, 2 iterations, 1 lane).
 * Hashes are stored as PHC strings; plaintext passwords are never stored or logged.
 */
import { hash, verify } from "@node-rs/argon2";

const ARGON2ID = 2; // @node-rs/argon2 Algorithm.Argon2id (const enum, inlined)
const OPTIONS = { algorithm: ARGON2ID, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 256;
export const LOGIN_ID_PATTERN = /^[a-z0-9][a-z0-9._@-]{2,63}$/;

export function normaliseLoginId(value: string): string {
  return value.trim().toLowerCase();
}

/** Returns a list of problems; empty when the password is acceptable. */
export function passwordProblems(password: string, loginId?: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN) problems.push(`Use at least ${PASSWORD_MIN} characters.`);
  if (password.length > PASSWORD_MAX) problems.push(`Use at most ${PASSWORD_MAX} characters.`);
  if (loginId && password.toLowerCase().includes(normaliseLoginId(loginId))) problems.push("Don't include the administrator ID in the password.");
  if (/^(.)\1+$/.test(password)) problems.push("Don't repeat a single character.");
  return problems;
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;
/** Verify against a throwaway hash so unknown IDs take as long as known ones. */
export async function burnVerification(password: string): Promise<void> {
  dummyHash ??= hash(crypto.randomUUID(), OPTIONS);
  await verifyPassword(await dummyHash, password);
}
