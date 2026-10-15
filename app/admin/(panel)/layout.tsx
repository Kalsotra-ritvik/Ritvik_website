import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/dal";
import AdminNav from "@/components/admin/AdminNav";
import UnsavedGuard from "@/components/admin/UnsavedGuard";
import { logout } from "../auth-actions";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  // Pages and actions check the session themselves too; this only gates the shell.
  const session = await requireAdmin();
  return (
    <div className="lg:flex">
      <AdminNav
        loginId={session.admin.loginId}
        signOut={
          <form action={logout}>
            <button type="submit" className="text-mist-300 hover:text-mist-100">
              Sign out
            </button>
          </form>
        }
      />
      <UnsavedGuard />
      <main id="admin-main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
