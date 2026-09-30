"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction, type AuthActionState } from "@/app/actions/auth";

const initial: AuthActionState = { ok: false };

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, initial);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="w-full space-y-3">
      <label className="auth-field">
        <span className="auth-field-icon" aria-hidden>
          <UserIcon />
        </span>
        <input
          name="username"
          autoComplete="username"
          placeholder="Username"
          aria-label="Username"
          required
          minLength={3}
          pattern="[a-z0-9_]+"
          className="auth-input"
        />
      </label>

      <label className="auth-field">
        <span className="auth-field-icon" aria-hidden>
          <LockIcon />
        </span>
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Password"
          aria-label="Password"
          required
          minLength={8}
          className="auth-input"
        />
        <button
          type="button"
          className="auth-field-action"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword((v) => !v)}
        >
          <EyeIcon slash={!showPassword} />
        </button>
      </label>

      {state.error ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-danger">
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-online">
          {state.message}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="auth-btn-primary">
        {pending ? "CREATING…" : "SIGN UP →"}
      </button>

      <div className="auth-or">
        <span>OR</span>
      </div>

      <Link href="/login" className="auth-btn-ghost">
        LOGIN
      </Link>
    </form>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="11" width="14" height="10" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ slash }: { slash?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
      {slash ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}
