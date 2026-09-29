"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/cases", label: "Cases", match: /^\/cases/ },
  { href: "/cases?focus=search", label: "Search", match: /^\/cases\?.*focus=search/ },
  { href: "/fictional", label: "Training", match: /^\/fictional/ },
  { href: "/fictional/rankings", label: "Intel", match: /^\/fictional\/rankings/ },
  { href: "/profile", label: "Profile", match: /^\/profile/ },
] as const;

/** Mobile HUD bottom nav — design-refs/mobile.jpg density. */
export function MobileBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur-sm md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active =
            item.label === "Search"
              ? false
              : item.match.test(pathname);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={[
                  "flex flex-col items-center justify-center gap-0.5 px-1 py-2 font-mono text-[8px] uppercase tracking-[0.14em]",
                  active ? "text-text" : "text-text-dim",
                ].join(" ")}
              >
                <span
                  className={[
                    "block h-px w-4",
                    active ? "bg-online" : "bg-border-strong",
                  ].join(" ")}
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
