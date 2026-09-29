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

export function CommandDeckHeader({
  onMenu,
  menuOpen,
}: {
  onMenu?: () => void;
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
    <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-bg px-3 md:h-11 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        {onMenu ? (
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center text-text md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={onMenu}
          >
            <span aria-hidden className="flex w-4 flex-col gap-[5px]">
              <span className="block h-px bg-text" />
              <span className="block h-px bg-text" />
              <span className="block h-px bg-text" />
            </span>
          </button>
        ) : null}
        <Link href="/cases" className="min-w-0 truncate font-mono text-[12px] font-semibold tracking-[0.14em] text-text md:text-[13px]">
          {designTokens.brand}
          <span className="text-text-dim"> | </span>
          <span className="font-normal text-text-muted">
            {designTokens.tagline}
          </span>
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted md:text-[10px]">
          SYSTEM: ONLINE
          <span className="size-1.5 rounded-full bg-online motion-pulse-online" />
        </span>
        <time
          className="hidden font-mono text-[10px] tracking-[0.12em] text-text-dim sm:inline"
          suppressHydrationWarning
        >
          {clock || "—"}
        </time>
      </div>
    </header>
  );
}
