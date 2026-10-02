/**
 * Trending discovery — candidates only.
 *
 * LLM + Brave scoring runs on the external Python worker
 * (`python -m research_worker trending`), not in Next.js.
 * This module keeps the re-verify flag job (DB-only, no LLM).
 */

import { getCasesPrisma } from "@/lib/cases-db";
import { writeAuditLog } from "@/lib/pb-case/audit";

/**
 * Stub for the web cron: does not call OpenAI/Brave.
 * Schedule trending on the research-worker host instead.
 */
export async function runTrendingDiscovery(actor = "cron:trending"): Promise<{
  created: number;
  deferredToWorker: true;
  message: string;
}> {
  await writeAuditLog({
    actor,
    action: "trending.discovery.deferred",
    entityType: "candidate",
    meta: {
      created: 0,
      note: "Trending LLM/search runs on python research-worker only",
    },
  });
  return {
    created: 0,
    deferredToWorker: true,
    message:
      "Trending discovery runs on the external Python research worker (DB/cron). Next.js does not hold OpenAI/Brave keys.",
  };
}

/** Weekly re-verify flag job — marks published cases needing review (DB only). */
export async function flagCasesForReverify(actor = "cron:reverify"): Promise<{
  flagged: number;
}> {
  const db = getCasesPrisma();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = await db.caseFile.updateMany({
    where: {
      status: "published",
      OR: [
        { lastReviewedAt: null },
        { lastReviewedAt: { lt: weekAgo } },
      ],
    },
    data: { needsReverify: true },
  });

  await writeAuditLog({
    actor,
    action: "reverify.flag",
    entityType: "case",
    meta: { flagged: result.count },
  });

  return { flagged: result.count };
}
