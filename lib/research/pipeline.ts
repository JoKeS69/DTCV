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
 * Choice (documented): when a new research run is queued, supersede prior
 * *pending* auto-generated claims/people. Admin-approved / rejected / disputed
 * rows are kept; the worker will upsert into those on completion.
 */
async function supersedePendingReviewRows(caseId: string): Promise<{
  claimsDeleted: number;
  peopleDeleted: number;
}> {
  const db = getCasesPrisma();
  const claims = await db.claim.deleteMany({
    where: { caseId, status: "pending" },
  });
  const people = await db.person.deleteMany({
    where: { caseId, status: "pending" },
  });
  return { claimsDeleted: claims.count, peopleDeleted: people.count };
}

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

  const superseded = await supersedePendingReviewRows(caseFile.id);

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
        {
          at: new Date().toISOString(),
          step: "supersede_pending",
          detail: `Removed pending claims=${superseded.claimsDeleted} people=${superseded.peopleDeleted} (kept admin-reviewed)`,
        },
      ],
      plan: {
        title: caseFile.title,
        actor: input.actor,
        maxSteps: limits.maxSteps,
        queuedBy: "pb-case",
        worker: "python-research-worker",
        superseded,
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
      superseded,
      note: "External worker polls research_runs; pending rows superseded; web app holds no OpenAI key",
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
