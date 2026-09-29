"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { designTokens } from "@/lib/design-tokens";
import { primaryNav } from "@/lib/site-nav";

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

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(formatHudClock(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="flex h-11 items-center justify-between gap-3 px-3 md:h-12 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center text-text md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <span aria-hidden className="flex w-4 flex-col gap-[5px]">
              <span className="block h-px bg-text" />
              <span className="block h-px bg-text" />
              <span className="block h-px bg-text" />
            </span>
          </button>

          <Link href="/" className="min-w-0">
            {/* design-refs: | BRAND | TAGLINE */}
            <span className="block truncate font-mono text-[12px] font-semibold tracking-[0.16em] text-text md:text-[13px]">
              <span className="text-text-dim">|</span> {designTokens.brand}{" "}
              <span className="text-text-dim">|</span>{" "}
              <span className="hidden text-text-muted sm:inline">
                {designTokens.tagline}
              </span>
            </span>
          </Link>
        </div>

        <nav aria-label="Primary" className="hidden items-center lg:flex">
          {primaryNav.map((item) => (
            <Link
              key={`${item.index}-${item.label}`}
              href={item.href}
              className="px-2 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
            >
              <span className="mr-1.5 text-text-dim">{item.index}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted hover:text-text sm:inline"
          >
            Login
          </Link>
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted sm:text-[10px] sm:tracking-[0.16em]">
            SYSTEM ONLINE
            <span className="size-1.5 rounded-full bg-online motion-pulse-online" />
          </span>
          <time
            className="hidden font-mono text-[10px] tracking-[0.14em] text-text-dim sm:inline"
            suppressHydrationWarning
          >
            {clock || "—"}
          </time>
        </div>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-border bg-bg md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {primaryNav.map((item) => (
              <Link
                key={`${item.index}-${item.label}`}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-border px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-text"
              >
                <span className="mr-2 text-text-dim">{item.index}</span>
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-cta"
            >
              Login / Sign up
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
