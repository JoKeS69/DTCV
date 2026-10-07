"use client";

import { useEffect, useState } from "react";

function formatClock(date: Date) {
  return date
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "")
    .toUpperCase();
}

export function AuthHudChrome() {
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 py-3 md:px-6">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-text md:text-[12px]">
          CASE//NET
          <span className="ml-2 font-mono text-[9px] font-normal tracking-[0.22em] text-text-dim md:text-[10px]">
            GLOBAL INVESTIGATION PLATFORM
          </span>
        </p>
        <div className="text-right">
          <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
            SYSTEM ONLINE
            <span className="size-1.5 rounded-full bg-online motion-pulse-online" />
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.16em] text-text-dim">
            {clock || "—"}
          </p>
          <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-text-dim">
            0.0000° N 0.0000° E
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-4 py-3 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
          &gt; SECURE CONNECTION ESTABLISHED
        </p>
        <p className="font-mono text-[10px] tracking-[0.14em] text-text-dim">
          37.7749° N 122.4194° W
        </p>
      </div>
    </>
  );
}
