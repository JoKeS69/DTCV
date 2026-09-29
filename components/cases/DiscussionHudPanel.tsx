import Link from "next/link";

export type HudDiscussion = {
  id: string;
  title: string;
  createdAt: Date;
  authorUsername: string;
  commentCount: number;
};

export function DiscussionHudPanel({
  caseCode,
  caseSlug,
  discussions,
}: {
  caseCode: string | null;
  caseSlug: string | null;
  discussions: HudDiscussion[];
}) {
  return (
    <section className="flex h-full min-h-[200px] flex-col border border-border bg-bg">
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
        <span>
          &gt; Discussion
          {caseCode ? ` (CASE ${caseCode})` : ""}
        </span>
        {caseSlug ? (
          <Link
            href={`/cases/${caseSlug}`}
            className="text-text-muted hover:text-text"
          >
            View all →
          </Link>
        ) : null}
      </header>
      <ul className="flex-1 divide-y divide-border/80 overflow-y-auto">
        {discussions.length === 0 ? (
          <li className="px-3 py-4 font-mono text-[10px] text-text-dim">
            No discussions on this file yet
          </li>
        ) : (
          discussions.map((d) => (
            <li key={d.id} className="px-3 py-2">
              <Link href={`/discussions/${d.id}`} className="block hover:bg-surface">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[8px] text-text-dim"
                    aria-hidden
                  >
                    {d.authorUsername.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] text-text">
                    {d.authorUsername}
                  </span>
                  <span className="font-mono text-[9px] text-text-dim">
                    {d.createdAt instanceof Date
                      ? d.createdAt.toISOString().slice(0, 10)
                      : String(d.createdAt).slice(0, 10)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-text-muted normal-case tracking-normal">
                  {d.title}
                </p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-text-dim">
                  {d.commentCount} replies
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
