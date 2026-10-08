"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  FileSearch,
  GraduationCap,
  Menu,
  Shield,
  User,
  X,
} from "lucide-react";
import type { DeckUser } from "@/components/layout/deck-user";
import { primaryNav } from "@/lib/site-nav";

const ICONS: Record<string, typeof BookOpen> = {
  Cases: BookOpen,
  Intel: FileSearch,
  "Fictional cases": GraduationCap,
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

function isActive(label: string, pathname: string) {
  switch (label) {
    case "Cases":
      return pathname.startsWith("/cases");
    case "Fictional cases":
      return pathname.startsWith("/fictional") && !pathname.includes("rankings");
    case "Intel":
      return pathname.includes("rankings");
    case "Profile":
      return pathname.startsWith("/profile");
    default:
      return false;
  }
}

function AdminBadge({
  canAccessPbCase,
  username,
}: {
  canAccessPbCase: boolean;
  username?: string;
}) {
  const chipClass =
    "relative z-20 inline-flex min-h-10 min-w-10 cursor-pointer items-center gap-1.5 rounded-[2px] border border-border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted pointer-events-auto transition-colors hover:border-accent/50 hover:bg-selected hover:text-accent";
  const icon = <Shield className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />;

  if (canAccessPbCase) {
    return (
      <div className="relative z-20 flex items-center gap-1.5 pointer-events-auto">
        <Link
          href="/pb-case"
          className={chipClass}
          aria-label="PB CASE admin research desk"
          title="PB CASE · research desk"
        >
          {icon}
          <span>PB CASE</span>
        </Link>
        <Link
          href="/admin"
          className={chipClass}
          aria-label="Ops admin console"
          title="Admin · ops console"
        >
          <span>Admin</span>
        </Link>
      </div>
    );
  }

  // ADMIN role without PB CASE username gate — still reach /admin.
  const lockedHint = username
    ? `Ops console · research desk locked (signed in as ${username})`
    : "Ops console · research desk locked for this account";

  return (
    <Link
      href="/admin"
      className={chipClass}
      aria-label="Ops admin console"
      title={lockedHint}
    >
      {icon}
      <span>Admin</span>
    </Link>
  );
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState("");

  const guestUser = user ?? {
    displayName: "DETECTIVE",
    publicId: "DET-GUEST000",
    rankLabel: "NOVICE",
    status: "ACTIVE" as const,
    role: "USER" as const,
    canAccessPbCase: false,
  };
  const isAdmin = user?.role === "ADMIN";
  const canAccessPbCase = user?.canAccessPbCase === true;
  const adminUsername = user?.username;

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
      "relative inline-flex items-center gap-1.5 rounded-[2px] px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors xl:gap-2 xl:px-3 xl:text-[12px]",
      active
        ? "bg-selected text-accent shadow-[inset_2px_0_0_0_var(--accent)]"
        : "text-text-muted hover:bg-surface-elevated hover:text-text",
    ].join(" ");

  return (
    <>
      <header className="relative z-20 shrink-0 border-b border-border bg-bg/95 pointer-events-auto backdrop-blur-sm">
        {/* Desktop / tablet — single topmost nav row, links truly centered */}
        <div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-5 py-3 md:grid xl:gap-6 xl:px-8 xl:py-3.5">
          <div className="relative z-20 flex min-w-0 items-center gap-3 justify-self-start">
            <Link
              href="/cases"
              className="shrink-0 font-display text-[14px] font-semibold tracking-[0.14em] text-text xl:text-[15px]"
            >
              CASE<span className="text-accent">{"//"}</span>NET
            </Link>
            {isAdmin ? (
              <AdminBadge
                canAccessPbCase={canAccessPbCase}
                username={adminUsername}
              />
            ) : null}
            <span className="hidden h-6 w-px bg-border lg:block" aria-hidden />
            <div className="hidden min-w-0 lg:block">
              <UserChip user={guestUser} />
            </div>
          </div>

          <nav
            aria-label="Main terminal"
            className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 justify-self-center xl:gap-x-3"
          >
            {primaryNav.map((item) => {
              const active = isActive(item.label, pathname);
              const Icon = ICONS[item.label] ?? BookOpen;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={navLinkClass(active)}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className="size-3.5 shrink-0 opacity-80 xl:size-4"
                    strokeWidth={active ? 1.75 : 1.4}
                    aria-hidden
                  />
                  <span>{item.label}</span>
                  {active ? (
                    <span className="text-accent/70" aria-hidden>
                      &gt;
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 flex-col items-end gap-1 justify-self-end">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted">
              <span className="text-text-dim">System</span>
              <span className="text-online">Online</span>
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
          <div className="relative z-20 flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-[2px] text-text transition-colors hover:bg-surface"
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
            {isAdmin ? (
              <AdminBadge
                canAccessPbCase={canAccessPbCase}
                username={adminUsername}
              />
            ) : null}
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
          <div className="relative z-10 mx-3 mt-3 flex max-h-[85vh] flex-col rounded-[2px] border border-border bg-bg shadow-2xl">
            <div className="border-b border-border px-4 py-4">
              <p className="font-mono text-[13px] font-semibold tracking-[0.12em] text-text">
                CASE<span className="text-accent">{"//"}</span>NET
              </p>
              <div className="mt-3 flex items-center gap-2.5">
                {isAdmin ? (
                  <AdminBadge
                    canAccessPbCase={canAccessPbCase}
                    username={adminUsername}
                  />
                ) : null}
                <UserChip user={guestUser} />
              </div>
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
                const active = isActive(item.label, pathname);
                const Icon = ICONS[item.label] ?? BookOpen;
                return (
                  <Link
                    key={`m-${item.label}`}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={[
                      "flex items-center gap-3 rounded-[2px] px-3 py-3 font-mono text-[14px] uppercase tracking-[0.12em] transition-colors",
                      active
                        ? "bg-selected text-accent shadow-[inset_2px_0_0_0_var(--accent)]"
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
