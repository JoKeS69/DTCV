"use client";

import Link from "next/link";
import { useSyncExternalStore, useState, useTransition } from "react";
import {
  CONSENT_COOKIE,
  LEGAL_POLICY_VERSION,
  VISITOR_COOKIE,
} from "@/lib/legal/policy";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function subscribe() {
  return () => {};
}

function getConsentSnapshot(): boolean {
  return readCookie(CONSENT_COOKIE) === LEGAL_POLICY_VERSION;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * First-visit modal: agree Terms + Privacy before research case pages.
 * Re-prompts when LEGAL_POLICY_VERSION changes.
 */
export function ConsentGate({ children }: { children: React.ReactNode }) {
  const hasConsent = useSyncExternalStore(
    subscribe,
    getConsentSnapshot,
    getServerSnapshot,
  );
  const [accepted, setAccepted] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (hasConsent || accepted) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-bg/90 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="w-full max-w-lg border border-border bg-surface p-5 shadow-lg"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
          Legal consent · v{LEGAL_POLICY_VERSION}
        </p>
        <h2
          id="consent-title"
          className="mt-2 font-mono text-lg uppercase tracking-[0.08em] text-text"
        >
          Before you continue
        </h2>
        <p className="mt-3 font-mono text-[12px] normal-case leading-relaxed tracking-normal text-text-muted">
          Research case pages require agreement to our{" "}
          <Link href="/legal/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline">
            Privacy
          </Link>{" "}
          policies. Content may include sensitive material (18+).
        </p>
        <p className="mt-2 font-mono text-[10px] text-warning">
          DRAFT — not legal advice. Placeholders pending counsel review.
        </p>
        {error ? (
          <p className="mt-2 font-mono text-[11px] text-danger">{error}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await fetch("/api/legal/consent", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ agree: true }),
                });
                if (!res.ok) {
                  setError("Could not record consent");
                  return;
                }
                document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(LEGAL_POLICY_VERSION)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
                void readCookie(VISITOR_COOKIE);
                setAccepted(true);
              })
            }
            className="border border-border bg-accent/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em]"
          >
            {pending ? "Saving…" : "I agree"}
          </button>
          <Link
            href="/cases"
            className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted"
          >
            Leave
          </Link>
        </div>
      </div>
    </div>
  );
}
