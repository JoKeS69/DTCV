/**
 * Trending discovery — candidates only.
 * No deep research / publish until admin accepts.
 * Uses Brave search + OPENAI_MODEL_LIGHT for cheap scoring when configured.
 */

import { getCasesPrisma } from "@/lib/cases-db";
import { writeAuditLog } from "@/lib/pb-case/audit";
import {
  createOpenAiClientAdapter,
  createSearchAdapter,
} from "@/lib/research/adapters";
import { isUrlAllowlisted } from "@/lib/research/fetch";
import { parseTrendingScoreStrict } from "@/lib/research/schema";

const SEED_QUERIES = [
  "unsolved case official investigation",
  "cold case court filing",
  "missing persons public alert",
];

async function scoreCandidate(input: {
  title: string;
  snippet?: string;
  url: string;
}): Promise<{ score: number; rationale: string }> {
  const llm = createOpenAiClientAdapter();
  if (!llm.configured) {
    return {
      score: 0.5,
      rationale: input.snippet?.slice(0, 500) || "Discovered via trending search",
    };
  }
  try {
    const result = await llm.complete({
      role: "light",
      schemaMode: "trending_score",
      messages: [
        {
          role: "system",
          content:
            "Score trending case candidates 0..1 for public-interest cold/unsolved investigations. Prefer official sources. JSON only. Never invent facts.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            snippet: input.snippet ?? "",
            url: input.url,
          }),
        },
      ],
    });
    return parseTrendingScoreStrict(result.content);
  } catch {
    return {
      score: 0.5,
      rationale: input.snippet?.slice(0, 500) || "Scoring unavailable",
    };
  }
}

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

      const scored = await scoreCandidate({
        title: hit.title,
        snippet: hit.snippet,
        url: hit.url,
      });

      await db.candidate.create({
        data: {
          title: hit.title.slice(0, 300),
          rationale: scored.rationale.slice(0, 500),
          score: scored.score,
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
