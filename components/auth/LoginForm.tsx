"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, type AuthActionState } from "@/app/actions/auth";

const initial: AuthActionState = { ok: false };

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="auth-stack">
      <input type="hidden" name="callbackUrl" value={callbackUrl || "/profile"} />

      <div className="auth-block">
        <div className="flex items-center gap-2">
          <label className="auth-field min-w-0 flex-1">
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
              className="auth-input"
            />
          </label>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-text-dim normal-case">
            No real names..
          </span>
        </div>
      </div>

      <div className="auth-block">
        <label className="auth-field">
          <span className="auth-field-icon" aria-hidden>
            <LockIcon />
          </span>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
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
      </div>

      {state.error ? (
        <p className="auth-feedback auth-feedback--error" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="auth-block auth-block--cta">
        <button type="submit" disabled={pending} className="auth-btn-primary">
          {pending ? "AUTHENTICATING…" : "LOGIN →"}
        </button>
      </div>

      <div className="auth-or" aria-hidden>
        <span>OR</span>
      </div>

      <div className="auth-block auth-block--secondary">
        <Link href="/register" className="auth-btn-ghost">
          SIGN UP
        </Link>
      </div>

      <p className="auth-aux-link">
        <Link href="/reset-password">Reset password</Link>
      </p>
    </form>
  );
}

function UserIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="11" width="14" height="10" rx="0" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ slash }: { slash?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
      {slash ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}
