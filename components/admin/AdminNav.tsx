import Link from "next/link";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/cases", label: "Real cases" },
  { href: "/admin/fictional", label: "Fictional" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/analytics", label: "Analytics" },
] as const;

export function AdminNav({ current }: { current?: string }) {
  return (
    <nav className="flex flex-wrap gap-1 border border-border bg-surface/60 p-2">
      {links.map((link) => {
        const active =
          current === link.href ||
          (link.href !== "/admin" && current?.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={[
              "border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]",
              active
                ? "border-cta/50 bg-cta/15 text-text"
                : "border-transparent text-text-dim hover:border-border hover:text-text",
            ].join(" ")}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
