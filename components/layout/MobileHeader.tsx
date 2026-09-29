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

/** Mobile mockup header — hamburger + stacked brand + SYSTEM ONLINE */
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
    <header className="flex shrink-0 items-start justify-between gap-2 border-b border-border bg-bg px-2.5 py-2 md:hidden">
      <div className="flex min-w-0 items-start gap-2">
        <button
          type="button"
          className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center text-text"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={onMenu}
        >
          <span aria-hidden className="flex w-[18px] flex-col gap-[5px]">
            <span className="block h-px bg-text" />
            <span className="block h-px bg-text" />
            <span className="block h-px bg-text" />
          </span>
        </button>
        <Link href="/cases" className="min-w-0">
          <span className="block font-mono text-[15px] font-semibold tracking-[0.16em] text-text">
            {designTokens.brand}
          </span>
          <span className="mt-0.5 block font-mono text-[8px] font-normal uppercase tracking-[0.14em] text-text-muted">
            {designTokens.tagline}
          </span>
        </Link>
      </div>
      <div className="shrink-0 pt-0.5 text-right">
        <p className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text-muted">
          <span className="size-1.5 rounded-full bg-online motion-pulse-online" />
          SYSTEM ONLINE
        </p>
        <time
          className="mt-0.5 block font-mono text-[9px] tracking-[0.1em] text-text-dim"
          suppressHydrationWarning
        >
          {clock || "—"}
        </time>
      </div>
    </header>
  );
}
