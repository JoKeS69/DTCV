import { unstable_cache } from "next/cache";
import { getCaseBySlug, listPublishedCases, type CaseListQuery } from "@/lib/cases/queries";

/** Cached public case listing — keyed by filter/page. Revalidates every 60s. */
export function listPublishedCasesCached(query: CaseListQuery) {
  const key = JSON.stringify({
    q: query.q ?? "",
    type: query.type ?? "ALL",
    status: query.status ?? "ALL",
    country: query.country ?? "",
    year: query.year ?? "",
    sort: query.sort ?? "updated",
    page: query.page ?? 1,
  });

  return unstable_cache(
    async () => listPublishedCases(query),
    ["cases-list", key],
    { revalidate: 60, tags: ["cases-public"] },
  )();
}

export function getCaseBySlugCached(slug: string) {
  return unstable_cache(
    async () => getCaseBySlug(slug),
    ["case-slug", slug],
    { revalidate: 60, tags: ["cases-public"] },
  )();
}
