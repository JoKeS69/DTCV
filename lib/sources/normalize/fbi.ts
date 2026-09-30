/**
 * FBI Wanted API normalizer.
 * Endpoint inspected live: https://api.fbi.gov/wanted/v1/list
 * Response shape: { total, page, items: [{ uid, title, subjects, url, ... }] }
 */

import type { CaseType, SourcedCaseStatus } from "@/lib/generated/prisma/client";
import {
  asString,
  asStringArray,
  stableHash,
  stripHtml,
} from "@/lib/sources/http";
import type { NormalizedCaseImage, NormalizedCaseRecord } from "@/lib/sources/types";

/** Subjects we ingest (wanted + missing/unidentified). Art crimes excluded. */
export const FBI_INCLUDED_SUBJECTS = [
  "Ten Most Wanted Fugitives",
  "Kidnappings and Missing Persons",
  "Parental Kidnapping",
  "ViCAP Missing Persons",
  "ECAP",
  "Endangered Child Alert Program",
  "Crimes Against Children",
  "Seeking Information",
  "Seeking Information - Terrorism",
  "ViCAP Unidentified Persons",
  "Most Wanted Terrorists",
] as const;

const ART_SUBJECT_RE = /\bart\b/i;

export function fbiSubjectsAllowed(subjects: string[]): boolean {
  if (subjects.some((s) => ART_SUBJECT_RE.test(s))) return false;
  const set = new Set(FBI_INCLUDED_SUBJECTS.map((s) => s.toLowerCase()));
  return subjects.some((s) => set.has(s.toLowerCase()));
}

export function mapFbiCategory(subjects: string[]): string | null {
  const lower = subjects.map((s) => s.toLowerCase());
  if (lower.some((s) => s.includes("ten most wanted"))) return "TEN_MOST_WANTED";
  if (lower.some((s) => s.includes("most wanted terrorists")))
    return "MOST_WANTED_TERRORISTS";
  if (lower.some((s) => s.includes("unidentified"))) return "VICAP_UNIDENTIFIED";
  if (
    lower.some(
      (s) =>
        s.includes("ecap") ||
        s.includes("endangered child") ||
        s.includes("crimes against children"),
    )
  )
    return "ECAP";
  if (lower.some((s) => s.includes("seeking information")))
    return "SEEKING_INFORMATION";
  if (
    lower.some(
      (s) =>
        s.includes("kidnap") ||
        s.includes("missing"),
    )
  )
    return "KIDNAPPINGS_MISSING";
  return subjects[0] ?? null;
}

export function mapFbiCaseType(subjects: string[]): CaseType {
  const cat = mapFbiCategory(subjects);
  switch (cat) {
    case "TEN_MOST_WANTED":
    case "MOST_WANTED_TERRORISTS":
      return cat === "MOST_WANTED_TERRORISTS" ? "TERRORIST" : "WANTED";
    case "VICAP_UNIDENTIFIED":
      return "UNIDENTIFIED";
    case "ECAP":
    case "KIDNAPPINGS_MISSING":
      return subjects.some((s) => /kidnap/i.test(s)) ? "KIDNAPPING" : "MISSING";
    case "SEEKING_INFORMATION":
      return "SEEKING_INFORMATION";
    default:
      return "WANTED";
  }
}

export function mapFbiStatus(raw: unknown): SourcedCaseStatus {
  const s = asString(raw)?.toLowerCase() ?? "";
  if (!s || s === "na") return "ACTIVE";
  if (s.includes("capture") || s.includes("located")) return "CAPTURED";
  if (s.includes("recover")) return "RECOVERED";
  if (s.includes("deceased") || s.includes("dead")) return "DECEASED";
  return "ACTIVE";
}

function mapImages(raw: unknown): NormalizedCaseImage[] {
  if (!Array.isArray(raw)) return [];
  const out: NormalizedCaseImage[] = [];
  for (const img of raw) {
    if (!img || typeof img !== "object") continue;
    const row = img as Record<string, unknown>;
    const url =
      asString(row.large) ??
      asString(row.original) ??
      asString(row.thumb) ??
      asString(row.url);
    if (!url) continue;
    out.push({
      url,
      thumb: asString(row.thumb),
      caption: asString(row.caption),
    });
  }
  return out;
}

