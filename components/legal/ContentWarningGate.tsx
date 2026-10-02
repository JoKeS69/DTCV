"use client";

import { useState } from "react";

/** 18+ content warning interstitial before research case body. */
export function ContentWarningGate({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [ok, setOk] = useState(!enabled);
  if (ok) return <>{children}</>;

  return (
    <div className="border border-warning/50 bg-surface/40 p-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-warning">
        Content warning · 18+
      </p>
      <p className="mx-auto mt-3 max-w-md font-mono text-[12px] text-text-muted normal-case tracking-normal">
        This case file may describe violence, death, or other distressing
        events. Continue only if you are 18 or older and prepared to view such
        material.
      </p>
      <button
        type="button"
        onClick={() => setOk(true)}
        className="mt-4 border border-border bg-accent/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em]"
      >
        Enter case file
      </button>
    </div>
  );
}
