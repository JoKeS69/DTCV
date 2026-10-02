import { notFound } from "next/navigation";
import { ConsentGate } from "@/components/legal/ConsentGate";
import { ContentWarningGate } from "@/components/legal/ContentWarningGate";
import { TakedownButton } from "@/components/legal/TakedownButton";
import { getCasesPrisma } from "@/lib/cases-db";
import { NAMING_POLICY } from "@/lib/pb-case/wording-linter";
import { privatePageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return privatePageMetadata(`Research · ${slug}`);
}

async function loadPublishedCase(slug: string) {
  try {
    return await getCasesPrisma().caseFile.findUnique({
      where: { slug },
      include: {
        claims: {
          where: {
            showOnPublish: true,
            status: { in: ["approved", "disputed"] },
          },
          orderBy: { createdAt: "asc" },
        },
        people: {
          where: { status: "approved" },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  } catch {
    return null;
  }
}

export default async function ResearchCasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const caseFile = await loadPublishedCase(slug);

  if (!caseFile || caseFile.status !== "published") {
    notFound();
  }

  const sources = Array.isArray(caseFile.sources)
    ? (caseFile.sources as {
        url?: string;
        title?: string;
        excerpt?: string;
      }[])
    : [];
  const disputed = caseFile.claims.filter(
    (c) => c.disputed || c.status === "disputed",
  );
  const factual = caseFile.claims.filter(
    (c) => !c.disputed && c.status !== "disputed",
  );

  return (
    <ConsentGate>
      <main className="mx-auto max-w-3xl px-3 py-8 md:px-4">
        <ContentWarningGate enabled={caseFile.contentWarning}>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">
            Research case file · published
          </p>
          <h1 className="mt-2 font-mono text-2xl font-semibold uppercase tracking-[0.06em] text-text">
            {caseFile.title}
          </h1>
          <p className="mt-2 font-mono text-[11px] text-text-muted">
            {caseFile.eventDateText ?? "Date TBD"}
            {caseFile.location ? ` · ${caseFile.location}` : ""}
          </p>
          {caseFile.legalStatusNote ? (
            <p className="mt-3 border border-border bg-surface/30 px-3 py-2 font-mono text-[11px] text-text-muted">
              Legal status: {caseFile.legalStatusNote}
            </p>
          ) : null}
          <p className="mt-3 font-mono text-[10px] text-text-dim">
            {NAMING_POLICY.presumptionOfInnocence}
          </p>
          <p className="mt-4 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-text-muted">
            {caseFile.summary}
          </p>

          {factual.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
                Claims
              </h2>
              <ul className="mt-2 space-y-2">
                {factual.map((c) => (
                  <li key={c.id} className="font-mono text-[12px] text-text">
                    {c.text}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {disputed.length > 0 ? (
            <section className="mt-8 border border-dashed border-warning/40 p-3">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-warning">
                Disputed
              </h2>
              <p className="mt-1 font-mono text-[10px] text-text-dim">
                {NAMING_POLICY.disputedClaimsSection}
              </p>
              <ul className="mt-2 space-y-2">
                {disputed.map((c) => (
                  <li key={c.id} className="font-mono text-[12px] text-warning">
                    {c.text}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {caseFile.people.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
                People
              </h2>
              <ul className="mt-2 space-y-2">
                {caseFile.people.map((p) => (
                  <li key={p.id} className="font-mono text-[12px]">
                    <span className="text-text">{p.name}</span>
                    <span className="text-text-dim">
                      {" "}
                      · {p.role} · legal status: {p.legalStatus}
                    </span>
                    <div className="text-[10px] text-text-dim">
                      {p.presumptionNote}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-8 border-t border-border pt-4">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
              Sources
            </h2>
            <ul className="mt-2 space-y-1">
              {sources.map((s, i) => (
                <li key={`${s.url}-${i}`} className="font-mono text-[11px]">
                  {s.url ? (
                    <a
                      href={s.url}
                      className="text-text-muted underline hover:text-text"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {s.title || s.url}
                    </a>
                  ) : null}
                  {s.excerpt ? (
                    <span className="block text-text-dim">“{s.excerpt}”</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-3 font-mono text-[10px] text-text-dim">
              Last reviewed:{" "}
              {caseFile.lastReviewedAt?.toISOString() ?? "not recorded"}
            </p>
            <div className="mt-2">
              <TakedownButton caseId={caseFile.id} caseSlug={caseFile.slug} />
            </div>
          </section>
        </ContentWarningGate>
      </main>
    </ConsentGate>
  );
}
