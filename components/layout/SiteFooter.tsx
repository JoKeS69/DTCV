import Link from "next/link";
import { designTokens } from "@/lib/design-tokens";
import { footerNav } from "@/lib/site-nav";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr] md:px-6">
        <div>
          <p className="font-mono text-sm font-semibold tracking-[0.22em] text-text">
            {designTokens.brand}
          </p>
          <p className="mt-2 max-w-sm font-sans text-sm leading-relaxed text-text-muted">
            A global investigation platform for sourced real cases, community
            discussion, and fictional training — built for serious inquiry.
          </p>
          <ul className="mt-6 space-y-1 font-mono text-[11px] uppercase tracking-[0.2em] text-text-dim">
            {designTokens.manifesto.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="md:justify-self-end">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
            Navigate
          </p>
          <ul className="mt-4 space-y-2">
            {footerNav.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="font-mono text-xs uppercase tracking-[0.18em] text-text-muted transition-colors hover:text-text"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p className="text-online">
            <span className="mr-2 inline-block size-1.5 bg-online align-middle motion-pulse-online" />
            Database connection secure // foundation online
          </p>
          <p>&gt;_ DETECTIVE · Phase 1 visual</p>
        </div>
      </div>
    </footer>
  );
}
