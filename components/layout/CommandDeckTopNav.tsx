"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  FileSearch,
  FolderSearch,
  GraduationCap,
  Menu,
  MessageSquare,
  Search,
  User,
  X,
} from "lucide-react";
import type { DeckUser } from "@/components/layout/deck-user";
import { designTokens } from "@/lib/design-tokens";
import { primaryNav } from "@/lib/site-nav";

const ICONS: Record<string, typeof Search> = {
  Cases: BookOpen,
  Search,
  Evidence: FolderSearch,
  Intel: FileSearch,
  Forum: MessageSquare,
  Training: GraduationCap,
  Profile: User,
};

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

function isActive(label: string, pathname: string, focus: string | null) {
  switch (label) {
    case "Cases":
      return (
        pathname.startsWith("/cases") &&
        focus !== "search" &&
        focus !== "evidence" &&
        focus !== "discussions"
      );
    case "Search":
      return focus === "search";
    case "Evidence":
      return focus === "evidence";
    case "Training":
      return pathname.startsWith("/fictional") && !pathname.includes("rankings");
    case "Intel":
      return pathname.includes("rankings");
    case "Profile":
      return pathname.startsWith("/profile");
    case "Forum":
      return pathname.startsWith("/discussions") || focus === "discussions";
    default:
      return false;
  }
}

function UserChip({
  user,
}: {
  user: {
    displayName: string;
    publicId: string;
    rankLabel: string;
    status: "ACTIVE" | "SUSPENDED" | "GUEST";
  };
}) {
  const statusClass =
    user.status === "ACTIVE" ? "text-online" : "text-text-muted";

  return (
    <div className="min-w-0 font-mono uppercase tracking-[0.08em]">
      <p className="truncate text-[12px] text-text">{user.displayName}</p>
      <p className="mt-0.5 truncate text-[11px] text-text-dim">
        {user.publicId}
        <span className="mx-1.5 text-border-strong">·</span>
        {user.rankLabel}
        <span className="mx-1.5 text-border-strong">·</span>
        <span className={statusClass}>{user.status}</span>
      </p>
    </div>
  );
}

export function CommandDeckTopNav({ user }: { user: DeckUser }) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const focus = searchParams?.get("focus") ?? null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState("");

  const guestUser = user ?? {
    displayName: "DETECTIVE",
    publicId: "DET-GUEST000",
    rankLabel: "NOVICE",
    status: "ACTIVE" as const,
  };

  useEffect(() => {
    const tick = () => setClock(formatHudClock(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navLinkClass = (active: boolean) =>
    [
      "inline-flex items-center gap-2 rounded-[6px] px-3 py-2 font-mono text-[12px] uppercase tracking-[0.14em] transition-colors",
      active
        ? "bg-selected text-text"
        : "text-text-muted hover:bg-surface-elevated hover:text-text",
    ].join(" ");

  return (
    <>
      <header className="shrink-0 border-b border-border bg-bg/95 backdrop-blur-sm">
        {/* Desktop / tablet — single topmost nav row */}
        <div className="relative hidden items-center gap-4 px-5 py-3 md:flex xl:gap-6 xl:px-8 xl:py-3.5">
          <div className="z-10 flex min-w-0 max-w-[34%] shrink items-center gap-3">
            <Link
              href="/cases"
              className="shrink-0 font-mono text-[13px] font-semibold tracking-[0.12em] text-text"
            >
              {designTokens.brand}
            </Link>
            <span className="hidden h-6 w-px bg-border lg:block" aria-hidden />
            <div className="hidden min-w-0 lg:block">
              <UserChip user={guestUser} />
            </div>
          </div>

          <nav
            aria-label="Main terminal"
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-wrap items-center justify-center gap-x-2 gap-y-1 xl:gap-x-4"
          >
            {primaryNav.map((item) => {
              const active = isActive(item.label, pathname, focus);
              const Icon = ICONS[item.label] ?? BookOpen;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={navLinkClass(active)}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className="size-4 shrink-0 opacity-80"
                    strokeWidth={active ? 1.75 : 1.4}
                    aria-hidden
                  />
                  <span>{item.label}</span>
                  {active ? (
                    <span className="text-text-dim" aria-hidden>
                      &gt;
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="z-10 ml-auto flex shrink-0 flex-col items-end gap-1">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted">
              ONLINE
              <span className="size-2 rounded-full bg-online motion-pulse-online" />
            </span>
            <time
              className="font-mono text-[11px] tracking-[0.1em] text-text-dim"
              suppressHydrationWarning
            >
              {clock || "—"}
            </time>
            {!user ? (
              <Link
                href="/login"
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted hover:text-text"
              >
                Login →
              </Link>
            ) : null}
          </div>
        </div>

        {/* Mobile — topmost bar only */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[6px] text-text transition-colors hover:bg-surface"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? (
                <X className="size-5" strokeWidth={1.5} aria-hidden />
              ) : (
                <Menu className="size-5" strokeWidth={1.5} aria-hidden />
              )}
            </button>
            <UserChip user={guestUser} />
          </div>
          <div className="shrink-0 text-right">
            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-text-muted">
              <span className="size-2 rounded-full bg-online motion-pulse-online" />
              ONLINE
            </p>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu overlay"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative z-10 mx-3 mt-3 flex max-h-[85vh] flex-col rounded-[6px] border border-border bg-bg shadow-2xl">
            <div className="border-b border-border px-4 py-4">
              <p className="font-mono text-[13px] font-semibold tracking-[0.12em] text-text">
                {designTokens.brand}
              </p>
              <div className="mt-3">
                <UserChip user={guestUser} />
              </div>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-dim">
                {designTokens.manifesto.join(" ")}
              </p>
              {!user ? (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="mt-3 inline-block font-mono text-[12px] uppercase tracking-[0.12em] text-text-muted hover:text-text"
                >
                  Login →
                </Link>
              ) : null}
            </div>
            <nav
              aria-label="Main terminal"
              className="flex flex-col gap-1 overflow-y-auto px-3 py-3"
            >
              {primaryNav.map((item) => {
                const active = isActive(item.label, pathname, focus);
                const Icon = ICONS[item.label] ?? BookOpen;
                return (
                  <Link
                    key={`m-${item.label}`}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={[
                      "flex items-center gap-3 rounded-[6px] px-3 py-3 font-mono text-[14px] uppercase tracking-[0.12em] transition-colors",
                      active
                        ? "bg-selected text-text"
                        : "text-text-muted hover:bg-surface-elevated hover:text-text",
                    ].join(" ")}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.5} aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
