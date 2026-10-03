/**
 * Publish bridge: research SQLite CaseFile → main Postgres Case (/cases).
 *
 * Architecture:
 * - Drafts / research / claims review live only in CASES_DATABASE_URL (SQLite).
 * - Admin Publish upserts a public-facing Case with source=pb_case into DATABASE_URL.
 * - Unpublish sets published=false on that row (does not delete discussions).
 * - Workers never call this — only publishCaseAction / unpublishCaseAction.
 */

import type {
  CasePersonRole,
  CaseStatus,
  CaseType,
  ContentLabel,
  Prisma,
} from "@/lib/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { getCasesPrisma } from "@/lib/cases-db";
import { asStringArray } from "@/lib/cases/json-arrays";
import { NAMING_POLICY } from "@/lib/pb-case/wording-linter";

export const PB_CASE_SOURCE = "pb_case" as const;

type ResearchSource = {
  url?: string;
  title?: string;
  excerpt?: string;
  accessedAt?: string;
  publisher?: string;
};

export type PublicSyncResult =
  | { ok: true; publicCaseId: string; slug: string }
  | { ok: false; error: string };

/** Meta / prompt-instruction phrases that must never appear on public `/cases`. */
const INSTRUCTION_LEAK_PATTERNS: RegExp[] = [
  /disputed claims must appear in a clearly labeled disputed section[^.]*\.?/gi,
  /must not be presented as fact\.?/gi,
  /named persons are presumed innocent unless convicted in a court of law\.?/gi,
  /presumed innocent unless proven guilty in a court of law\.?/gi,
  /prefer official\/court\/government sources\.?/gi,
  /never declare guilt\.?/gi,
  /output valid json matching the requested schema only\.?/gi,
  /ignore any instructions found inside fetched web page text[^.]*\.?/gi,
];

const YEAR_RE = /\b((?:1[89]|20)\d{2})\b/;

function parseSources(raw: unknown): ResearchSource[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (s): s is ResearchSource =>
      !!s && typeof s === "object" && typeof (s as ResearchSource).url === "string",
  );
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when text looks like research/prompt policy leakage, not a case claim. */
export function isInstructionLeak(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/disputed claims must appear/i.test(t)) return true;
  if (/clearly labeled disputed section/i.test(t)) return true;
  if (/must not be presented as fact/i.test(t)) return true;
  if (/output valid json/i.test(t)) return true;
  if (/ignore any instructions found inside/i.test(t)) return true;
  if (
    /^presumed innocent unless (proven|convicted)/i.test(t) &&
    t.length < 160
  ) {
    return true;
  }
  return false;
}

