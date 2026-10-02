/**
 * Case research pipeline (server-side only).
 * plan → search/fetch → extract → verify → corroborate → assemble draft → pending_review
 * Agent NEVER publishes.
 */

import { getCasesPrisma } from "@/lib/cases-db";
import { writeAuditLog } from "@/lib/pb-case/audit";
import { lintCaseWording } from "@/lib/pb-case/wording-linter";
import {
  addUsage,
  costUnitsFromTokens,
  createOpenAiClientAdapter,
  createSearchAdapter,
  emptyUsage,
  getResearchLimits,
  type TokenUsage,
} from "@/lib/research/adapters";
import {
  fetchAllowlistedPage,
  isUrlAllowlisted,
  sanitizeFetchedText,
} from "@/lib/research/fetch";
import {
  parseExtractResultStrict,
  parseVerifyResultStrict,
  RESEARCH_SYSTEM_PROMPT,
  VERIFY_SYSTEM_PROMPT,
  type ExtractResult,
  type VerifyResult,
} from "@/lib/research/schema";

export type ResearchStep = {
  at: string;
  step: string;
  detail?: string;
  url?: string;
};

function pushStep(
  log: ResearchStep[],
  step: string,
  detail?: string,
  url?: string,
) {
  log.push({
    at: new Date().toISOString(),
    step,
    detail,
    url,
  });
}

/**
 * Call model + validate with our schema; reject + retry malformed (max schemaRetries).
 * Network/429 backoff is handled inside the OpenAI adapter.
 */
