"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  FileText,
  Home,
  MessageSquare,
  Search,
  User,
} from "lucide-react";

const items = [
  {
    href: "/cases",
    label: "Cases",
    icon: Home,
    match: (p: string, focus: string | null) =>
      p.startsWith("/cases") &&
      focus !== "search" &&
      focus !== "discussions" &&
      focus !== "evidence",
  },
  {
    href: "/cases?focus=search",
    label: "Search",
    icon: Search,
    match: (_p: string, focus: string | null) => focus === "search",
  },
  {
    href: "/cases?focus=evidence",
    label: "Evidence",
    icon: FileText,
    match: (_p: string, focus: string | null) => focus === "evidence",
  },
  {
    href: "/cases?focus=discussions&select=25-00217",
    label: "Discussions",
    icon: MessageSquare,
    match: (p: string, focus: string | null) =>
      p.startsWith("/discussions") || focus === "discussions",
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    match: (p: string) => p.startsWith("/profile"),
  },
] as const;

export function BottomNavigation() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const focus = searchParams?.get("focus") ?? null;

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur-sm md:hidden"
      style={{
        height: "calc(var(--bottom-nav) + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul className="grid h-[var(--bottom-nav)] grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname, focus);
          const Icon = item.icon;
          return (
            <li key={item.label} className="min-w-0">
              <Link
                href={item.href}
                className={[
                  "flex h-full flex-col items-center justify-center gap-1 px-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
                  active ? "text-text" : "text-text-dim",
                ].join(" ")}
              >
                <Icon
                  className="size-5"
                  strokeWidth={active ? 1.85 : 1.4}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
