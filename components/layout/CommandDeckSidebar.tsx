"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileSearch,
  FolderSearch,
  GraduationCap,
  MessageSquare,
  Search,
  User,
} from "lucide-react";
import { designTokens } from "@/lib/design-tokens";
import { primaryNav } from "@/lib/site-nav";

export type DeckUser = {
  displayName: string;
  publicId: string;
  rankLabel: string;
  status: "ACTIVE" | "SUSPENDED" | "GUEST";
} | null;

const ICONS: Record<string, typeof Search> = {
  Cases: BookOpen,
  Search,
  Evidence: FolderSearch,
  Intel: FileSearch,
  Forum: MessageSquare,
  Training: GraduationCap,
  Profile: User,
};

function isActive(label: string, pathname: string) {
  switch (label) {
    case "Cases":
      return pathname.startsWith("/cases");
    case "Training":
      return pathname.startsWith("/fictional") && !pathname.includes("rankings");
    case "Intel":
      return pathname.includes("rankings");
    case "Profile":
      return pathname.startsWith("/profile");
    case "Forum":
      return pathname.startsWith("/discussions");
    default:
      return false;
  }
}

export function CommandDeckSidebar({
  user,
  mobileOpen,
  onNavigate,
}: {
  user: DeckUser;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "";
  const guestUser = user ?? {
    displayName: "DETECTIVE",
    publicId: "DET-GUEST000",
    rankLabel: "NOVICE",
    status: "ACTIVE" as const,
  };

  const nav = (
    <nav aria-label="Main terminal" className="flex flex-col gap-1 px-2 pt-3 xl:px-3">
      {primaryNav.map((item) => {
        const active = isActive(item.label, pathname);
        const Icon = ICONS[item.label] ?? BookOpen;
        return (
          <Link
            key={`${item.index}-${item.label}`}
            href={item.href}
            onClick={onNavigate}
            title={`${item.index} ${item.label}`}
            className={[
              "group flex items-center gap-3 rounded-[6px] px-2.5 py-2.5 font-mono text-[13px] uppercase tracking-[0.12em] transition-colors xl:px-3 xl:py-3",
              active
                ? "bg-selected text-text"
                : "text-text-muted hover:bg-surface-elevated hover:text-text",
            ].join(" ")}
          >
            <Icon
              className="size-[18px] shrink-0 opacity-80"
              strokeWidth={active ? 1.75 : 1.4}
              aria-hidden
            />
            <span className="hidden min-w-0 flex-1 truncate xl:inline">
              <span className="mr-2 text-text-dim">{item.index}</span>
              {item.label}
            </span>
            {/* Tablet icon-rail label tooltip via title; show index on lg only as sr */}
            <span className="sr-only xl:hidden">
              {item.index} {item.label}
            </span>
            {active ? (
              <span className="ml-auto hidden text-text-dim xl:inline">&gt;</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const userBlock = (
    <div className="mt-auto border-t border-border px-3 py-4 xl:px-4">
      <p className="hidden font-mono text-[12px] uppercase tracking-[0.18em] text-text-dim xl:block">
        User
      </p>
      <div className="mt-0 space-y-1.5 font-mono text-[12px] uppercase tracking-[0.08em] xl:mt-3 xl:text-[13px]">
        <p className="hidden text-text xl:block">{guestUser.displayName}</p>
          <p className="hidden text-text-muted xl:block">
            <span className="text-text-dim">ID: </span>
            {guestUser.publicId}
          </p>
        <p className="hidden text-text-muted xl:block">
          <span className="text-text-dim">RANK: </span>
          {guestUser.rankLabel}
        </p>
        <p className="hidden xl:block">
          <span className="text-text-dim">STATUS: </span>
          <span
            className={
              guestUser.status === "ACTIVE" ? "text-online" : "text-text-muted"
            }
          >
            {guestUser.status}
          </span>
        </p>
        {/* Compact rail avatar */}
        <div className="flex justify-center xl:hidden">
          <span
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface-elevated text-[12px] text-online"
            title={`${guestUser.displayName} · ${guestUser.status}`}
          >
            D
          </span>
        </div>
      </div>
      {!user ? (
        <p className="mt-3 hidden font-mono text-[12px] uppercase tracking-[0.1em] text-text-dim xl:block">
          <Link href="/login" className="text-text-muted hover:text-text">
            Login →
          </Link>
        </p>
      ) : null}
      <p className="mt-4 hidden font-mono text-[12px] uppercase leading-relaxed tracking-[0.12em] text-text-dim xl:block">
        {designTokens.manifesto.join(" ")}
      </p>
    </div>
  );

  const fullBody = (
    <>
      {nav}
      {userBlock}
    </>
  );

  return (
    <>
      {/* Tablet icon rail 1024–1279; full sidebar ≥1280 */}
      <aside className="hidden w-[var(--sidebar-rail)] shrink-0 flex-col border-r border-border bg-surface/40 md:flex xl:w-[var(--sidebar-w)]">
        {fullBody}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu overlay"
            onClick={onNavigate}
          />
          <div className="relative z-10 flex h-full w-[min(300px,88vw)] flex-col border-r border-border bg-bg shadow-2xl">
            <div className="border-b border-border px-4 py-4">
              <p className="font-mono text-[16px] font-semibold tracking-[0.12em] text-text">
                {designTokens.brand}
              </p>
              <p className="mt-1 font-mono text-[12px] uppercase tracking-[0.1em] text-text-muted">
                {designTokens.tagline}
              </p>
            </div>
            <nav aria-label="Main terminal" className="flex flex-col gap-1 px-3 pt-3">
              {primaryNav.map((item) => {
                const active = isActive(item.label, pathname);
                const Icon = ICONS[item.label] ?? BookOpen;
                return (
                  <Link
                    key={`m-${item.index}-${item.label}`}
                    href={item.href}
                    onClick={onNavigate}
                    className={[
                      "flex items-center gap-3 rounded-[6px] px-3 py-3 font-mono text-[14px] uppercase tracking-[0.12em] transition-colors",
                      active
                        ? "bg-selected text-text"
                        : "text-text-muted hover:bg-surface-elevated hover:text-text",
                    ].join(" ")}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.5} aria-hidden />
                    <span>
                      <span className="mr-2 text-text-dim">{item.index}</span>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-border px-4 py-5">
              <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-text-dim">
                User
              </p>
              <div className="mt-3 space-y-1.5 font-mono text-[13px] uppercase tracking-[0.08em]">
                <p className="text-text">{guestUser.displayName}</p>
                <p className="text-text-muted">ID: {guestUser.publicId}</p>
                <p className="text-text-muted">RANK: {guestUser.rankLabel}</p>
                <p>
                  STATUS:{" "}
                  <span className="text-online">{guestUser.status}</span>
                </p>
              </div>
              <p className="mt-5 font-mono text-[12px] uppercase leading-relaxed tracking-[0.12em] text-text-dim">
                {designTokens.manifesto.join(" ")}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
