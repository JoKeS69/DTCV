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
    <nav className="flex flex-wrap gap-2 border border-border bg-surface/50 p-2">
      {LINKS.map((item) => {
        const active =
          item.href === "/pb-case"
            ? current === "/pb-case" || current.startsWith("/pb-case/cases")
            : current.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`font-mono text-[10px] uppercase tracking-[0.16em] px-2 py-1 transition-colors ${
              active
                ? "bg-selected text-accent shadow-[inset_2px_0_0_0_var(--accent)]"
                : "text-text-muted hover:text-text hover:bg-surface-elevated"
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            &gt; PB-CASE · research desk · noindex
          </p>
          <h1 className="mt-1 font-display text-xl font-semibold uppercase tracking-[0.1em] text-text md:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl font-mono text-[11px] text-text-muted normal-case tracking-normal">
              {subtitle}
            </p>
          ) : null}
        </div>
        <Link
          href="/"
          className="shrink-0 border border-cta bg-cta px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cta-text hover:brightness-95"
        >
          ← Home
        </Link>
      </div>
      <div className="mt-4">
        <PbCaseNav current={current} />
      </div>
      <div className="mt-4">{children}</div>
    </main>
  );
}
