import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { CaseEngagement } from "@/components/cases/CaseEngagement";
import { CaseStatusText } from "@/components/cases/CaseStatusText";
import { ContentLabelBadge } from "@/components/cases/ContentLabelBadge";
import { DiscussionPanel } from "@/components/community/DiscussionPanel";
import { getCaseEngagement } from "@/lib/cases/queries";
import { getCaseBySlugCached } from "@/lib/cases/public-cache";
import { JsonLd, realCaseJsonLd } from "@/lib/seo/json-ld";
import { formatDateOnly, formatDateTime } from "@/lib/format-date";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { metaDescription } from "@/lib/seo/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const caseFile = await getCaseBySlugCached(slug);
  if (!caseFile) {
    return buildPageMetadata({
      title: "Case not found",
      path: `/cases/${slug}`,
      noIndex: true,
    });
  }
  return buildPageMetadata({
    title: `${caseFile.caseCode} · ${caseFile.title}`,
    description: metaDescription(
      `${caseFile.summary} Label: ${caseFile.contentLabel}. Status: ${caseFile.status}.`,
    ),
    path: `/cases/${caseFile.slug}`,
    type: "article",
  });
}

export default async function CaseDetailPage({ params }: Props) {
  const { slug } = await params;
  const caseFile = await getCaseBySlugCached(slug);
  if (!caseFile) notFound();

  const session = await auth();
  const engagement = await getCaseEngagement(session?.user?.id, caseFile.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-6 md:px-4">
      <JsonLd
        data={realCaseJsonLd({
          caseCode: caseFile.caseCode,
          title: caseFile.title,
          summary: caseFile.summary,
          slug: caseFile.slug,
          location: caseFile.location,
          year: caseFile.year,
          status: caseFile.status,
          contentLabel: caseFile.contentLabel,
          updatedAt: caseFile.updatedAt,
          sources: caseFile.sources.map((s) => ({
            title: s.title,
            url: s.url,
          })),
        })}
      />
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">
        <Link href="/cases" className="hover:text-text">
          ← Case database
        </Link>
      </p>

      <header className="mt-3 border border-border bg-surface/70">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-text-dim">
              CASE {caseFile.caseCode}
            </p>
            <h1 className="mt-1 font-mono text-xl font-semibold uppercase tracking-[0.08em] text-text md:text-2xl">
              {caseFile.title}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <CaseStatusText status={caseFile.status} />
            <ContentLabelBadge label={caseFile.contentLabel} />
          </div>
        </div>

        <dl className="grid gap-3 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] sm:grid-cols-2 md:grid-cols-4">
          <div>
            <dt className="text-text-dim">Location</dt>
            <dd className="mt-1 text-text">{caseFile.location ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-text-dim">Year</dt>
            <dd className="mt-1 text-text">{caseFile.year ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-text-dim">Status</dt>
            <dd className="mt-1">
              <CaseStatusText status={caseFile.status} />
            </dd>
          </div>
          <div>
            <dt className="text-text-dim">Last verified</dt>
            <dd className="mt-1 text-text">
              {formatDateOnly(caseFile.lastVerifiedAt)}
            </dd>
          </div>
        </dl>

        {caseFile.isDevStub ? (
          <p className="border-t border-amber/40 bg-amber/5 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber">
            Development stub — not a real crime record. Used for UI testing only.
          </p>
        ) : null}

        <div className="border-t border-border px-4 py-3">
          <CaseEngagement
            caseId={caseFile.id}
            slug={caseFile.slug}
            initialFollowed={engagement.followed}
            initialSaved={engagement.saved}
            signedIn={!!session?.user}
          />
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
            {caseFile._count.followedBy} following · {caseFile._count.savedBy}{" "}
            saved
          </p>
        </div>
      </header>

      <Section title="Overview">
        <p className="font-mono text-[12px] leading-relaxed text-text-muted normal-case tracking-normal">
          {caseFile.summary}
        </p>
        {caseFile.sourceAttribution || caseFile.sourceUrl ? (
          <p className="mt-3 font-mono text-[11px] text-text-dim normal-case tracking-normal">
            Source:{" "}
            {caseFile.sourceUrl ? (
              <a
                href={caseFile.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cta underline-offset-2 hover:underline"
              >
                {caseFile.sourceAttribution ?? "Official listing"}
              </a>
            ) : (
              (caseFile.sourceAttribution ?? "—")
            )}
            {caseFile.lastSyncedAt
              ? ` · Synced ${formatDateTime(caseFile.lastSyncedAt)}`
              : null}
          </p>
        ) : null}
      </Section>

      {Array.isArray(caseFile.images) && caseFile.images.length > 0 ? (
        <Section title="Images">
          <ul className="grid gap-3 sm:grid-cols-2">
            {(caseFile.images as { url?: string; thumb?: string; caption?: string }[]).map(
              (img, idx) => {
                const src = img.thumb || img.url;
                if (!src) return null;
                return (
                  <li key={`${src}-${idx}`} className="border border-border/80 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={img.caption || caseFile.title}
                      className="max-h-64 w-full object-contain bg-bg"
                    />
                    {img.caption ? (
                      <p className="mt-2 font-mono text-[10px] text-text-dim normal-case">
                        {img.caption}
                      </p>
                    ) : null}
                  </li>
                );
              },
            )}
          </ul>
        </Section>
      ) : null}

      <Section title="Tips">
        <p className="font-mono text-[12px] leading-relaxed text-text-muted normal-case tracking-normal">
          {caseFile.tipsText?.trim() ||
            "DETECTIVE does not collect tips. Contact the official source only."}
        </p>
        {caseFile.sourceUrl ? (
          <p className="mt-3">
            <a
              href={caseFile.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text hover:border-cta/40"
            >
              Open official source →
            </a>
          </p>
        ) : null}
      </Section>

      <Section title="Disclaimer">
        <p className="font-mono text-[11px] leading-relaxed text-text-dim normal-case tracking-normal">
          Listings are republished from attributed public sources and may change
          or be removed upstream. No guilt declarations. See{" "}
          <Link href="/sources" className="text-cta hover:underline">
            Sources and terms
          </Link>
          .
        </p>
      </Section>

      <Section title="Timeline">
        {caseFile.events.length === 0 ? (
          <Empty>No timeline entries published.</Empty>
        ) : (
          <ol className="space-y-3">
            {caseFile.events.map((event) => (
              <li key={event.id} className="border border-border/80 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text">
                    {event.title}
                  </p>
                  <ContentLabelBadge label={event.contentLabel} />
                </div>
                {event.occurredAt ? (
                  <p className="mt-1 font-mono text-[10px] text-text-dim">
                    {formatDateTime(event.occurredAt)}
                  </p>
                ) : null}
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-text-muted normal-case tracking-normal">
                  {event.description}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="People">
        {caseFile.persons.length === 0 ? (
          <Empty>No people records published.</Empty>
        ) : (
          <ul className="space-y-2">
            {caseFile.persons.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-start justify-between gap-2 border border-border/80 px-3 py-2"
              >
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text">
                    {person.name}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-dim">
                    Role: {person.role.replaceAll("_", " ")}
                  </p>
                  {person.notes ? (
                    <p className="mt-2 font-mono text-[11px] text-text-muted normal-case tracking-normal">
                      {person.notes}
                    </p>
                  ) : null}
                </div>
                <ContentLabelBadge label={person.contentLabel} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-text-dim">
          People roles are descriptive only — never guilt declarations.
        </p>
      </Section>

      <Section title="Evidence / public info">
        {caseFile.publicNotes ? (
          <p className="font-mono text-[12px] leading-relaxed text-text-muted normal-case tracking-normal">
            {caseFile.publicNotes}
          </p>
        ) : (
          <Empty>No public evidence notes published for this file.</Empty>
        )}
      </Section>

      <Section title="Sources">
        {caseFile.sources.length === 0 ? (
          <Empty>No sources cited yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {caseFile.sources.map((source) => (
              <li key={source.id} className="border border-border/80 px-3 py-2">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-cta underline-offset-2 hover:underline"
                >
                  {source.title}
                </a>
                <p className="mt-1 font-mono text-[10px] text-text-dim">
                  {[source.publisher, source.url].filter(Boolean).join(" · ")}
                </p>
                {source.citationNote ? (
                  <p className="mt-1 font-mono text-[11px] text-text-muted normal-case tracking-normal">
                    {source.citationNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Discussion">
        <Suspense
          fallback={
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-dim">
              Loading discussion…
            </p>
          }
        >
          <DiscussionPanel
            caseId={caseFile.id}
            caseSlug={caseFile.slug}
            discussions={caseFile.discussions}
            signedIn={!!session?.user}
          />
        </Suspense>
      </Section>

      <Section title="Updates">
        <ul className="space-y-2 font-mono text-[11px] text-text-muted">
          <li>File updated: {formatDateTime(caseFile.updatedAt)}</li>
          <li>
            Last verified:{" "}
            {caseFile.lastVerifiedAt
              ? formatDateTime(caseFile.lastVerifiedAt)
              : "Not verified"}
          </li>
          <li>Published: {formatDateTime(caseFile.publishedAt)}</li>
        </ul>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 border border-border bg-surface/40">
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
