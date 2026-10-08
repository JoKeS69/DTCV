import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { FictionalBanner } from "@/components/fictional/FictionalBanner";
import { listPublishedFictionalCases } from "@/lib/fictional/queries";
import { listPublishedInvestigationCards } from "@/lib/investigation/queries";
import { getPrisma } from "@/lib/db";
import { getUserEntitlements } from "@/lib/payments/entitlements";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Fictional cases",
  description:
    "FICTIONAL Investigation Mode and training cases. Invented scenarios only — never real crimes.",
  path: "/fictional",
});

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ page?: string }>;

export default async function FictionalListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const session = await auth();

  let investigationCards: Awaited<
    ReturnType<typeof listPublishedInvestigationCards>
  > = [];
  let investigationLoadError = false;
  try {
    investigationCards = await listPublishedInvestigationCards();
  } catch {
    investigationCards = [];
    investigationLoadError = true;
  }

  const result = await listPublishedFictionalCases({ page });
  const cases = result.items;
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : null;

  const progress =
    session?.user?.id && cases.length
      ? await getPrisma().investigation.findMany({
          where: {
            userId: session.user.id,
            target: "FICTIONAL_CASE",
            fictionalCaseId: { in: cases.map((c) => c.id) },
          },
          select: {
            fictionalCaseId: true,
            status: true,
            submission: { select: { scoreTotal: true } },
          },
        })
      : [];

  const byCase = new Map(
    progress.map((p) => [p.fictionalCaseId, p] as const),
  );

  return (
    <main className="deck-page">
      <div className="hud-panel motion-fade-up">
        <div className="hud-panel-body">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          &gt; Simulation · fictional cases
        </p>
        <h1 className="mt-1 font-display text-xl font-semibold uppercase tracking-[0.08em] text-text md:text-2xl">
          Fictional case files
        </h1>
        <p className="mt-2 max-w-2xl font-mono text-[13px] text-text-muted normal-case tracking-normal">
          Invented Investigation Mode whodunits and theory drills — never
          real-crime cases. Fictional game only.
        </p>
        <div className="mt-3">
          <FictionalBanner />
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
          <Link href="/fictional/challenges" className="hover:text-text">
            Premium challenges
          </Link>
          {" · "}
          <Link href="/pricing" className="hover:text-text">
            Pricing
          </Link>
          {entitlements?.hasFictionalAccess
            ? ` · ${entitlements.label.toUpperCase()}`
            : " · LOCKED"}
        </p>
        </div>
      </div>

      <section className="mt-5">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          Investigation Mode
        </h2>
        <p className="mt-1 font-mono text-[12px] text-text-muted normal-case tracking-normal">
          Whodunit game — dossiers, scenes, interrogation, evidence board,
          accusation.
        </p>
        {investigationLoadError ? (
          <p className="mt-3 border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-[11px] text-danger" role="alert">
            Investigation Mode database unavailable. Check CASES_DATABASE_URL and
            run cases migrations (`npm run db:deploy:cases:safe` with BACKUP_OK=1)
            — this is not an empty catalog.
          </p>
        ) : investigationCards.length === 0 ? (
          <p className="mt-3 font-mono text-[11px] text-text-dim">
            No Investigation Mode cases published yet. PB CASE admins can
            generate/seed from /pb-case (right panel).
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {investigationCards.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/fictional/investigate/${item.slug}`}
                  className="block border border-[#1e4a55]/70 bg-[#0a1622]/80 px-4 py-3 transition-colors hover:border-[#3d9e90]"
                >
                  <p className="font-mono text-[10px] tracking-[0.18em] text-[#3ecfcf]">
                    WHODUNIT · FICTIONAL
                    {item.darkerTheme ? " · DARK TERMINAL" : ""}
                  </p>
                  <h3 className="mt-1 font-mono text-base font-semibold uppercase tracking-[0.08em] text-text">
                    {item.title}
                  </h3>
                  <p className="mt-2 font-mono text-[12px] leading-relaxed text-text-muted normal-case tracking-normal line-clamp-2">
                    {item.teaser}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
                    Victim: {item.victims.join(", ") || "—"}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                    {!item.playerStatus || item.playerStatus === "unsolved" ? (
                      <span className="text-amber">
                        {item.wrongAccusations
                          ? `Unsolved · ${item.wrongAccusations} wrong`
                          : "Unsolved"}
                      </span>
                    ) : item.playerStatus === "solved_first_try" ? (
                      <span className="text-online">Solved · first try</span>
                    ) : (
                      <span className="text-online">
                        Solved · after {item.wrongAccusations} wrong
                      </span>
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
          Theory drills
        </h2>
        <p className="mt-1 font-mono text-[12px] text-text-muted normal-case tracking-normal">
          Classic submit-theory files ({result.total}) · page {result.page}/
          {result.totalPages}
        </p>
        <ul className="mt-3 space-y-3">
          {cases.map((item) => {
            const state = byCase.get(item.id);
            return (
              <li key={item.id}>
                <Link
                  href={`/fictional/${item.slug}`}
                  className="block border border-border bg-surface/40 px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface/70"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.18em] text-text-dim">
                        FICTIONAL · {item.difficulty}
                      </p>
                      <h3 className="mt-1 font-mono text-base font-semibold uppercase tracking-[0.08em] text-text">
                        {item.title}
                      </h3>
                      <p className="mt-2 max-w-2xl font-mono text-[12px] leading-relaxed text-text-muted normal-case tracking-normal line-clamp-2">
                        {item.synopsis}
                      </p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
                        {item.estimatedMinutes ?? "—"} min ·{" "}
                        {item._count.suspects} suspects · {item._count.evidence}{" "}
                        evidence · {item._count.witnessStatements} witnesses
                      </p>
                    </div>
                    <div className="text-right font-mono text-[10px] uppercase tracking-[0.14em]">
                      {state?.status === "SUBMITTED" ? (
                        <span className="text-online">
                          Scored {state.submission?.scoreTotal ?? "—"}/100
                        </span>
                      ) : state ? (
                        <span className="text-amber">In progress</span>
                      ) : (
                        <span className="text-text-dim">Not started</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em]">
          {page > 1 ? (
            <Link
              href={`/fictional?page=${page - 1}`}
              className="text-text-muted hover:text-text"
            >
              ← Prev
            </Link>
          ) : (
            <span className="text-text-dim">← Prev</span>
          )}
          <span className="text-text-dim">
            Page {result.page} / {result.totalPages}
          </span>
          {page < result.totalPages ? (
            <Link
              href={`/fictional?page=${page + 1}`}
              className="text-text-muted hover:text-text"
            >
              Next →
            </Link>
          ) : (
            <span className="text-text-dim">Next →</span>
          )}
        </div>
      </section>
    </main>
  );
}
