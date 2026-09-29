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
      p.startsWith("/cases") && focus !== "search" && !p.includes("discussions"),
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname, focus);
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={[
                  "flex flex-col items-center justify-center gap-1 px-1 py-2.5 font-mono text-[8px] uppercase tracking-[0.12em]",
                  active ? "text-text" : "text-text-dim",
                ].join(" ")}
              >
                <Icon
                  className="size-4"
                  strokeWidth={active ? 1.75 : 1.25}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
