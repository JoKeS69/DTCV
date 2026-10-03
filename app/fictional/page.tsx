import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { FictionalBanner } from "@/components/fictional/FictionalBanner";
import { listPublishedFictionalCases } from "@/lib/fictional/queries";
import { getPrisma } from "@/lib/db";
import {
  fictionalRequiresPremium,
  getUserEntitlements,
} from "@/lib/payments/entitlements";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Fictional ops",
  description:
    "FICTIONAL training cases for detective progression. Invented scenarios only — never real crimes.",
  path: "/fictional",
});

type SearchParams = Promise<{ page?: string }>;

export default async function FictionalListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const session = await auth();
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
      <div className="border border-border bg-surface/50 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim">
          &gt; Training bay
        </p>
        <h1 className="mt-1 font-mono text-xl font-semibold uppercase tracking-[0.1em] text-text md:text-2xl">
          Fictional case files
        </h1>
        <p className="mt-2 max-w-2xl font-mono text-[13px] text-text-muted normal-case tracking-normal">
          Invented training files only — never real-crime cases.
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
          {entitlements?.isPremium ? " · PRO CLEARANCE" : " · FREE CLEARANCE"}
          {" · "}
          {result.total} files · page {result.page}/{result.totalPages}
        </p>
      </div>

      <ul className="mt-4 space-y-3">
        {cases.map((item) => {
          const state = byCase.get(item.id);
          const proLocked =
            fictionalRequiresPremium(item.difficulty) &&
            !entitlements?.isPremium;
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
                      {proLocked ? " · PRO LOCK" : ""}
                    </p>
                    <h2 className="mt-1 font-mono text-base font-semibold uppercase tracking-[0.08em] text-text">
                      {item.title}
                    </h2>
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

      {cases.length === 0 ? (
        <p className="mt-6 font-mono text-[11px] text-text-dim">
          No fictional cases published.
        </p>
      ) : null}
    </main>
  );
}
