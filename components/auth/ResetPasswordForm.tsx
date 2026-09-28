"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  type AuthActionState,
} from "@/app/actions/auth";

const initial: AuthActionState = { ok: false };

export function RequestResetForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initial,
  );

  return (
    <form action={action} className="mx-auto w-full max-w-[360px] space-y-3">
      <label className="auth-field">
        <span className="auth-field-icon" aria-hidden>
          @
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="auth-input"
        />
      </label>

      {state.error ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-danger">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="border border-border px-3 py-2 font-mono text-[10px] leading-relaxed text-text-muted">
          {state.message}
          {state.resetUrl ? (
            <>
              {" "}
              <Link href={state.resetUrl} className="text-online break-all">
                Open reset link
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="auth-btn-primary">
        {pending ? "ISSUING…" : "SEND RESET →"}
      </button>
      <Link href="/login" className="auth-btn-ghost">
        BACK TO LOGIN
      </Link>
    </form>
  );
}

export function ConfirmResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  return (
    <form action={action} className="mx-auto w-full max-w-[360px] space-y-3">
      <input type="hidden" name="token" value={token} />
      <label className="auth-field">
        <span className="auth-field-icon" aria-hidden>
          *
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="New password"
          className="auth-input"
        />
      </label>
      {state.error ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-danger">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-online">
          {state.message}{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="auth-btn-primary">
        {pending ? "UPDATING…" : "UPDATE PASSWORD →"}
      </button>
    </form>
  );
}
