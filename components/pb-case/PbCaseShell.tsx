import Link from "next/link";

const LINKS = [
  { href: "/pb-case", label: "Cases" },
  { href: "/pb-case/trending", label: "Trending" },
  { href: "/pb-case/labels", label: "Labels" },
  { href: "/pb-case/takedowns", label: "Takedowns" },
  { href: "/pb-case/audit", label: "Audit" },
] as const;

export function PbCaseNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-2 border border-border bg-surface/40 p-2">
      {LINKS.map((item) => {
        const active =
          item.href === "/pb-case"
            ? current === "/pb-case" || current.startsWith("/pb-case/cases")
            : current.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`font-mono text-[10px] uppercase tracking-[0.16em] px-2 py-1 ${
              active
                ? "bg-accent/20 text-text"
                : "text-text-muted hover:text-text"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PbCaseShell({
  title,
  subtitle,
  current,
  children,
}: {
  title: string;
  subtitle?: string;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-6xl px-3 py-6 md:px-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
        &gt; PB-CASE · research desk · noindex
      </p>
      <h1 className="mt-1 font-mono text-xl font-semibold uppercase tracking-[0.1em] text-text md:text-2xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-2xl font-mono text-[11px] text-text-muted normal-case tracking-normal">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-4">
        <PbCaseNav current={current} />
      </div>
      <div className="mt-4">{children}</div>
    </main>
  );
}
