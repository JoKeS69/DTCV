import Link from "next/link";

export function InvestigationHistory({
  items,
}: {
  items: {
    id: string;
    status: string;
    startedAt: Date | string;
    submittedAt: Date | string | null;
    fictionalCase: {
      caseCode: string;
      title: string;
      slug: string;
      difficulty: string;
    } | null;
    submission: { scoreTotal: number; xpAwarded: number } | null;
  }[];
}) {
  if (items.length === 0) {
    return (
      <p className="font-mono text-[13px] text-text-dim">
        No investigations yet.{" "}
        <Link href="/fictional" className="text-cta hover:underline">
          Training →
        </Link>
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        if (!item.fictionalCase) return null;
        const href =
          item.status === "SUBMITTED"
            ? `/fictional/${item.fictionalCase.slug}/result`
            : `/fictional/${item.fictionalCase.slug}`;
        return (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 border border-border/80 px-3 py-2"
          >
            <div>
              <Link
                href={href}
                className="font-mono text-[11px] uppercase tracking-[0.12em] text-text hover:text-cta"
              >
                {item.fictionalCase.title}
              </Link>
              <p className="mt-1 font-mono text-[10px] text-text-dim">
                {item.fictionalCase.difficulty} · {item.status}
                {item.submission
                  ? ` · score ${item.submission.scoreTotal} · +${item.submission.xpAwarded} XP`
                  : null}
              </p>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
              {item.status === "SUBMITTED" ? "Result" : "Continue"} →
            </span>
          </li>
        );
      })}
    </ul>
  );
}
