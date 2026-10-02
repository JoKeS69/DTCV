/**
 * Trending discovery — candidates only.
 * No deep research / publish until admin accepts.
 */

import { getCasesPrisma } from "@/lib/cases-db";
import { writeAuditLog } from "@/lib/pb-case/audit";
import { createSearchAdapter } from "@/lib/research/adapters";
import { isUrlAllowlisted } from "@/lib/research/fetch";

const SEED_QUERIES = [
  "unsolved case official investigation",
  "cold case court filing",
  "missing persons public alert",
];

export async function runTrendingDiscovery(actor = "cron:trending"): Promise<{
  created: number;
}> {
  const db = getCasesPrisma();
  const search = createSearchAdapter();
  let created = 0;

  for (const q of SEED_QUERIES) {
    const hits = await search.search(q, 5);
    for (const hit of hits) {
      if (!isUrlAllowlisted(hit.url)) continue;
      const existing = await db.candidate.findFirst({
        where: {
          title: hit.title,
          status: { in: ["new", "accepted"] },
        },
      });
      if (existing) continue;
      await db.candidate.create({
        data: {
          title: hit.title.slice(0, 300),
          rationale: hit.snippet?.slice(0, 500) || `Discovered via query: ${q}`,
          score: 0.5,
          status: "new",
          sourceUrls: [hit.url],
        },
      });
      created += 1;
    }
  }

  await writeAuditLog({
    actor,
    action: "trending.discovery",
    entityType: "candidate",
    meta: { created },
  });

  return { created };
}

/** Weekly re-verify flag job stub — marks published cases needing review. */
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