async function completeValidated<T>(opts: {
  llm: ReturnType<typeof createOpenAiClientAdapter>;
  role: "extract" | "verify";
  schemaMode: "extract" | "verify";
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  parse: (raw: string) => T;
  schemaRetries: number;
  steps: ResearchStep[];
  stepName: string;
}): Promise<{ value: T; usage: TokenUsage; model: string }> {
  let lastErr: unknown;
  let usage = emptyUsage();
  let model = "";
  for (let attempt = 0; attempt <= opts.schemaRetries; attempt++) {
    const result = await opts.llm.complete({
      role: opts.role,
      messages: opts.messages,
      schemaMode: opts.schemaMode,
    });
    usage = addUsage(usage, result.usage);
    model = result.model;
    try {
      const value = opts.parse(result.content);
      return { value, usage, model };
    } catch (err) {
      lastErr = err;
      pushStep(
        opts.steps,
        opts.stepName,
        `schema_reject attempt=${attempt + 1}: ${
          err instanceof Error ? err.message.slice(0, 160) : "invalid"
        }`,
      );
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`${opts.stepName}_schema_failed`);
}

/**
 * Run research for a case. Creates a ResearchRun row.
 * Does not publish. Leaves case in pending_review on success.
 */
export async function runCaseResearch(input: {
  caseId: string;
  actor: string;
}): Promise<{ runId: string; status: "completed" | "failed" }> {
  const db = getCasesPrisma();
  const limits = getResearchLimits();
  const caseFile = await db.caseFile.findUnique({
    where: { id: input.caseId },
  });
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
  let tokenUsage = emptyUsage();

  try {
    const llm = createOpenAiClientAdapter();
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

    // 2) Search (Brave)
    pushStep(steps, "search", `brave: ${planQuery}`);
    stepsUsed += 1;
    const hits = await search.search(
      planQuery,
      Math.min(8, limits.maxPages),
    );
    costUnits += 0.05;

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
      costUnits += 0.02;
      pages.push({
        url: fetched.url,
        text: sanitizeFetchedText(fetched.text),
      });
      pushStep(steps, "fetch_ok", `chars=${fetched.text.length}`, fetched.url);
    }

    // Social: official APIs only or skip.
    pushStep(steps, "social", "skipped_no_official_api");

    // 3) Extract (OPENAI_MODEL_EXTRACT) — structured output + zod validate + retry
    pushStep(steps, "extract", `pages=${pages.length}`);
    stepsUsed += 1;
    const extractOut = await completeValidated<ExtractResult>({
      llm,
      role: "extract",
      schemaMode: "extract",
      schemaRetries: limits.schemaRetries,
      steps,
      stepName: "extract",
      parse: parseExtractResultStrict,
      messages: [
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
    });
    tokenUsage = addUsage(tokenUsage, extractOut.usage);
    costUnits += costUnitsFromTokens(extractOut.usage);
    pushStep(
      steps,
      "extract_ok",
      `model=${extractOut.model} tokens=${extractOut.usage.totalTokens}`,
    );

    // 4) Verify (OPENAI_MODEL_VERIFY) — strongest model from env
    pushStep(steps, "verify");
    stepsUsed += 1;
    const verifyOut = await completeValidated<VerifyResult>({
      llm,
      role: "verify",
      schemaMode: "verify",
      schemaRetries: limits.schemaRetries,
      steps,
      stepName: "verify",
      parse: parseVerifyResultStrict,
      messages: [
        { role: "system", content: VERIFY_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            caseTitle: caseFile.title,
            extract: extractOut.value,
            allowlistedHostsHint:
              "Keep only https sources that look official/reputable; mark disputed claims.",
          }),
        },
      ],
    });
    tokenUsage = addUsage(tokenUsage, verifyOut.usage);
    costUnits += costUnitsFromTokens(verifyOut.usage);
    pushStep(
      steps,
      "verify_ok",
      `model=${verifyOut.model} tokens=${verifyOut.usage.totalTokens}`,
    );

    // Local wording + allowlist pass after model verify
    const verifiedClaims = verifyOut.value.claims.filter((c) => {
      const lint = lintCaseWording(c.text);
      return !lint.some((f) => f.severity === "error");
    });
    const verifiedSources = verifyOut.value.sources.filter((s) =>
      isUrlAllowlisted(s.url),
    );
    const verifiedPeople = verifyOut.value.people;

    // 5) Corroborate
    pushStep(steps, "corroborate");
    stepsUsed += 1;
    const corroborated = verifiedClaims.map((c) => ({
      ...c,
      confidence:
        c.confidence ?? Math.min(1, (c.sources?.length ?? 0) / 2),
    }));

    // 6) Assemble draft → pending_review (NEVER publish)
    pushStep(steps, "assemble");
    const draftContent = {
      summary: verifyOut.value.summary || extractOut.value.summary,
      assembledAt: new Date().toISOString(),
      pageCount: pages.length,
      verifyNotes: verifyOut.value.notes,
      tokenUsage,
      note: "Draft from research agent — pending admin review. Not published.",
    };

    const summary =
      verifyOut.value.summary ||
      extractOut.value.summary ||
      caseFile.summary;

    await db.$transaction(async (tx) => {
      await tx.caseFile.update({
        where: { id: caseFile.id },
        data: {
          status: "pending_review",
          summary,
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
            confidence: claim.confidence ?? undefined,
            sources: claim.sources,
            status: claim.disputed ? "disputed" : "pending",
            showOnPublish: true,
          },
        });
      }

      for (const person of verifiedPeople) {
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
            people: verifiedPeople,
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
          promptTokens: tokenUsage.promptTokens,
          completionTokens: tokenUsage.completionTokens,
          totalTokens: tokenUsage.totalTokens,
          plan: {
            title: caseFile.title,
            queries: [planQuery],
            hitCount: hits.length,
            models: {
              extract: extractOut.model,
              verify: verifyOut.model,
            },
          },
        },
      });
    });

    await writeAuditLog({
      actor: input.actor,
      action: "research.completed",
      entityType: "case",
      entityId: caseFile.id,
      meta: {
        runId: run.id,
        pagesFetched,
        stepsUsed,
        costUnits,
        totalTokens: tokenUsage.totalTokens,
      },
    });

    return { runId: run.id, status: "completed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "research_failed";
    const safeMessage = message
      .replace(/sk-[a-zA-Z0-9._-]+/g, "[redacted]")
      .slice(0, 500);
    pushStep(steps, "error", safeMessage);
    await db.researchRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: safeMessage,
        stepsLog: steps,
        pagesFetched,
        stepsUsed,
        costUnits,
        promptTokens: tokenUsage.promptTokens,
        completionTokens: tokenUsage.completionTokens,
        totalTokens: tokenUsage.totalTokens,
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
      meta: { runId: run.id, error: safeMessage },
    });
    return { runId: run.id, status: "failed" };
  }
}
