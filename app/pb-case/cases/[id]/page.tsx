import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ClaimReviewButtons,
  LabelsForm,
  PersonReviewButtons,
  PublishControls,
  ResearchButton,
  WorldDominationToggle,
} from "@/components/pb-case/CaseControls";
import { PbCaseShell } from "@/components/pb-case/PbCaseShell";
import { getCasesPrisma } from "@/lib/cases-db";
import { evaluatePublishGate } from "@/lib/pb-case/publish-gate";

export const dynamic = "force-dynamic";

export default async function PbCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getCasesPrisma();
  const caseFile = await db.caseFile.findUnique({
    where: { id },
    include: {
      claims: { orderBy: { createdAt: "desc" } },
      people: { orderBy: { createdAt: "desc" } },
      researchRuns: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!caseFile) notFound();

  const gate = await evaluatePublishGate(caseFile.id);
  const disputed = caseFile.claims.filter(
    (c) => c.disputed || c.status === "disputed",
  );
  const factual = caseFile.claims.filter(
    (c) => !c.disputed && c.status !== "disputed",
  );

  return (
    <PbCaseShell
      title={caseFile.title}
      subtitle={`${caseFile.status} · ${caseFile.eventDateText ?? "undated"} · prefer official sources`}
      current={`/pb-case/cases/${caseFile.id}`}
    >
      <p className="mb-3 font-mono text-[11px]">
        <Link href="/pb-case" className="text-text-muted hover:text-text">
          ← Cases
        </Link>
      </p>

      <section className="grid gap-3 border border-border p-3 md:grid-cols-2">
        <div>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
            Research
          </h2>
          <p className="mt-1 font-mono text-[10px] text-text-dim">
            Queues a job in the cases DB. The external Python worker polls and
            runs LLM/search — keys stay off this web app. Never publishes.
          </p>
          <div className="mt-2">
            <ResearchButton caseId={caseFile.id} />
          </div>
          <ul className="mt-3 space-y-1 font-mono text-[10px] text-text-muted">
            {caseFile.researchRuns.map((r) => (
              <li key={r.id}>
                {r.status} · steps {r.stepsUsed} · pages {r.pagesFetched} · cost{" "}
                {r.costUnits.toFixed(4)} · tokens {r.totalTokens} (in{" "}
                {r.promptTokens}/out {r.completionTokens})
                {r.errorMessage ? ` · ${r.errorMessage}` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
              Publish gate
            </h2>
            <p className="mt-1 font-mono text-[11px] text-text-muted">
              {gate.ok
                ? "Ready (admin + approvals + wording)."
                : gate.errors.join(" ")}
            </p>
            <div className="mt-2">
              <PublishControls caseId={caseFile.id} status={caseFile.status} />
            </div>
          </div>
          <WorldDominationToggle
            caseId={caseFile.id}
            enabled={caseFile.worldDomination}
          />
          <div>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
              Labels
            </h2>
            <div className="mt-2">
              <LabelsForm caseId={caseFile.id} labels={caseFile.labels} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 border border-border p-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
          Draft preview
        </h2>
        <p className="mt-2 font-mono text-[12px] text-text-muted whitespace-pre-wrap">
          {caseFile.summary || "(empty summary — stub or pending research)"}
        </p>
        {caseFile.legalStatusNote ? (
          <p className="mt-2 font-mono text-[11px] text-text-dim">
            Legal note: {caseFile.legalStatusNote}
          </p>
        ) : null}
        <p className="mt-2 font-mono text-[10px] text-text-dim">
          Last reviewed:{" "}
          {caseFile.lastReviewedAt?.toISOString() ?? "never"} · Sources:{" "}
          {Array.isArray(caseFile.sources)
            ? caseFile.sources.length
            : caseFile.sources
              ? "present"
              : "none"}
        </p>
      </section>

      <section className="mt-4 border border-border p-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
          Claims review
        </h2>
        {factual.length === 0 ? (
          <p className="mt-2 font-mono text-[11px] text-text-dim">No claims.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {factual.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-2"
              >
                <div className="max-w-3xl font-mono text-[12px]">
                  <span className="text-text-dim">[{c.status}] </span>
                  {c.text}
                </div>
                <ClaimReviewButtons claimId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 border border-dashed border-border p-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-warning">
          Disputed claims
        </h2>
        <p className="mt-1 font-mono text-[10px] text-text-dim">
          Must stay labeled disputed — never presented as established fact.
        </p>
        {disputed.length === 0 ? (
          <p className="mt-2 font-mono text-[11px] text-text-dim">None.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {disputed.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-2"
              >
                <div className="max-w-3xl font-mono text-[12px] text-warning">
                  [{c.status}] {c.text}
                </div>
                <ClaimReviewButtons claimId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 border border-border p-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-dim">
          People review
        </h2>
        <p className="mt-1 font-mono text-[10px] text-text-dim">
          Presumption of innocence applies unless convicted in court.
        </p>
        {caseFile.people.length === 0 ? (
          <p className="mt-2 font-mono text-[11px] text-text-dim">No people.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {caseFile.people.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-2"
              >
                <div className="font-mono text-[12px]">
                  <span className="text-text-dim">
                    [{p.status}] [{p.legalStatus}]{" "}
                  </span>
                  {p.name} · {p.role}
                  <div className="text-[10px] text-text-dim">
                    {p.presumptionNote}
                  </div>
                </div>
                <PersonReviewButtons personId={p.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PbCaseShell>
  );
}
