import { asStringArray } from "@/lib/cases/json-arrays";
import type {
  BoardConnection,
  CaseLogEntry,
  ChatHistory,
  InvestigationCaseDraft,
  InvestigationFieldAgent,
  InvestigationLocation,
  InvestigationSuspect,
  PublicLocation,
  PublicSuspect,
  SolutionReveal,
} from "./types";
import { DEFAULT_FIELD_AGENTS } from "./types";

export function parseVictims(raw: unknown): string[] {
  return asStringArray(raw);
}

export function parseLocations(raw: unknown): InvestigationLocation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const id = String(o.id ?? "").trim();
      const name = String(o.name ?? "").trim();
      const clue = String(o.clue ?? "").trim();
      if (!id || !name || !clue) return null;
      return { id, name, clue };
    })
    .filter(Boolean) as InvestigationLocation[];
}

export function parseSuspects(raw: unknown): InvestigationSuspect[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const id = String(o.id ?? "").trim();
      if (!id) return null;
      return {
        id,
        name: String(o.name ?? "").trim(),
        role: String(o.role ?? "").trim(),
        personality: String(o.personality ?? "").trim(),
        motive: String(o.motive ?? "").trim(),
        background: String(o.background ?? "").trim(),
        alibi: String(o.alibi ?? "").trim(),
        statement: String(o.statement ?? "").trim(),
        isGuilty: Boolean(o.isGuilty),
        evidenceTitle: String(o.evidenceTitle ?? "").trim(),
        evidenceDetail: String(o.evidenceDetail ?? "").trim(),
      };
    })
    .filter(Boolean) as InvestigationSuspect[];
}

export function parseFieldAgents(raw: unknown): InvestigationFieldAgent[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_FIELD_AGENTS;
  const agents = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const id = String(o.id ?? "").trim();
      if (!id) return null;
      return {
        id,
        name: String(o.name ?? "").trim(),
        role: String(o.role ?? "").trim(),
        specialty: String(o.specialty ?? "").trim(),
      };
    })
    .filter(Boolean) as InvestigationFieldAgent[];
  return agents.length ? agents : DEFAULT_FIELD_AGENTS;
}

export function parseStringIdArray(raw: unknown): string[] {
  return asStringArray(raw);
}

export function parseBoardConnections(raw: unknown): BoardConnection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const suspectId = String(o.suspectId ?? "").trim();
      const clueId = String(o.clueId ?? "").trim();
      if (!suspectId || !clueId) return null;
      return { suspectId, clueId };
    })
    .filter(Boolean) as BoardConnection[];
}

export function parseCaseLog(raw: unknown): CaseLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      return {
        at: String(o.at ?? ""),
        kind: String(o.kind ?? ""),
        text: String(o.text ?? ""),
      };
    })
    .filter((e) => e && e.text) as CaseLogEntry[];
}

export function parseChatHistory(raw: unknown): ChatHistory {
  if (!raw || typeof raw !== "object") return {};
  return raw as ChatHistory;
}

export function rowToDraft(row: {
  slug: string;
  title: string;
  teaser: string;
  victims: unknown;
  location: string;
  discoveryReport: string;
  weaponName: string;
  weaponTrait: string;
  locations: unknown;
  suspects: unknown;
  hasTwist: boolean;
  twistNote: string | null;
  darkerTheme: boolean;
  fieldAgents: unknown;
}): InvestigationCaseDraft {
  return {
    slug: row.slug,
    title: row.title,
    teaser: row.teaser,
    victims: parseVictims(row.victims),
    location: row.location,
    discoveryReport: row.discoveryReport,
    weapon: { name: row.weaponName, trait: row.weaponTrait },
    locations: parseLocations(row.locations),
    suspects: parseSuspects(row.suspects),
    hasTwist: row.hasTwist,
    twistNote: row.twistNote,
    darkerTheme: row.darkerTheme,
    fieldAgents: parseFieldAgents(row.fieldAgents),
  };
}

export function draftToCreateData(
  draft: InvestigationCaseDraft,
  status: "draft" | "published",
  publishedBy?: string,
) {
  const now = status === "published" ? new Date() : null;
  return {
    slug: draft.slug,
    title: draft.title,
    teaser: draft.teaser,
    victims: draft.victims,
    location: draft.location,
    discoveryReport: draft.discoveryReport,
    weaponName: draft.weapon.name,
    weaponTrait: draft.weapon.trait,
    locations: draft.locations,
    suspects: draft.suspects,
    hasTwist: Boolean(draft.hasTwist),
    twistNote: draft.twistNote ?? null,
    darkerTheme: Boolean(draft.darkerTheme),
    fieldAgents: draft.fieldAgents ?? DEFAULT_FIELD_AGENTS,
    status,
    publishedAt: now,
    publishedBy: publishedBy ?? null,
  };
}

export function toPublicSuspects(
  suspects: InvestigationSuspect[],
  reviewedIds: string[],
): PublicSuspect[] {
  const reviewed = new Set(reviewedIds);
  return suspects.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    personality: s.personality,
    alibi: s.alibi,
    statement: s.statement,
    reviewed: reviewed.has(s.id),
  }));
}

export function toPublicLocations(
  locations: InvestigationLocation[],
  inspectedIds: string[],
): PublicLocation[] {
  const inspected = new Set(inspectedIds);
  return locations.map((l) => ({
    id: l.id,
    name: l.name,
    inspected: inspected.has(l.id),
    clue: inspected.has(l.id) ? l.clue : null,
  }));
}

export function discoveredClueNodes(
  locations: InvestigationLocation[],
  inspectedIds: string[],
): { id: string; label: string; clue: string | null }[] {
  const inspected = new Set(inspectedIds);
  return locations.map((l) =>
    inspected.has(l.id)
      ? { id: l.id, label: l.name, clue: l.clue }
      : { id: l.id, label: "??? (uninspected)", clue: null },
  );
}

export function isSolutionReveal(raw: unknown): raw is SolutionReveal {
  return Boolean(raw && typeof raw === "object" && "culpritId" in (raw as object));
}
