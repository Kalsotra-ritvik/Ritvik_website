import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/dal";
import { getDb, isDatabaseConfigured } from "@/lib/db/client";
import { admins } from "@/lib/db/schema";
import { Notice } from "@/components/admin/ui";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

async function setupState(): Promise<"ok" | "no-db" | "no-admin" | "db-error"> {
  if (!isDatabaseConfigured()) return "no-db";
  try {
    const n = Number((await getDb().select({ n: sql<number>`count(*)` }).from(admins))[0]?.n ?? 0);
    return n > 0 ? "ok" : "no-admin";
  } catch {
    return "db-error";
  }
}

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  const state = await setupState();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-teal-400">Portfolio administration</p>
        <h1 className="mt-3 font-display text-4xl text-mist-100">Sign in</h1>
        <div className="mt-8">
          {state === "no-db" && (
            <Notice tone="warn" title="The database is not configured">
              Set <code>DATABASE_URL</code> on the server, run <code>npm run db:migrate</code>, then create the first administrator with{" "}
              <code>npm run admin:create</code>.
            </Notice>
          )}
          {state === "db-error" && <Notice tone="error" title="The database can't be reached right now.">Try again in a moment.</Notice>}
          {state === "no-admin" && (
            <Notice tone="warn" title="No administrator exists yet">
              Create one from a terminal with access to the database: <code>npm run admin:create</code>. There is no public sign-up.
            </Notice>
          )}
          {state === "ok" && <LoginForm />}
        </div>
        <p className="mt-8 text-xs leading-relaxed text-mist-400">
          Forgot the password? Reset it from a terminal with database access using <code>npm run admin:reset-password</code>. This
          site does not send password-reset emails.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-mist-300 underline underline-offset-4 hover:text-mist-100">
          ← Back to the portfolio
        </Link>
      </div>
    </main>
  );
}
