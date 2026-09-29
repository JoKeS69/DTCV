"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Mobile mockup bottom nav — CASES / SEARCH / EVIDENCE / DISCUSSIONS / PROFILE */
const items = [
  { href: "/cases", label: "Cases", match: (p: string) => p.startsWith("/cases") },
  { href: "/cases?focus=search", label: "Search", match: () => false },
  { href: "/cases", label: "Evidence", match: () => false },
  {
    href: "/cases",
    label: "Discussions",
    match: (p: string) => p.startsWith("/discussions"),
  },
  {
    href: "/profile",
    label: "Profile",
    match: (p: string) => p.startsWith("/profile"),
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={[
                  "flex flex-col items-center justify-center gap-1 px-1 py-2.5 font-mono text-[8px] uppercase tracking-[0.12em]",
                  active ? "text-text" : "text-text-dim",
                ].join(" ")}
              >
                <span
                  className={[
                    "block size-1 rounded-full",
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
