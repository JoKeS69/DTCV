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

  const body = (
    <>
      <p className="px-3 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-text-dim">
        &gt; Main terminal
      </p>
      <nav aria-label="Main terminal" className="flex flex-col">
        {primaryNav.map((item) => {
          const active =
            item.label === "Cases"
              ? pathname.startsWith("/cases")
              : item.label === "Training"
                ? pathname.startsWith("/fictional") &&
                  !pathname.includes("rankings")
                : item.label === "Intel"
                  ? pathname.includes("rankings")
                  : item.label === "Profile"
                    ? pathname.startsWith("/profile")
                    : item.label === "Forum"
                      ? pathname.startsWith("/discussions")
                      : false;
          return (
            <Link
              key={`${item.index}-${item.label}`}
              href={item.href}
              onClick={onNavigate}
              className={[
                "flex items-center justify-between px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]",
                active
                  ? "bg-surface-elevated text-text"
                  : "text-text-muted hover:bg-surface hover:text-text",
              ].join(" ")}
            >
              <span>
                <span className="mr-2 text-text-dim">{item.index}</span>
                {item.label}
              </span>
              {active ? <span className="text-text-dim">&gt;</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-border px-3 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-dim">
          User
        </p>
        {user ? (
          <dl className="mt-2 space-y-1 font-mono text-[10px] uppercase tracking-[0.12em]">
            <div className="flex justify-between gap-2">
              <dt className="text-text-dim"> </dt>
              <dd className="text-text">{user.displayName}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-dim">ID</dt>
              <dd className="text-text">
                {user.badgeNumber != null
                  ? String(user.badgeNumber).padStart(6, "0")
                  : "————"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-dim">Rank</dt>
              <dd className="text-text">{user.rankLabel}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-text-dim">Status</dt>
              <dd
                className={
                  user.status === "ACTIVE" ? "text-online" : "text-text-muted"
                }
              >
                {user.status}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
            Guest ·{" "}
            <Link href="/login" className="text-text hover:underline">
              Login
            </Link>
          </p>
        )}
      </div>

      <ul className="mt-auto space-y-0.5 border-t border-border px-3 py-3 font-mono text-[9px] uppercase tracking-[0.18em] text-text-dim">
        {designTokens.manifesto.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </>
  );

  return (
    <>
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-border bg-bg md:flex">
        {body}
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-bg/95 md:hidden">
          <div className="flex h-full w-[260px] flex-col border-r border-border bg-bg">
            {body}
          </div>
        </div>
      ) : null}
    </>
  );
}
