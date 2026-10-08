"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  Trophy,
  User,
} from "lucide-react";
import { mobileNav } from "@/lib/site-nav";

const ICONS = {
  Cases: BookOpen,
  Fictional: GraduationCap,
  Intel: Trophy,
  Billing: CreditCard,
  Profile: User,
} as const;

export function BottomNavigation() {
  const pathname = usePathname() ?? "";

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
        {mobileNav.map((item) => {
          const active = item.match(pathname);
          const Icon = ICONS[item.label as keyof typeof ICONS] ?? BookOpen;
          return (
            <li key={item.label} className="min-w-0">
              <Link
                href={item.href}
                className={[
                  "flex h-full flex-col items-center justify-center gap-1 px-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors",
                  active
                    ? "text-accent shadow-[inset_0_2px_0_0_var(--accent)]"
                    : "text-text-dim",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
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
