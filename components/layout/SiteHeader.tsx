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

export function SiteHeader({
  signedIn = false,
}: {
  /** When true, show Profile instead of Login. */
  signedIn?: boolean;
}) {
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

  const accountHref = signedIn ? "/profile" : "/login";
  const accountLabel = signedIn ? "Profile" : "Login";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="flex h-12 items-center justify-between gap-3 px-4 md:h-14 md:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center text-text md:hidden"
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

          <Link href={signedIn ? "/cases" : "/"} className="min-w-0">
            <span className="block truncate font-display text-[13px] font-semibold tracking-[0.14em] text-text md:text-[15px]">
              {designTokens.brand}
            </span>
            <span className="mt-0.5 hidden font-mono text-[9px] uppercase tracking-[0.2em] text-text-dim sm:block">
              {designTokens.tagline}
            </span>
          </Link>
        </div>

        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-[6px] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted transition-colors hover:bg-surface-elevated hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={accountHref}
            className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted hover:text-text sm:inline"
          >
            {accountLabel}
          </Link>
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-muted sm:text-[10px]">
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
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-border px-4 py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-text"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={accountHref}
              onClick={() => setOpen(false)}
              className="px-4 py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-cta"
            >
              {signedIn ? "Profile" : "Login / Sign up"}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