function locationFromItem(item: Record<string, unknown>): string | null {
  const parts = [
    ...asStringArray(item.field_offices),
    ...asStringArray(item.possible_states),
    ...asStringArray(item.locations),
    asString(item.place_of_birth),
  ].filter(Boolean);
  return parts.length ? parts.slice(0, 4).join(", ") : null;
}

function yearFromItem(item: Record<string, unknown>): number | null {
  const pub = asString(item.publication) ?? asString(item.modified);
  if (!pub) return null;
  const y = Number(pub.slice(0, 4));
  return Number.isFinite(y) && y >= 1900 && y <= 2100 ? y : null;
}

function summaryFromItem(item: Record<string, unknown>): string {
  const parts = [
    stripHtml(asString(item.description)),
    stripHtml(asString(item.details)),
    stripHtml(asString(item.caution)),
    stripHtml(asString(item.remarks)),
    asString(item.warning_message),
    asString(item.reward_text),
  ].filter(Boolean);
  return parts.join("\n\n").slice(0, 8000) || "FBI Wanted listing — see official source.";
}

/**
 * Normalize one FBI Wanted list item. Returns null when out of scope / unusable.
 */
export function normalizeFbiItem(
  raw: unknown,
): NormalizedCaseRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const sourceId = asString(item.uid);
  const title = asString(item.title);
  const sourceUrl = asString(item.url);
  if (!sourceId || !title || !sourceUrl) return null;

  const subjects = asStringArray(item.subjects);
  if (!fbiSubjectsAllowed(subjects)) return null;

  const aliases = asStringArray(item.aliases);
  const images = mapImages(item.images);
  const sourcedStatus = mapFbiStatus(item.status);
  const caseType = mapFbiCaseType(subjects);
  const sourceCategory = mapFbiCategory(subjects);
  const sourceModifiedAt = (() => {
    const m = asString(item.modified);
    if (!m) return null;
    const d = new Date(m);
    return Number.isNaN(d.getTime()) ? null : d;
  })();

  const demographics = {
    sex: asString(item.sex),
    race: asString(item.race_raw) ?? asString(item.race),
    nationality: asString(item.nationality),
    datesOfBirth: asStringArray(item.dates_of_birth_used),
    ageMin: item.age_min ?? null,
    ageMax: item.age_max ?? null,
    ageRange: asString(item.age_range),
    placeOfBirth: asString(item.place_of_birth),
  };

  const physical = {
    hair: asString(item.hair_raw) ?? asString(item.hair),
    eyes: asString(item.eyes_raw) ?? asString(item.eyes),
    heightMin: item.height_min ?? null,
    heightMax: item.height_max ?? null,
    weight: asString(item.weight),
    weightMin: item.weight_min ?? null,
    weightMax: item.weight_max ?? null,
    scarsAndMarks: asString(item.scars_and_marks),
    warning: asString(item.warning_message),
  };

  const tipsParts = [
    asString(item.reward_text),
    "Submit tips only via the official FBI Wanted poster linked as Source.",
  ].filter(Boolean);

  const hashPayload = {
    sourceId,
    title,
    subjects,
    status: asString(item.status),
    modified: asString(item.modified),
    description: asString(item.description),
    details: asString(item.details),
    caution: asString(item.caution),
    remarks: asString(item.remarks),
    images: images.map((i) => i.url),
    aliases,
  };

  // Keep a trimmed raw for admin — avoid dumping huge HTML blobs twice.
  const rawPayload: Record<string, unknown> = {
    uid: sourceId,
    title,
    subjects,
    status: item.status ?? null,
    url: sourceUrl,
    path: item.path ?? null,
    modified: item.modified ?? null,
    publication: item.publication ?? null,
    field_offices: item.field_offices ?? null,
    warning_message: item.warning_message ?? null,
  };

  return {
    source: "fbi",
    sourceId,
    sourceUrl,
    sourceAttribution: "Federal Bureau of Investigation (FBI Wanted)",
    name: title,
    aliases,
    summary: summaryFromItem(item),
    caseType,
    sourcedStatus,
    sourceCategory,
    location: locationFromItem(item),
    countryCode: "US",
    year: yearFromItem(item),
    agency: "FBI",
    lastKnown: locationFromItem(item),
    tipsText: tipsParts.join(" "),
    demographics,
    physical,
    images,
    sourceModifiedAt,
    rawPayload,
    contentHash: stableHash(hashPayload),
  };
}
