import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { UpgradeButton } from "@/components/billing/BillingActions";
import { FictionalBanner } from "@/components/fictional/FictionalBanner";
import { NotesPanel } from "@/components/fictional/NotesPanel";
import { StartInvestigationButton } from "@/components/fictional/StartInvestigationButton";
import { TheoryForm } from "@/components/fictional/TheoryForm";
import {
  getFictionalCaseBySlug,
  getUserInvestigation,
} from "@/lib/fictional/queries";
import {
  fictionalRequiresPremium,
  getUserEntitlements,
} from "@/lib/payments/entitlements";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { metaDescription } from "@/lib/seo/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const caseFile = await getFictionalCaseBySlug(slug);
  if (!caseFile) {
    return buildPageMetadata({
      title: "Fictional case not found",
      path: `/fictional/${slug}`,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: caseFile.title,
    description: metaDescription(
      `[FICTIONAL] ${caseFile.synopsis} Difficulty ${caseFile.difficulty}.`,
    ),
    path: `/fictional/${caseFile.slug}`,
  });
}

export default async function FictionalCasePage({ params }: Props) {
  const { slug } = await params;
  const caseFile = await getFictionalCaseBySlug(slug);
  if (!caseFile) notFound();

  const session = await auth();
  const entitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : null;
  const locked =
    fictionalRequiresPremium(caseFile.difficulty) && !entitlements?.isPremium;

  const investigation = locked
    ? null
    : await getUserInvestigation(session?.user?.id, caseFile.id);
  const submitted = investigation?.status === "SUBMITTED";
  const active = !!investigation && !submitted;

  if (locked) {
    return (
      <main className="deck-page">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
          <Link href="/fictional" className="hover:text-text">
            ← Fictional ops
          </Link>
        </p>
        <header className="mt-3 border border-border bg-surface/70 px-4 py-4">
          <p className="font-mono text-[10px] tracking-[0.18em] text-text-dim">
            CASE FILE · {caseFile.difficulty} · PRO
          </p>
          <h1 className="mt-1 font-mono text-xl font-semibold uppercase tracking-[0.08em] text-text">
            {caseFile.title}
          </h1>
          <p className="mt-3 font-mono text-[12px] text-text-muted normal-case tracking-normal">
            This ADVANCED/EXPERT training file requires Investigator Pro. Free
            NOVICE and INTERMEDIATE cases remain available without a
            subscription.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {session?.user ? (
              <UpgradeButton />
            ) : (
              <Link
                href={`/login?callbackUrl=/fictional/${caseFile.slug}`}
                className="border border-cta/50 bg-cta/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text"
              >
                Sign in to upgrade
              </Link>
            )}
            <Link
              href="/pricing"
              className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text"
            >
              View pricing
            </Link>
          </div>
        </header>
      </main>
    );
  }

  return (
    <main className="deck-page">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        <Link href="/fictional" className="hover:text-text">
          ← Fictional ops
        </Link>
      </p>

      <header className="mt-3 border border-border bg-surface/70">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-text-dim">
              CASE FILE
            </p>
            <h1 className="mt-1 font-mono text-xl font-semibold uppercase tracking-[0.08em] text-text md:text-2xl">
              {caseFile.title}
            </h1>
          </div>
          <FictionalBanner compact />
        </div>

        <dl className="grid gap-3 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] sm:grid-cols-3">
          <div>
            <dt className="text-text-dim">Difficulty</dt>
            <dd className="mt-1 text-text">{caseFile.difficulty}</dd>
          </div>
          <div>
            <dt className="text-text-dim">Estimated time</dt>
            <dd className="mt-1 text-text">
              {caseFile.estimatedMinutes
                ? `${caseFile.estimatedMinutes} min`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-text-dim">Setting</dt>
            <dd className="mt-1 text-text normal-case tracking-normal">
              {caseFile.setting ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="border-t border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <StartInvestigationButton
              fictionalCaseId={caseFile.id}
              slug={caseFile.slug}
              signedIn={!!session?.user}
              hasInvestigation={!!investigation}
              submitted={!!submitted}
            />
            {investigation ? (
              <Link
                href={`/fictional/${caseFile.slug}/board`}
                className="border border-online/40 bg-online/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-online/20"
              >
                Investigation board
              </Link>
            ) : null}
          </div>
          {investigation ? (
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
              Status: {investigation.status}
              {investigation.startedAt
                ? ` · started ${investigation.startedAt.toISOString().slice(0, 10)}`
                : null}
            </p>
          ) : null}
        </div>
      </header>

      {investigation ? (
        <Section title="Investigation board">
          <p className="font-mono text-[12px] text-text-muted normal-case tracking-normal">
            Pin evidence, suspects, events, and notes. Draw links between pins.
            Progress saves automatically.
          </p>
          <Link
            href={`/fictional/${caseFile.slug}/board`}
            className="mt-3 inline-flex border border-cta/50 bg-cta/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:bg-cta/20"
          >
            Open board →
          </Link>
        </Section>
      ) : null}

      <Section id="case-brief" title="Case brief">
        <p className="font-mono text-[12px] leading-relaxed text-text-muted normal-case tracking-normal whitespace-pre-wrap">
          {caseFile.synopsis}
        </p>
      </Section>

      <Section title="Suspects">
        <ul className="space-y-2">
          {caseFile.suspects.map((s) => (
            <li key={s.id} className="border border-border/80 px-3 py-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text">
                {s.code} — {s.name}
                {s.age != null ? ` · ${s.age}` : ""}
              </p>
              <p className="mt-1 font-mono text-[10px] text-text-dim">
                {s.occupation}
              </p>
              <p className="mt-2 font-mono text-[12px] text-text-muted normal-case tracking-normal">
                {s.bio}
              </p>
              {s.publicAlibi ? (
                <p className="mt-1 font-mono text-[11px] text-text-dim normal-case tracking-normal">
                  Alibi: {s.publicAlibi}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evidence">
        <ul className="space-y-2">
          {caseFile.evidence.map((e) => (
            <li key={e.id} className="border border-border/80 px-3 py-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text">
                {e.code} — {e.title}
              </p>
              <p className="mt-1 font-mono text-[10px] text-text-dim">
                {e.type}
                {e.foundLocation ? ` · ${e.foundLocation}` : ""}
              </p>
              <p className="mt-2 font-mono text-[12px] text-text-muted normal-case tracking-normal">
                {e.description}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
          Evidence classifications are withheld during investigation.
        </p>
      </Section>

      <Section title="Witness statements">
        <ul className="space-y-2">
          {caseFile.witnessStatements.map((w) => (
            <li key={w.id} className="border border-border/80 px-3 py-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text">
                {w.code} — {w.witnessName}
              </p>
              <p className="mt-2 font-mono text-[12px] text-text-muted normal-case tracking-normal">
                “{w.statement}”
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Timeline">
        <ol className="space-y-2">
          {caseFile.events.map((event) => (
            <li key={event.id} className="border border-border/80 px-3 py-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text">
                {event.title}
              </p>
              <p className="mt-1 font-mono text-[10px] text-text-dim">
                {event.occurredAt.toISOString()}
              </p>
              <p className="mt-2 font-mono text-[12px] text-text-muted normal-case tracking-normal">
                {event.description}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Notes">
        {investigation ? (
          <NotesPanel
            investigationId={investigation.id}
            slug={caseFile.slug}
            notes={investigation.notes}
            locked={!!submitted}
          />
        ) : (
          <Empty>Start an investigation to keep private notes.</Empty>
        )}
      </Section>

      <Section title="Final conclusion">
        <p className="font-mono text-[12px] text-text-muted normal-case tracking-normal">
          When ready, name a culprit and defend your theory. Max score 100 —
          suspect 40 · motive 20 · timeline 15 · evidence 15 · reasoning 10.
        </p>
      </Section>

      <Section id="submit-theory" title="Submit theory">
        {active || submitted ? (
          <TheoryForm
            investigationId={investigation!.id}
            slug={caseFile.slug}
            suspects={caseFile.suspects.map((s) => ({
              id: s.id,
              code: s.code,
              name: s.name,
            }))}
            locked={!!submitted}
          />
        ) : (
          <Empty>Start or continue the investigation to unlock submission.</Empty>
        )}
      </Section>

      <Section title="Result">
        {submitted ? (
          <Link
            href={`/fictional/${caseFile.slug}/result`}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-cta hover:underline"
          >
            Open scorecard →
          </Link>
        ) : (
          <Empty>Results appear after you submit a theory.</Empty>
        )}
      </Section>
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-4 border border-border bg-surface/40 scroll-mt-20">
      <header className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        &gt; {title}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] text-text-dim normal-case tracking-normal">
      {children}
    </p>
  );
}
