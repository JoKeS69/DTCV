"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { designTokens } from "@/lib/design-tokens";

function formatHudClock(date: Date) {
  return date
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(",", "")
    .toUpperCase();
}

export function MobileHeader({
  onMenu,
  menuOpen,
}: {
  onMenu: () => void;
  menuOpen?: boolean;
}) {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(formatHudClock(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-bg px-4 py-3 md:hidden">
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-[6px] text-text transition-colors hover:bg-surface"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={onMenu}
        >
          <span aria-hidden className="flex w-5 flex-col gap-[5px]">
            <span className="block h-px bg-text" />
            <span className="block h-px bg-text" />
            <span className="block h-px bg-text" />
          </span>
        </button>
        <Link href="/cases" className="min-w-0 pt-1">
          <span className="block font-mono text-[18px] font-semibold tracking-[0.12em] text-text">
            {designTokens.brand}
          </span>
          <span className="mt-1 block font-mono text-[12px] font-normal uppercase tracking-[0.1em] text-text-muted">
            {designTokens.tagline}
          </span>
        </Link>
      </div>
      <div className="shrink-0 pt-1 text-right">
        <p className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.1em] text-text-muted">
          <span className="size-2 rounded-full bg-online motion-pulse-online" />
          SYSTEM ONLINE
        </p>
        <time
          className="mt-1 block font-mono text-[12px] tracking-[0.08em] text-text-dim"
          suppressHydrationWarning
        >
          {clock || "—"}
        </time>
      </div>
    </header>
  );
}
