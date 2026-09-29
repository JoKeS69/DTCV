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

/** Desktop header — CASE//NET | GLOBAL INVESTIGATION PLATFORM */
export function CommandDeckHeader() {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(formatHudClock(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="hidden h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-bg px-4 md:flex">
      <Link
        href="/cases"
        className="min-w-0 truncate font-mono text-[13px] tracking-[0.14em] text-text"
      >
        <span className="font-semibold">{designTokens.brand}</span>
        <span className="text-text-dim"> | </span>
        <span className="font-normal text-text-muted">
          {designTokens.tagline}
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-4">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
          SYSTEM: ONLINE
          <span className="size-1.5 rounded-full bg-online motion-pulse-online" />
        </span>
        <time
          className="font-mono text-[10px] tracking-[0.14em] text-text-dim"
          suppressHydrationWarning
        >
          {clock || "—"}
        </time>
      </div>
    </header>
  );
}
