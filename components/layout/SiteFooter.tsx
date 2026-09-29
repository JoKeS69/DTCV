import Link from "next/link";
import { designTokens } from "@/lib/design-tokens";
import { footerNav } from "@/lib/site-nav";

export function SiteFooter({
  activeCaseFiles,
}: {
  /** Optional published case count for HUD status bar */
  activeCaseFiles?: number;
}) {
  const countLabel =
    typeof activeCaseFiles === "number"
      ? `${activeCaseFiles.toLocaleString("en-US")} ACTIVE CASE FILES`
      : "FOUNDATION ONLINE";

  return (
    <footer className="mt-auto border-t border-border bg-bg pb-14 md:pb-0">
      <div className="grid gap-6 border-b border-border px-3 py-6 md:grid-cols-[1.2fr_1fr] md:px-4">
        <div>
          <p className="font-mono text-[12px] font-semibold tracking-[0.18em] text-text">
            {designTokens.brand}
          </p>
          <ul className="mt-3 space-y-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
            {designTokens.manifesto.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 md:justify-end">
          {footerNav.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted hover:text-text"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim md:px-4">
        <p className="text-online">
          <span className="mr-2 inline-block size-1.5 rounded-full bg-online align-middle motion-pulse-online" />
          SYSTEM MESSAGE: DATABASE CONNECTION SECURE // {countLabel}
        </p>
        <p className="text-text-muted">&gt;_</p>
      </div>
    </footer>
  );
}
