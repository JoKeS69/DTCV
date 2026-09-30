import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { FictionalBanner } from "@/components/fictional/FictionalBanner";
import { SCORE_WEIGHTS } from "@/lib/fictional/scoring";
import {
  getFictionalCaseBySlug,
  getSolutionReveal,
  getUserInvestigation,
} from "@/lib/fictional/queries";
import { privatePageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Private scorecard — never index theory results.
  return privatePageMetadata(`Result · ${slug}`);
}

export default async function FictionalResultPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/fictional/${slug}/result`)}`);
  }

  const caseFile = await getFictionalCaseBySlug(slug);
  if (!caseFile) notFound();

  const investigation = await getUserInvestigation(
    session.user.id,
    caseFile.id,
  );
  if (!investigation?.submission) {
    redirect(`/fictional/${slug}`);
  }

  const submission = investigation.submission;
  // Helper re-checks submission ownership before loading Solution.
  const reveal = await getSolutionReveal(caseFile.id, session.user.id);

  const rows = [
    {
      label: "Suspect",
      score: submission.scoreSuspect,
      max: SCORE_WEIGHTS.suspect,
    },
    {
      label: "Motive",
      score: submission.scoreMotive,
      max: SCORE_WEIGHTS.motive,
    },
    {
      label: "Timeline",
      score: submission.scoreTimeline,
      max: SCORE_WEIGHTS.timeline,
    },
    {
      label: "Evidence",
      score: submission.scoreEvidence,
      max: SCORE_WEIGHTS.evidence,
    },
    {
      label: "Reasoning",
      score: submission.scoreReasoning,
      max: SCORE_WEIGHTS.reasoning,
    },
  ];

  return (
    <main className="deck-page">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        <Link href={`/fictional/${slug}`} className="hover:text-text">
          ← {caseFile.caseCode}
        </Link>
        {" · "}
        <Link href="/fictional" className="hover:text-text">
          Training bay
        </Link>
      </p>

      <header className="mt-3 border border-border bg-surface/70">
        <div className="border-b border-border px-4 py-3">
          <p className="font-mono text-[10px] tracking-[0.18em] text-text-dim">
            RESULT · {caseFile.caseCode}
          </p>
          <h1 className="mt-1 font-mono text-xl font-semibold uppercase tracking-[0.08em] text-text">
            Theory scorecard
          </h1>
          <div className="mt-2">
            <FictionalBanner compact />
          </div>
        </div>
        <div className="px-4 py-4">
          <p className="font-mono text-4xl font-semibold tracking-[0.08em] text-text">
            {submission.scoreTotal}
            <span className="text-lg text-text-dim"> / 100</span>
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-online">
            +{submission.xpAwarded} XP awarded (fictional progression)
          </p>
        </div>
      </header>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Breakdown
        </header>
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em]"
            >
              <span className="text-text-dim">{row.label}</span>
              <span className="text-text">
                {row.score} / {row.max}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 border border-border bg-surface/40">
        <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          &gt; Your submission
        </header>
        <dl className="space-y-3 px-4 py-3 font-mono text-[12px] text-text-muted normal-case tracking-normal">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-text-dim">
              Motive
            </dt>
            <dd className="mt-1 whitespace-pre-wrap">{submission.motive}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-text-dim">
              Timeline
            </dt>
            <dd className="mt-1 whitespace-pre-wrap">{submission.timeline}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-text-dim">
              Evidence
            </dt>
            <dd className="mt-1 whitespace-pre-wrap">
              {submission.evidenceInterpretation}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.14em] text-text-dim">
              Reasoning
            </dt>
            <dd className="mt-1 whitespace-pre-wrap">{submission.reasoning}</dd>
          </div>
        </dl>
      </section>

      {reveal ? (
        <section className="mt-4 border border-online/30 bg-online/5">
          <header className="border-b border-online/30 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-online">
            &gt; Debrief (unlocked after submit)
          </header>
          <div className="space-y-2 px-4 py-3 font-mono text-[12px] text-text-muted normal-case tracking-normal">
            <p>
              Culprit:{" "}
              <span className="text-text">
                {reveal.culprit.code} — {reveal.culprit.name}
              </span>
            </p>
            <p>{reveal.summary}</p>
            <p>{reveal.explanation}</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-text-dim">
              Key evidence: {reveal.keyEvidenceCodes.join(", ")}
            </p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
