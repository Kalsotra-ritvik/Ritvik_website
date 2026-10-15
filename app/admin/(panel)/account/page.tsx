import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { listSessions } from "@/lib/auth/session";
import { signOutEverywhere, signOutOthers } from "@/app/admin/auth-actions";
import PasswordForm from "@/components/admin/PasswordForm";
import { Notice, PageHeader, btnDanger, btnSecondary, card, formatDate } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Account & security" };

function device(ua: string | null) {
  if (!ua) return "Unknown browser";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ signedOut?: string }> }) {
  const session = await requireAdmin();
  const { signedOut } = await searchParams;
  const sessions = (await listSessions(session.admin.id)).sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
  return (
    <>
      <PageHeader title="Account & security" description={<>Administrator ID: <span className="font-mono text-mist-100">{session.admin.loginId}</span></>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${card} p-4 sm:p-6`} aria-labelledby="pw-h">
          <h2 id="pw-h" className="mb-4 text-lg font-medium">
            Change password
          </h2>
          <PasswordForm />
        </section>
        <section className={`${card} p-4 sm:p-6`} aria-labelledby="sessions-h">
          <h2 id="sessions-h" className="text-lg font-medium">
            Signed-in browsers
          </h2>
          <p className="mt-1 text-sm text-mist-400">Sessions end after 7 days without activity and after 30 days at most.</p>
          {signedOut && (
            <div className="mt-3">
              <Notice tone="ok">Other browsers have been signed out.</Notice>
            </div>
          )}
          <ul className="mt-4 divide-y divide-ink-700">
            {sessions.map((s) => (
              <li key={s.id} className="py-2.5 text-sm">
                <p>
                  {device(s.userAgent)} {s.id === session.sessionId && <span className="ml-1 rounded-full bg-teal-400/15 px-2 py-0.5 text-xs text-teal-400">This browser</span>}
                </p>
                <p className="text-xs text-mist-400">
                  Signed in {formatDate(s.createdAt)} · last active {formatDate(s.lastSeenAt)}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={signOutOthers}>
              <button type="submit" className={btnSecondary} disabled={sessions.length < 2}>
                Sign out other browsers
              </button>
            </form>
            <form action={signOutEverywhere}>
              <button type="submit" className={btnDanger}>
                Sign out everywhere
              </button>
            </form>
          </div>
        </section>
      </div>
      <section className={`${card} mt-6 p-4 text-sm text-mist-300 sm:p-6`}>
        <h2 className="mb-2 text-lg font-medium text-mist-100">Lost access?</h2>
        <p>
          There is no email-based reset. Someone with access to the server’s database can set a new password with <code className="text-mist-100">npm run admin:reset-password</code>, which also signs out
          every session.
        </p>
      </section>
    </>
  );
}
