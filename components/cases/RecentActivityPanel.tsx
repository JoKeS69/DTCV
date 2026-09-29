import Link from "next/link";
import type { ActivityItem } from "@/lib/cases/dashboard";
import { formatDateTime } from "@/lib/format-date";

function timeOnly(value: Date | string) {
  const iso = formatDateTime(value, "");
  if (!iso) return "—";
  return iso.slice(11, 19);
}

export function RecentActivityPanel({ items }: { items: ActivityItem[] }) {
  return (
    <section className="flex h-full min-h-[200px] flex-col border border-border bg-bg">
      <header className="border-b border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
        &gt; Recent activity
      </header>
      <ul className="flex-1 divide-y divide-border/80 overflow-y-auto">
        {items.length === 0 ? (
          <li className="px-3 py-4 font-mono text-[10px] text-text-dim">
            No recent activity
          </li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex items-start gap-2 px-3 py-2 font-mono text-[10px] hover:bg-surface"
                >
                  <span className="shrink-0 text-text-dim">
                    {timeOnly(item.at)}
                  </span>
                  <span className="min-w-0 flex-1 text-text-muted normal-case tracking-normal">
                    {item.text}
                  </span>
                  <span className="text-text-dim">&gt;</span>
                </Link>
              ) : (
                <div className="flex items-start gap-2 px-3 py-2 font-mono text-[10px]">
                  <span className="shrink-0 text-text-dim">
                    {timeOnly(item.at)}
                  </span>
                  <span className="text-text-muted normal-case tracking-normal">
                    {item.text}
                  </span>
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
