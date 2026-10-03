/**
 * PB CASE review-row dedupe (people by normalized name, claims by near-text).
 * Used by admin "Deduplicate review rows" and optionally when queueing research.
 */

export function normalizePersonName(name: string): string {
  return name
    .trim()
    .replace(/^(mr|mrs|ms|miss|dr|prof|sir|lady|lord|judge|justice)\.?\s+/i, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeClaimText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function claimSimilarity(a: string, b: string): number {
  const na = normalizeClaimText(a);
  const nb = normalizeClaimText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.length > 40 && (na.includes(nb) || nb.includes(na))) return 0.95;
  const ta = new Set(na.split(" ").filter((t) => t.length > 2));
  const tb = new Set(nb.split(" ").filter((t) => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  const jaccard = inter / union;
  // Cheap length ratio as stand-in for sequence match
  const lenRatio =
    Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
  return Math.max(jaccard, lenRatio * jaccard);
}

const CLAIM_STATUS_RANK: Record<string, number> = {
  approved: 40,
  disputed: 30,
  rejected: 25,
  pending: 10,
};

const PERSON_STATUS_RANK: Record<string, number> = {
  approved: 40,
  rejected: 25,
  pending: 10,
};

export type ReviewClaim = {
  id: string;
  text: string;
  status: string;
  disputed: boolean;
  sources: unknown;
};

export type ReviewPerson = {
  id: string;
  name: string;
  status: string;
  role: string;
  legalStatus: string;
  sources: unknown;
};

function asUrlList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((x) => (typeof x === "string" ? x : String((x as { url?: string })?.url || "")))
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      return asUrlList(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export function planClaimCollapse(claims: ReviewClaim[]): {
  survivorId: string;
  deleteIds: string[];
  mergedSources: string[];
}[] {
  const plans: {
    survivorId: string;
    deleteIds: string[];
    mergedSources: string[];
  }[] = [];
  const used = new Set<string>();
  for (let i = 0; i < claims.length; i++) {
    if (used.has(claims[i].id)) continue;
    const group = [claims[i]];
    for (let j = i + 1; j < claims.length; j++) {
      if (used.has(claims[j].id)) continue;
      if (claimSimilarity(claims[i].text, claims[j].text) >= 0.78) {
        group.push(claims[j]);
      }
    }
    if (group.length === 1) continue;
    group.sort(
      (a, b) =>
        (CLAIM_STATUS_RANK[b.status] || 0) - (CLAIM_STATUS_RANK[a.status] || 0),
    );
    const survivor = group[0];
    const deleteIds = group.slice(1).map((g) => g.id);
    for (const g of group) used.add(g.id);
    const mergedSources = Array.from(
      new Set(group.flatMap((g) => asUrlList(g.sources))),
    );
    plans.push({ survivorId: survivor.id, deleteIds, mergedSources });
  }
  return plans;
}

export function planPersonCollapse(people: ReviewPerson[]): {
  survivorId: string;
  deleteIds: string[];
  mergedSources: string[];
  role: string;
  legalStatus: string;
  name: string;
}[] {
  const byKey = new Map<string, ReviewPerson[]>();
  for (const p of people) {
    const key = normalizePersonName(p.name);
    if (!key) continue;
    const list = byKey.get(key) || [];
    list.push(p);
    byKey.set(key, list);
  }
  const plans: {
    survivorId: string;
    deleteIds: string[];
    mergedSources: string[];
    role: string;
    legalStatus: string;
    name: string;
  }[] = [];
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    group.sort(
      (a, b) =>
        (PERSON_STATUS_RANK[b.status] || 0) - (PERSON_STATUS_RANK[a.status] || 0),
    );
    const survivor = group[0];
    const deleteIds = group.slice(1).map((g) => g.id);
    let role = survivor.role;
    // Prefer subject over mistaken victim when collapsing same person.
    if (group.some((g) => /subject|hijacker|terrorist|perpetrator|attacker|organizer/i.test(g.role))) {
      role = "subject";
    } else if (group.some((g) => /victim/i.test(g.role))) {
      role = "victim";
    }
    const legalRank: Record<string, number> = {
      convicted: 70,
      acquitted: 65,
      charged: 60,
      deceased: 55,
      person_of_interest: 40,
      named_public_record: 30,
      unidentified: 10,
      other: 0,
    };
    let legalStatus = survivor.legalStatus;
    for (const g of group) {
      if ((legalRank[g.legalStatus] || 0) > (legalRank[legalStatus] || 0)) {
        legalStatus = g.legalStatus;
      }
    }
    const name = group.reduce((best, g) =>
      g.name.length >= best.length ? g.name : best,
    survivor.name);
    plans.push({
      survivorId: survivor.id,
      deleteIds,
      mergedSources: Array.from(
        new Set(group.flatMap((g) => asUrlList(g.sources))),
      ),
      role,
      legalStatus,
      name,
    });
  }
  return plans;
}