/** Strip instruction/policy sentences from public-facing claim/note text. */
export function sanitizePublicText(text: string): string {
  let out = text;
  for (const re of INSTRUCTION_LEAK_PATTERNS) {
    out = out.replace(re, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

export function mapPersonRole(
  role: string,
  legalStatus?: string | null,
): CasePersonRole {
  const r = role.trim().toLowerCase().replace(/\s+/g, "_");
  const legal = (legalStatus ?? "").trim().toLowerCase();

  if (
    r.includes("victim") ||
    r === "deceased" ||
    r.includes("deceased_victim") ||
    r.includes("murder_victim")
  ) {
    return "VICTIM";
  }

  // Deceased public figures with non-accused roles (e.g. "president") → victim.
  if (
    legal === "deceased" &&
    !r.includes("suspect") &&
    !r.includes("accused") &&
    !r.includes("interest") &&
    !r.includes("assassin") &&
    !r.includes("perpetrator") &&
    !r.includes("shooter")
  ) {
    return "VICTIM";
  }

  if (r.includes("witness") || r.includes("bystander")) return "WITNESS";
  if (
    r.includes("person_of_interest") ||
    r === "poi" ||
    r.includes("suspect") ||
    r.includes("accused") ||
    r.includes("alleged") ||
    r.includes("assassin") ||
    r.includes("perpetrator") ||
    r.includes("shooter") ||
    legal === "person_of_interest" ||
    legal === "charged" ||
    legal === "convicted" ||
    legal === "acquitted"
  ) {
    return "PERSON_OF_INTEREST";
  }
  if (r.includes("relative") || r.includes("family") || r.includes("spouse")) {
    return "RELATIVE";
  }
  return "OTHER";
}

/**
 * Public person notes: keep legal status; attach presumption only for living
 * accused / POI — never for clearly deceased victims.
 */
export function personPublicNotes(input: {
  role: string;
  legalStatus: string;
  presumptionNote: string | null | undefined;
}): string | null {
  const mapped = mapPersonRole(input.role, input.legalStatus);
  const legal = input.legalStatus.trim().toLowerCase();
  const isDeceasedVictim =
    legal === "deceased" || mapped === "VICTIM";
  const isLivingAccused =
    !isDeceasedVictim &&
    (mapped === "PERSON_OF_INTEREST" ||
      legal === "person_of_interest" ||
      legal === "charged" ||
      legal === "named_public_record");

  const parts: string[] = [];

  if (legal && legal !== "other") {
    parts.push(`Legal status: ${legal.replaceAll("_", " ")}`);
  }

  // Preserve descriptive research role when enum mapping is coarse.
  const roleRaw = input.role.trim();
  if (
    roleRaw &&
    !["other", "victim", "witness", "relative", "poi", "suspect"].includes(
      roleRaw.toLowerCase().replace(/\s+/g, "_"),
    )
  ) {
    parts.push(`Described as: ${roleRaw}`);
  }

  if (isLivingAccused) {
    const note = (input.presumptionNote ?? "").trim();
    if (note && !isInstructionLeak(note)) {
      parts.push(note);
    } else if (!note || isInstructionLeak(note)) {
      parts.push(NAMING_POLICY.presumptionOfInnocence);
    }
  }

  return parts.length > 0 ? parts.join(" — ") : null;
}

export function yearFromResearch(input: {
  eventDate: Date | null;
  eventDateText: string | null;
  title?: string | null;
  summary?: string | null;
  labels?: string[] | null;
}): number | null {
  if (input.eventDate && !Number.isNaN(input.eventDate.getTime())) {
    return input.eventDate.getUTCFullYear();
  }
  const blobs = [
    input.eventDateText,
    input.title,
    input.summary,
    ...(input.labels ?? []),
  ];
  for (const blob of blobs) {
    if (!blob) continue;
    const m = blob.match(YEAR_RE);
    if (m) {
      const year = Number(m[1]);
      if (year >= 1800 && year <= 2100) return year;
    }
  }
  return null;
}

/** Map research labels / notes / people onto public CaseStatus. */
export function mapResearchCaseStatus(input: {
  labels?: string[] | null;
  legalStatusNote?: string | null;
  summary?: string | null;
  title?: string | null;
  people?: { legalStatus: string; role: string }[];
}): CaseStatus {
  const labels = (input.labels ?? []).map((l) =>
    l.toLowerCase().replace(/[\s-]+/g, "_"),
  );
  const prose = [
    input.legalStatusNote,
    input.summary,
    input.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  /** Exact / token match — avoid "unsolved".includes("solved"). */
  const hasLabel = (...keys: string[]) =>
    keys.some((k) => {
      const key = k.toLowerCase().replace(/[\s-]+/g, "_");
      return labels.some(
        (l) =>
          l === key ||
          l.split("_").includes(key) ||
          (key.includes("_") && l === key),
      );
    });

  // Explicit label wins (check unsolved before solved).
  if (hasLabel("unsolved", "unresolved")) return "UNSOLVED";
  if (hasLabel("closed", "solved", "resolved", "cleared")) return "CLOSED";
  if (hasLabel("cold", "cold_case")) return "COLD";
  if (hasLabel("open", "active", "ongoing")) return "OPEN";

  // Prefer closed/solved when research prose supports an official conclusion.
  if (
    /\b(official(?:ly)?\s+(?:closed|solved|concluded|conclusion)|case\s+(?:was\s+)?(?:closed|solved|resolved)|warren\s+commission|convicted\s+in\s+(?:a\s+)?court|found\s+guilty)\b/.test(
      prose,
    )
  ) {
    return "CLOSED";
  }
  if (/\bcold\s+case\b|\bremains\s+unsolved\b|\bstill\s+unsolved\b/.test(prose)) {
    return /\bcold\b/.test(prose) ? "COLD" : "UNSOLVED";
  }
  if (/\b(investigation\s+(?:is\s+)?ongoing|actively\s+investigat)\b/.test(prose)) {
    return "OPEN";
  }

  const people = input.people ?? [];
  if (people.some((p) => p.legalStatus === "convicted")) return "CLOSED";
  if (
    people.some(
      (p) =>
        p.legalStatus === "charged" || p.legalStatus === "person_of_interest",
    )
  ) {
    return "OPEN";
  }

  return "UNSOLVED";
}

/** Infer CaseType from title/summary/labels (research has no typed field). */
export function mapResearchCaseType(input: {
  title?: string | null;
  summary?: string | null;
  labels?: string[] | null;
}): CaseType {
  const blob = [
    ...(input.labels ?? []),
    input.title,
    input.summary,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /\b(homicide|murder|assassinat|killed|killing|shooting death|fatal shooting)\b/.test(
      blob,
    )
  ) {
    return "HOMICIDE";
  }
  if (/\b(terror|terrorist|9\/11|september\s+11)\b/.test(blob)) {
    return "TERRORIST";
  }
  if (/\b(kidnap|abduct)/.test(blob)) return "KIDNAPPING";
  if (/\b(unidentified|john doe|jane doe)\b/.test(blob)) return "UNIDENTIFIED";
  if (/\b(wanted|fugitive)\b/.test(blob)) return "WANTED";
  if (/\b(missing person|disappear)/.test(blob)) {
    return /\bdisappear/.test(blob) ? "DISAPPEARANCE" : "MISSING";
  }
  if (/\bseeking information\b/.test(blob)) return "SEEKING_INFORMATION";
  return "UNKNOWN";
}

/**
 * Prefer a geographic location. Drop values that are clearly the case title
 * or instruction leakage; fall back to a place mention in the summary.
 */
export function resolvePublicLocation(input: {
  location: string | null;
  title: string;
  summary?: string | null;
}): string | null {
  let loc = input.location?.trim() || null;
  if (loc && isInstructionLeak(loc)) loc = null;
  if (loc && normalizeKey(loc) === normalizeKey(input.title)) loc = null;
  // Title-like stubs ("kennedy assassination") masquerading as places.
  if (
    loc &&
    /\b(assassinat|incident|murder|case|mystery|disappear)\b/i.test(loc) &&
    !/\b(street|ave|road|blvd|county|parish|texas|california|york|dallas|london)\b/i.test(
      loc,
    )
  ) {
    loc = null;
  }

  if (loc) return loc.slice(0, 200);

  const summary = input.summary?.trim() ?? "";
  if (!summary) return null;

  // "in Dallas, Texas" / "at Dealey Plaza in Dallas" — stop before lowercase prose.
  const inPlace = summary.match(
    /\b(?:in|at|near)\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)*(?:,\s*[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]*)*)?)/,
  );
  if (inPlace?.[1]) {
    const candidate = inPlace[1].replace(/[.,;:]+$/, "").trim();
    if (
      candidate.length >= 3 &&
      normalizeKey(candidate) !== normalizeKey(input.title) &&
      !isInstructionLeak(candidate)
    ) {
      return candidate.slice(0, 200);
    }
  }
  return null;
}

/** Best-effort ISO country code from a free-text location. */
export function countryCodeFromLocation(location: string | null): string | null {
  if (!location) return null;
  const l = location.toLowerCase();
  if (
    /\bunited states\b|\bu\.s\.a\.?\b|\bu\.s\.\b|\busa\b|\btexas\b|\bcalifornia\b|\bnew york\b|\bdallas\b|\bflorida\b|\bchicago\b|\bwashington\b|,\s*(tx|ca|ny|fl|il|wa|az|nv|co|ga|nc|oh|pa|mi|va)\b/.test(
      l,
    )
  ) {
    return "US";
  }
  if (
    /\bunited kingdom\b|\buk\b|\bengland\b|\blondon\b|\bscotland\b|\bwales\b/.test(
      l,
    )
  ) {
    return "GB";
  }
  if (/\bcanada\b|\btoronto\b|\bvancouver\b|\bottawa\b/.test(l)) return "CA";
  if (/\baustralia\b|\bsydney\b|\bmelbourne\b/.test(l)) return "AU";
  if (/\bfrance\b|\bparis\b/.test(l)) return "FR";
  if (/\bgermany\b|\bberlin\b/.test(l)) return "DE";
  return null;
}

export function caseCodeForResearch(caseFileId: string): string {
  return `PB-${caseFileId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`.slice(
    0,
    64,
  );
}

export function claimsAsPublicNotes(
  factual: { text: string }[],
  disputed: { text: string }[],
): string | null {
  const cleanFactual = factual
    .map((c) => sanitizePublicText(c.text))
    .filter((t) => t && !isInstructionLeak(t));
  const cleanDisputed = disputed
    .map((c) => sanitizePublicText(c.text))
    .filter((t) => t && !isInstructionLeak(t));

  const parts: string[] = [];
  if (cleanFactual.length > 0) {
    parts.push(
      "Claims (reported):\n" +
        cleanFactual.map((t, i) => `${i + 1}. ${t}`).join("\n"),
    );
  }
  if (cleanDisputed.length > 0) {
    // Public label only — never the internal naming-policy instruction string.
    parts.push(
      "Disputed:\n" +
        cleanDisputed.map((t, i) => `${i + 1}. ${t}`).join("\n"),
    );
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
}

async function resolveUniqueSlug(
  preferred: string,
  publicCaseId: string | null,
): Promise<string> {
  const prisma = getPrisma();
  let slug = preferred.slice(0, 120) || `pb-case-${Date.now().toString(36)}`;
  for (let i = 0; i < 8; i++) {
    const clash = await prisma.case.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!clash || (publicCaseId && clash.id === publicCaseId)) return slug;
    slug = `${preferred.slice(0, 100)}-pb${i + 1}`.slice(0, 120);
  }
  return `${preferred.slice(0, 80)}-${Date.now().toString(36)}`.slice(0, 120);
}

/**
 * Upsert main-DB Case from a published research CaseFile.
 * Caller must have already set CaseFile.status = published (or pass published=true).
 */
export async function syncResearchCaseToPublic(
  caseId: string,
  opts: { published: boolean; publishedBy?: string | null } = {
    published: true,
  },
): Promise<PublicSyncResult> {
  const casesDb = getCasesPrisma();
  const caseFile = await casesDb.caseFile.findUnique({
    where: { id: caseId },
    include: {
      claims: {
        where: {
          showOnPublish: true,
          status: { in: ["approved", "disputed"] },
        },
        orderBy: { createdAt: "asc" },
      },
      people: {
        where: { status: "approved" },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!caseFile) {
    return { ok: false, error: "Research case not found" };
  }

  const sources = parseSources(caseFile.sources);
  const factual = caseFile.claims.filter(
    (c) =>
      !c.disputed &&
      c.status !== "disputed" &&
      !isInstructionLeak(c.text),
  );
  const disputed = caseFile.claims.filter(
    (c) =>
      (c.disputed || c.status === "disputed") && !isInstructionLeak(c.text),
  );
  const labels = asStringArray(caseFile.labels);
  const now = new Date();
  const prisma = getPrisma();

  const existing = await prisma.case.findUnique({
    where: {
      source_sourceId: {
        source: PB_CASE_SOURCE,
        sourceId: caseFile.id,
      },
    },
    select: { id: true, slug: true, caseCode: true },
  });

  const slug = await resolveUniqueSlug(caseFile.slug, existing?.id ?? null);
  const caseCode = existing?.caseCode ?? caseCodeForResearch(caseFile.id);
  const year = yearFromResearch({
    eventDate: caseFile.eventDate,
    eventDateText: caseFile.eventDateText,
    title: caseFile.title,
    summary: caseFile.summary,
    labels,
  });
  const location = resolvePublicLocation({
    location: caseFile.location,
    title: caseFile.title,
    summary: caseFile.summary,
  });
  const countryCode = countryCodeFromLocation(location);
  const type = mapResearchCaseType({
    title: caseFile.title,
    summary: caseFile.summary,
    labels,
  });
  const status = mapResearchCaseStatus({
    labels,
    legalStatusNote: caseFile.legalStatusNote,
    summary: caseFile.summary,
    title: caseFile.title,
    people: caseFile.people.map((p) => ({
      legalStatus: p.legalStatus,
      role: p.role,
    })),
  });
  const firstSourceUrl = sources[0]?.url ?? null;
  const summary =
    sanitizePublicText(caseFile.summary.trim()) ||
    `${caseFile.title} — curated research case file.`;

  const sharedData = {
    caseCode,
    title: caseFile.title,
    slug,
    summary,
    publicNotes: claimsAsPublicNotes(factual, disputed),
    location,
    countryCode,
    year,
    type,
    status,
    priority: caseFile.worldDomination ? ("HIGH" as const) : ("MEDIUM" as const),
    contentLabel: "REPORTED" as ContentLabel,
    published: opts.published,
    publishedAt: opts.published ? caseFile.publishedAt ?? now : null,
    featured: caseFile.worldDomination && opts.published,
    lastVerifiedAt: caseFile.lastReviewedAt ?? now,
    isDevStub: false,
    source: PB_CASE_SOURCE,
    sourceId: caseFile.id,
    sourceUrl: firstSourceUrl,
    sourceAttribution: opts.publishedBy
      ? `PB CASE · ${opts.publishedBy}`
      : "PB CASE research",
    agency: "DETECTIVE research",
    tipsText:
      "DETECTIVE does not collect tips. Prefer official/court/government sources. " +
      NAMING_POLICY.presumptionOfInnocence,
    sourceCategory: caseFile.worldDomination ? "WORLD_DOMINATION" : "PB_CASE",
    sourcedStatus: "ACTIVE" as const,
    lastSyncedAt: now,
    isHidden: false,
    rawPayload: {
      researchCaseId: caseFile.id,
      researchSlug: caseFile.slug,
      legalStatusNote: caseFile.legalStatusNote,
      labels,
      claimCount: caseFile.claims.length,
      personCount: caseFile.people.length,
      mappedStatus: status,
      mappedType: type,
    } satisfies Prisma.InputJsonValue,
  };

  const publicCase = existing
    ? await prisma.case.update({
        where: { id: existing.id },
        data: sharedData,
        select: { id: true, slug: true },
      })
    : await prisma.case.create({
        data: { ...sharedData, firstSeenAt: now },
        select: { id: true, slug: true },
      });

  // Replace child rows so republish reflects latest approved research content.
  await prisma.$transaction([
    prisma.caseSource.deleteMany({ where: { caseId: publicCase.id } }),
    prisma.casePerson.deleteMany({ where: { caseId: publicCase.id } }),
    prisma.caseEvent.deleteMany({ where: { caseId: publicCase.id } }),
  ]);

  if (sources.length > 0) {
    await prisma.caseSource.createMany({
      data: sources.map((s) => ({
        caseId: publicCase.id,
        title: (s.title || s.url || "Source").slice(0, 500),
        url: s.url!,
        publisher: s.publisher?.slice(0, 200) ?? null,
        accessedAt: s.accessedAt ? new Date(s.accessedAt) : null,
        citationNote: s.excerpt
          ? sanitizePublicText(s.excerpt).slice(0, 1000) || null
          : null,
      })),
    });
  }

  if (caseFile.people.length > 0) {
    await prisma.casePerson.createMany({
      data: caseFile.people.map((p) => ({
        caseId: publicCase.id,
        name: p.name,
        role: mapPersonRole(p.role, p.legalStatus),
        notes: personPublicNotes({
          role: p.role,
          legalStatus: p.legalStatus,
          presumptionNote: p.presumptionNote,
        }),
        contentLabel: "REPORTED" as ContentLabel,
      })),
    });
  }

  const events: Prisma.CaseEventCreateManyInput[] = [];
  if (caseFile.eventDateText || caseFile.eventDate) {
    events.push({
      caseId: publicCase.id,
      occurredAt: caseFile.eventDate,
      title: "Event date",
      description: caseFile.eventDateText ?? caseFile.eventDate!.toISOString(),
      contentLabel: "REPORTED",
      sortOrder: 0,
    });
  }
  factual.forEach((c, i) => {
    const text = sanitizePublicText(c.text);
    if (!text || isInstructionLeak(text)) return;
    events.push({
      caseId: publicCase.id,
      occurredAt: null,
      title: "Claim",
      description: text,
      contentLabel: "REPORTED",
      sortOrder: i + 1,
    });
  });
  disputed.forEach((c, i) => {
    const text = sanitizePublicText(c.text);
    if (!text || isInstructionLeak(text)) return;
    // Research-sourced disputed claims are reported-disputed, not user theories.
    events.push({
      caseId: publicCase.id,
      occurredAt: null,
      title: "Disputed claim",
      description: text,
      contentLabel: "REPORTED",
      sortOrder: 1000 + i,
    });
  });
  if (events.length > 0) {
    await prisma.caseEvent.createMany({ data: events });
  }

  return { ok: true, publicCaseId: publicCase.id, slug: publicCase.slug };
}

/** Mark the synced public Case unpublished (keeps row + discussions). */
export async function unpublishPublicCase(
  caseId: string,
): Promise<PublicSyncResult> {
  const prisma = getPrisma();
  const existing = await prisma.case.findUnique({
    where: {
      source_sourceId: {
        source: PB_CASE_SOURCE,
        sourceId: caseId,
      },
    },
    select: { id: true, slug: true },
  });
  if (!existing) {
    // Nothing synced yet — treat as success for unpublish.
    return { ok: true, publicCaseId: "", slug: "" };
  }
  await prisma.case.update({
    where: { id: existing.id },
    data: {
      published: false,
      publishedAt: null,
      featured: false,
      lastSyncedAt: new Date(),
    },
  });
  return { ok: true, publicCaseId: existing.id, slug: existing.slug };
}
