"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusDot } from "@/components/ui/StatusDot";
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
  const [clock, setClock] = useState("—");

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
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:h-16 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center border border-border text-text md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">Menu</span>
            <span aria-hidden className="flex w-4 flex-col gap-1">
              <span className="block h-px bg-text" />
              <span className="block h-px bg-text" />
              <span className="block h-px bg-text" />
            </span>
          </button>

          <Link href="/" className="min-w-0 group">
            <span className="block truncate font-mono text-sm font-semibold tracking-[0.22em] text-text md:text-base">
              {designTokens.brand}
            </span>
            <span className="hidden truncate font-mono text-[9px] tracking-[0.28em] text-text-dim sm:block">
              {designTokens.tagline}
            </span>
          </Link>
        </div>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 md:flex"
        >
          {primaryNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted transition-colors hover:text-text"
            >
              <span className="mr-2 text-text-dim">{item.index}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-end gap-4 text-right sm:flex">
          <StatusDot label="System online" />
          <time
            className="font-mono text-[10px] tracking-[0.16em] text-text-dim"
            dateTime={new Date().toISOString()}
          >
            {clock}
          </time>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-border bg-bg md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col px-4 py-3">
            {primaryNav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-border py-3 font-mono text-xs uppercase tracking-[0.2em] text-text last:border-b-0"
              >
                <span className="mr-3 text-text-dim">{item.index}</span>
                {item.label}
              </Link>
            ))}
            <div className="flex items-center justify-between py-3">
              <StatusDot />
              <span className="font-mono text-[10px] tracking-[0.16em] text-text-dim">
                {clock}
              </span>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
