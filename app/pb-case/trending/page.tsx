import { CandidateActions } from "@/components/pb-case/CandidateActions";
import { PbCaseShell } from "@/components/pb-case/PbCaseShell";
import { getCasesPrisma } from "@/lib/cases-db";

export const dynamic = "force-dynamic";

export default async function PbCaseTrendingPage() {
  let rows: Awaited<
    ReturnType<ReturnType<typeof getCasesPrisma>["candidate"]["findMany"]>
  > = [];
  let err: string | null = null;
  try {
    rows = await getCasesPrisma().candidate.findMany({
      where: { status: "new" },
      orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
      take: 100,
    });
  } catch (e) {
    err = e instanceof Error ? e.message : "db_error";
  }

  return (
    <PbCaseShell
      title="Trending inbox"
      subtitle="Candidates only — no deep research or publish until you accept."
      current="/pb-case/trending"
    >
      {err ? (
        <p className="font-mono text-[11px] text-danger">{err}</p>
      ) : rows.length === 0 ? (
        <p className="font-mono text-[11px] text-text-dim">
          Inbox empty. Cron: GET /api/cron/trending-discovery
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-start justify-between gap-3 border border-border p-3"
            >
              <div>
                <p className="font-mono text-[12px] text-text">{r.title}</p>
                <p className="mt-1 font-mono text-[10px] text-text-muted">
                  {r.rationale}
                </p>
                <p className="mt-1 font-mono text-[9px] text-text-dim">
                  score {r.score}
                </p>
              </div>
              <CandidateActions id={r.id} />
            </li>
          ))}
        </ul>
      )}
    </PbCaseShell>
  );
}
