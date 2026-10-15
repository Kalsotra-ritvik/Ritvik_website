"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "../auth-actions";
import { btnPrimary, input } from "@/components/admin/ui";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && (
        <p role="alert" className="rounded-lg border border-coral-400/50 bg-coral-400/10 px-3 py-2 text-sm text-mist-100">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="loginId" className="mb-1.5 block text-sm text-mist-200">
          Administrator ID
        </label>
        <input
          id="loginId"
          name="loginId"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={100}
          defaultValue={state.loginId}
          key={state.loginId ?? "id"}
          className={input}
          aria-invalid={Boolean(state.error) || undefined}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm text-mist-200">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            maxLength={256}
            className={`${input} pr-20`}
            aria-invalid={Boolean(state.error) || undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-1 right-1 rounded-md px-3 text-xs font-medium text-mist-300 hover:bg-ink-800 hover:text-mist-100"
            aria-pressed={show}
            aria-controls="password"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <button type="submit" className={`${btnPrimary} w-full`} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
