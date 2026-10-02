/**
 * Case research pipeline (server-side only).
 * plan → search/fetch → extract → verify → corroborate → assemble draft → pending_review
 * Agent NEVER publishes.
 */

import { getCasesPrisma } from "@/lib/cases-db";
import { writeAuditLog } from "@/lib/pb-case/audit";
import { lintCaseWording } from "@/lib/pb-case/wording-linter";
import {
  createLlmAdapter,
  createSearchAdapter,
  getResearchLimits,
} from "@/lib/research/adapters";
import {
  fetchAllowlistedPage,
  isUrlAllowlisted,
  sanitizeFetchedText,
} from "@/lib/research/fetch";
import {
  parseExtractResult,
  RESEARCH_SYSTEM_PROMPT,
  type ExtractResult,
} from "@/lib/research/schema";

export type ResearchStep = {
  at: string;
  step: string;
  detail?: string;
  url?: string;
};

function pushStep(log: ResearchStep[], step: string, detail?: string, url?: string) {
  log.push({
    at: new Date().toISOString(),
    step,
    detail,
    url,
  });
}

async function withRetries<T>(
  fn: () => Promise<T>,
  retries: number,
): Promise<T> {
  let last: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
    }
  }
  throw last;
}

/**
 * Run research for a case. Idempotent queue: creates a ResearchRun row.
 * Does not publish. Leaves case in pending_review on success.
 */
