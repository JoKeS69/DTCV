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
  CaseType,
  ContentLabel,
  Prisma,
} from "@/lib/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { getCasesPrisma } from "@/lib/cases-db";
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

function parseSources(raw: unknown): ResearchSource[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (s): s is ResearchSource =>
      !!s && typeof s === "object" && typeof (s as ResearchSource).url === "string",
  );
}

export function mapPersonRole(role: string): CasePersonRole {
  const r = role.trim().toLowerCase().replace(/\s+/g, "_");
  switch (r) {
    case "victim":
      return "VICTIM";
    case "witness":
      return "WITNESS";
    case "person_of_interest":
    case "poi":
    case "suspect":
      return "PERSON_OF_INTEREST";
    case "relative":
    case "family":
      return "RELATIVE";
    default:
      return "OTHER";
  }
}

export function yearFromResearch(input: {
  eventDate: Date | null;
  eventDateText: string | null;
}): number | null {
  if (input.eventDate) return input.eventDate.getUTCFullYear();
  const m = input.eventDateText?.match(/\b(1[89]\d{2}|20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

export function caseCodeForResearch(caseFileId: string): string {
  return `PB-${caseFileId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`.slice(
    0,
    64,
  );
}

function claimsAsPublicNotes(
  factual: { text: string }[],
  disputed: { text: string }[],
): string | null {
  const parts: string[] = [];
  if (factual.length > 0) {
    parts.push(
      "Claims (reported):\n" +
        factual.map((c, i) => `${i + 1}. ${c.text}`).join("\n"),
    );
  }
  if (disputed.length > 0) {
    parts.push(
      `${NAMING_POLICY.disputedClaimsSection}\n` +
        disputed.map((c, i) => `${i + 1}. ${c.text}`).join("\n"),
    );
  }
  parts.push(NAMING_POLICY.presumptionOfInnocence);
  return parts.join("\n\n") || null;
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
    (c) => !c.disputed && c.status !== "disputed",
  );
  const disputed = caseFile.claims.filter(
    (c) => c.disputed || c.status === "disputed",
  );
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
  });
  const firstSourceUrl = sources[0]?.url ?? null;
  const summary =
    caseFile.summary.trim() ||
    `${caseFile.title} — curated research case file. ${NAMING_POLICY.presumptionOfInnocence}`;

  const sharedData = {
    caseCode,
    title: caseFile.title,
    slug,
    summary,
    publicNotes: claimsAsPublicNotes(factual, disputed),
    location: caseFile.location,
    countryCode: null as string | null,
    year,
    type: "OTHER" as CaseType,
    status: "UNSOLVED" as const,
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
      labels: caseFile.labels,
      claimCount: caseFile.claims.length,
      personCount: caseFile.people.length,
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
        citationNote: s.excerpt?.slice(0, 1000) ?? null,
      })),
    });
  }

  if (caseFile.people.length > 0) {
    await prisma.casePerson.createMany({
      data: caseFile.people.map((p) => ({
        caseId: publicCase.id,
        name: p.name,
        role: mapPersonRole(p.role),
        notes: [
          `Legal status: ${p.legalStatus.replaceAll("_", " ")}`,
          p.presumptionNote,
        ]
          .filter(Boolean)
          .join(" — "),
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
    events.push({
      caseId: publicCase.id,
      occurredAt: null,
      title: "Claim",
      description: c.text,
      contentLabel: "REPORTED",
      sortOrder: i + 1,
    });
  });
  disputed.forEach((c, i) => {
    events.push({
      caseId: publicCase.id,
      occurredAt: null,
      title: "Disputed claim",
      description: c.text,
      contentLabel: "USER_THEORY",
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
