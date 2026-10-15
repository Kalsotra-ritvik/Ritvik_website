"use client";

import { useActionState, useState } from "react";
import { changePassword, type PasswordState } from "@/app/admin/auth-actions";
import { Notice, btnPrimary, input } from "./ui";

export default function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});
  const [show, setShow] = useState(false);
  const type = show ? "text" : "password";
  return (
    <form action={action} className="max-w-md space-y-4">
      {state.ok && <Notice tone="ok">Password changed. All other sessions have been signed out.</Notice>}
      {state.error && (
        <Notice tone="error" title={state.error}>
          {state.problems && (
            <ul className="list-disc pl-5">
              {state.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}
      <div>
        <label htmlFor="current" className="mb-1.5 block text-sm text-mist-200">
          Current password
        </label>
        <input id="current" name="current" type={type} autoComplete="current-password" required maxLength={256} className={input} />
      </div>
      <div>
        <label htmlFor="next" className="mb-1.5 block text-sm text-mist-200">
          New password
        </label>
        <p className="-mt-1 mb-1.5 text-xs text-mist-400">At least 12 characters. A long passphrase or a password-manager password is best.</p>
        <input id="next" name="next" type={type} autoComplete="new-password" required minLength={12} maxLength={256} className={input} />
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm text-mist-200">
          Repeat the new password
        </label>
        <input id="confirm" name="confirm" type={type} autoComplete="new-password" required minLength={12} maxLength={256} className={input} />
      </div>
      <label className="flex items-center gap-2 text-sm text-mist-300">
        <input type="checkbox" className="h-4 w-4 accent-amber-300" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
      </label>
      <button type="submit" className={btnPrimary} disabled={pending}>
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
