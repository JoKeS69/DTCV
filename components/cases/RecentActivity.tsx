import Link from "next/link";
import type { HudActivity } from "@/lib/cases/hud-data";

export function RecentActivity({ items }: { items: HudActivity[] }) {
  return (
    <section className="hud-panel flex h-full min-h-[200px] flex-col">
      <header className="hud-panel-title">&gt; RECENT ACTIVITY</header>
      <ul className="min-h-0 flex-1 divide-y divide-border/80 overflow-y-auto">
        {items.map((item) => {
          const body = (
            <div className="flex items-start gap-2.5 px-2.5 py-2 font-mono text-[10px]">
              <span className="shrink-0 tabular-nums text-text-dim">{item.time}</span>
              <span className="min-w-0 flex-1 text-text-muted normal-case tracking-normal">
                {item.text}
              </span>
              <span className="shrink-0 text-text-dim">&gt;</span>
            </div>
          );
          return (
            <li key={item.id}>
              {item.href ? (
                <Link href={item.href} className="block hover:bg-surface">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