export async function runCaseResearch(input: {
  caseId: string;
  actor: string;
}): Promise<{ runId: string; status: "completed" | "failed" }> {
  const db = getCasesPrisma();
  const limits = getResearchLimits();
  const caseFile = await db.caseFile.findUnique({ where: { id: input.caseId } });
  if (!caseFile) {
    throw new Error("Case not found");
  }

  const run = await db.researchRun.create({
    data: {
      caseId: caseFile.id,
      status: "running",
      startedAt: new Date(),
      stepsLog: [],
      plan: { title: caseFile.title, maxSteps: limits.maxSteps },
    },
  });

  await db.caseFile.update({
    where: { id: caseFile.id },
    data: { status: "researching" },
  });

  const steps: ResearchStep[] = [];
  let pagesFetched = 0;
  let stepsUsed = 0;
  let costUnits = 0;

  try {
    const llm = createLlmAdapter();
    const search = createSearchAdapter();

    // 1) Plan
    pushStep(steps, "plan", `Research plan for: ${caseFile.title}`);
    stepsUsed += 1;
    const planQuery = [
      caseFile.title,
      caseFile.eventDateText,
      caseFile.location,
    ]
      .filter(Boolean)
      .join(" ");

    // 2) Search
    pushStep(steps, "search", planQuery);
    stepsUsed += 1;
    const hits = await withRetries(
      () => search.search(planQuery, Math.min(8, limits.maxPages)),
      limits.retries,
    );
    costUnits += 0.1;

    const pages: { url: string; text: string }[] = [];
    for (const hit of hits) {
      if (pagesFetched >= limits.maxPages || stepsUsed >= limits.maxSteps) break;
      if (costUnits >= limits.maxCost) break;
      if (!isUrlAllowlisted(hit.url)) {
        pushStep(steps, "skip_url", "not_allowlisted", hit.url);
        continue;
      }
      pushStep(steps, "fetch", hit.title, hit.url);
      const fetched = await fetchAllowlistedPage(hit.url);
      stepsUsed += 1;
      if (!fetched.ok) {
        pushStep(steps, "fetch_fail", fetched.reason, hit.url);
        continue;
      }
      pagesFetched += 1;
      costUnits += 0.05;
      pages.push({
        url: fetched.url,
        text: sanitizeFetchedText(fetched.text),
      });
      pushStep(steps, "fetch_ok", `chars=${fetched.text.length}`, fetched.url);
    }

    // Social: official APIs only or skip — we skip social scrape entirely.
    pushStep(steps, "social", "skipped_no_official_api");

    // 3) Extract
    pushStep(steps, "extract", `pages=${pages.length}`);
    stepsUsed += 1;
    const extractRaw = await withRetries(
      () =>
        llm.complete(
          [
            { role: "system", content: RESEARCH_SYSTEM_PROMPT },
            {
              role: "user",
              content: JSON.stringify({
                caseTitle: caseFile.title,
                eventDateText: caseFile.eventDateText,
                location: caseFile.location,
                pages: pages.map((p) => ({
                  url: p.url,
                  text: p.text.slice(0, 6000),
                })),
                instruction:
                  "Extract paraphrased claims/people/sources as JSON. Prefer official sources.",
              }),
            },
          ],
          { json: true },
        ),
      limits.retries,
    );
    costUnits += 0.5;
    const extracted: ExtractResult = parseExtractResult(extractRaw);

    // 4) Verify (wording + source URL allowlist)
    pushStep(steps, "verify");
    stepsUsed += 1;
    const verifiedClaims = extracted.claims.filter((c) => {
      const lint = lintCaseWording(c.text);
      return !lint.some((f) => f.severity === "error");
    });
    const verifiedSources = extracted.sources.filter((s) =>
      isUrlAllowlisted(s.url),
    );

    // 5) Corroborate — claims with 2+ sources preferred
    pushStep(steps, "corroborate");
    stepsUsed += 1;
    const corroborated = verifiedClaims.map((c) => ({
      ...c,
      confidence:
        c.confidence ??
        Math.min(1, (c.sources?.length ?? 0) / 2),
    }));

    // 6) Assemble draft → pending_review (NEVER publish)
    pushStep(steps, "assemble");
    const draftContent = {
      summary: extracted.summary,
      assembledAt: new Date().toISOString(),
      pageCount: pages.length,
      note: "Draft from research agent — pending admin review. Not published.",
    };

    await db.$transaction(async (tx) => {
      await tx.caseFile.update({
        where: { id: caseFile.id },
        data: {
          status: "pending_review",
          summary: extracted.summary || caseFile.summary,
          draftContent,
          sources: verifiedSources,
          lastReviewedAt: null,
        },
      });

      for (const claim of corroborated) {
        await tx.claim.create({
          data: {
            caseId: caseFile.id,
            text: claim.text,
            disputed: claim.disputed,
            confidence: claim.confidence,
            sources: claim.sources,
            status: claim.disputed ? "disputed" : "pending",
            showOnPublish: true,
          },
        });
      }

      for (const person of extracted.people) {
        await tx.person.create({
          data: {
            caseId: caseFile.id,
            name: person.name,
            role: person.role,
            legalStatus: person.legalStatus,
            sources: person.sources,
            status: "pending",
          },
        });
      }

      await tx.caseRevision.create({
        data: {
          caseId: caseFile.id,
          createdBy: input.actor,
          note: "research_agent_draft",
          snapshot: {
            draftContent,
            claims: corroborated,
            people: extracted.people,
            sources: verifiedSources,
          },
        },
      });

      await tx.researchRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          finishedAt: new Date(),
          stepsLog: steps,
          pagesFetched,
          stepsUsed,
          costUnits,
          plan: {
            title: caseFile.title,
            queries: [planQuery],
            hitCount: hits.length,
          },
        },
      });
    });

    await writeAuditLog({
      actor: input.actor,
      action: "research.completed",
      entityType: "case",
      entityId: caseFile.id,
      meta: { runId: run.id, pagesFetched, stepsUsed, costUnits },
    });

    return { runId: run.id, status: "completed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "research_failed";
    pushStep(steps, "error", message);
    await db.researchRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: message.slice(0, 500),
        stepsLog: steps,
        pagesFetched,
        stepsUsed,
        costUnits,
      },
    });
    await db.caseFile.update({
      where: { id: caseFile.id },
      data: { status: "pending_review" },
    });
    await writeAuditLog({
      actor: input.actor,
      action: "research.failed",
      entityType: "case",
      entityId: caseFile.id,
      meta: { runId: run.id, error: message },
    });
    return { runId: run.id, status: "failed" };
  }
}
