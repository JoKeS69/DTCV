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

/** Desktop / tablet header */
export function CommandDeckHeader() {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(formatHudClock(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="hidden h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-bg/95 px-5 backdrop-blur-sm md:flex xl:px-6">
      <Link
        href="/cases"
        className="min-w-0 truncate font-mono text-[15px] tracking-[0.12em] text-text xl:text-[16px]"
      >
        <span className="font-semibold">{designTokens.brand}</span>
        <span className="text-text-dim"> | </span>
        <span className="font-normal text-text-muted">
          {designTokens.tagline}
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-5">
        <span className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] text-text-muted">
          SYSTEM: ONLINE
          <span className="size-2 rounded-full bg-online motion-pulse-online" />
        </span>
        <time
          className="font-mono text-[12px] tracking-[0.12em] text-text-dim"
          suppressHydrationWarning
        >
          {clock || "—"}
        </time>
      </div>
    </header>
  );
}
