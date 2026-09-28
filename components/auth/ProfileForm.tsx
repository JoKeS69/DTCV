"use client";

import { useActionState } from "react";
import type { AuthActionState } from "@/app/actions/auth";

const initial: AuthActionState = { ok: false };

export function ProfileForm({
  action,
  defaultDisplayName,
}: {
  action: (
    prev: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
  defaultDisplayName: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-3">
      <label className="auth-field max-w-md">
        <span className="auth-field-icon" aria-hidden>
          #
        </span>
        <input
          name="displayName"
          defaultValue={defaultDisplayName}
          required
          maxLength={64}
          className="auth-input"
        />
      </label>
      {state.error ? (
        <p className="font-mono text-[11px] text-danger">{state.error}</p>
      ) : null}
      {state.message ? (
        <p className="font-mono text-[11px] text-online">{state.message}</p>
      ) : null}
      <button type="submit" disabled={pending} className="auth-btn-primary max-w-xs">
        {pending ? "SAVING…" : "SAVE →"}
      </button>
    </form>
  );
}
