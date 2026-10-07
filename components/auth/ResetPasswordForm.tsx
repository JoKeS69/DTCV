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
    <form action={action} className="auth-stack">
      <div className="auth-block">
        <label className="auth-field">
          <span className="auth-field-icon" aria-hidden>
            @
          </span>
          <input
            name="account"
            type="text"
            autoComplete="username"
            required
            minLength={3}
            placeholder="Username or email"
            aria-label="Username or email"
            className="auth-input"
          />
        </label>
      </div>

      {state.error ? (
        <p className="auth-feedback auth-feedback--error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-feedback auth-feedback--ok" role="status">
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

      <div className="auth-block auth-block--cta">
        <button type="submit" disabled={pending} className="auth-btn-primary">
          {pending ? "ISSUING…" : "SEND RESET →"}
        </button>
      </div>
      <div className="auth-block auth-block--secondary">
        <Link href="/login" className="auth-btn-ghost">
          BACK TO LOGIN
        </Link>
      </div>
    </form>
  );
}

export function ConfirmResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  return (
    <form action={action} className="auth-stack">
      <input type="hidden" name="token" value={token} />
      <div className="auth-block">
        <label className="auth-field">
          <span className="auth-field-icon" aria-hidden>
            *
          </span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="New password"
            aria-label="New password"
            className="auth-input"
          />
        </label>
      </div>
      {state.error ? (
        <p className="auth-feedback auth-feedback--error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-feedback auth-feedback--ok" role="status">
          {state.message}{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </p>
      ) : null}
      <div className="auth-block auth-block--cta">
        <button type="submit" disabled={pending} className="auth-btn-primary">
          {pending ? "UPDATING…" : "UPDATE PASSWORD →"}
        </button>
      </div>
    </form>
  );
}
