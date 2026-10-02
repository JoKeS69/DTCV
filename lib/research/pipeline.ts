/**
 * Case research control plane (Next.js / PB CASE).
 *
 * Admin clicks Research → inserts research_runs with status `queued`.
 * The external Python worker polls the cases DB, runs LLM/search, writes results.
 * This process NEVER calls OpenAI / Brave and NEVER publishes.
 */

import { getCasesPrisma } from "@/lib/cases-db";
import { writeAuditLog } from "@/lib/pb-case/audit";
import { getResearchLimits } from "@/lib/research/limits";

/**
 * Queue a research job for the external Python worker.
 * Does not run the pipeline in-process. Keys stay off the web app.
 */
export async function queueCaseResearch(input: {
  caseId: string;
  actor: string;
}): Promise<{ runId: string; status: "queued" }> {
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
      status: "queued",
      stepsLog: [
        {
          at: new Date().toISOString(),
          step: "queued",
          detail: "Waiting for external research worker (DB poll)",
        },
      ],
      plan: {
        title: caseFile.title,
        actor: input.actor,
        maxSteps: limits.maxSteps,
        queuedBy: "pb-case",
        worker: "python-research-worker",
      },
    },
  });

  await db.caseFile.update({
    where: { id: caseFile.id },
    data: { status: "researching" },
  });

  await writeAuditLog({
    actor: input.actor,
    action: "research.queued",
    entityType: "case",
    entityId: caseFile.id,
    meta: {
      runId: run.id,
      note: "External worker polls research_runs; web app holds no OpenAI key",
    },
  });

  return { runId: run.id, status: "queued" };
}

/** @deprecated Use queueCaseResearch — kept for call-site clarity during transition. */
export async function runCaseResearch(input: {
  caseId: string;
  actor: string;
}): Promise<{ runId: string; status: "queued" }> {
  return queueCaseResearch(input);
}
