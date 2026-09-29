"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { designTokens } from "@/lib/design-tokens";
import { primaryNav } from "@/lib/site-nav";

export type DeckUser = {
  displayName: string;
  badgeNumber: number | null;
  rankLabel: string;
  status: "ACTIVE" | "SUSPENDED" | "GUEST";
} | null;

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
  const demoUser = user ?? {
    displayName: "DETECTIVE",
    badgeNumber: 8421,
    rankLabel: "NOVICE",
    status: "ACTIVE" as const,
  };

  const body = (
    <>
      <nav aria-label="Main terminal" className="flex flex-col pt-1">
        {primaryNav.map((item) => {
          const active = isActive(item.label, pathname);
          return (
            <Link
              key={`${item.index}-${item.label}`}
              href={item.href}
              onClick={onNavigate}
              className={[
                "flex items-center justify-between px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors",
                active
                  ? "bg-selected text-text"
                  : "text-text-muted hover:bg-surface hover:text-text",
              ].join(" ")}
            >
              <span>
                <span className="mr-2.5 text-text-dim">{item.index}</span>
                {item.label}
              </span>
              {active ? <span className="text-text-dim">&gt;</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 border-t border-border px-3 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-text-dim">
          User
        </p>
        <div className="mt-2 space-y-1 font-mono text-[10px] uppercase tracking-[0.12em]">
          <p className="text-text">{demoUser.displayName}</p>
          <p className="text-text-muted">
            <span className="text-text-dim">ID: </span>
            {demoUser.badgeNumber != null
              ? String(demoUser.badgeNumber).padStart(6, "0")
              : "008421"}
          </p>
          <p className="text-text-muted">
            <span className="text-text-dim">RANK: </span>
            {demoUser.rankLabel}
          </p>
          <p>
            <span className="text-text-dim">STATUS: </span>
            <span
              className={
                demoUser.status === "ACTIVE" ? "text-online" : "text-text-muted"
              }
            >
              {demoUser.status}
            </span>
          </p>
        </div>
        {!user ? (
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
            <Link href="/login" className="text-text-muted hover:text-text">
              Login →
            </Link>
          </p>
        ) : null}
      </div>

      <p className="mt-auto border-t border-border px-3 py-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.16em] text-text-dim">
        {designTokens.manifesto.join(" ")}
      </p>
    </>
  );

  return (
    <>
      <aside className="hidden w-[188px] shrink-0 flex-col border-r border-border bg-bg md:flex">
        {body}
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu overlay"
            onClick={onNavigate}
          />
          <div className="relative z-10 flex h-full w-[min(280px,85vw)] flex-col border-r border-border bg-bg">
            {body}
          </div>
        </div>
      ) : null}
    </>
  );
}
