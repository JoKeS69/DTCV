import type {
  HudActivity,
  HudCase,
  HudCaseStatus,
  HudDiscussion,
  HudStats,
} from "@/lib/cases/hud-types";
import type { CaseStatusCounts, TopLocation } from "@/lib/cases/dashboard";
import { coerceDate, type DateLike } from "@/lib/format-date";

/** Relative HUD label; accepts Date | string | number from cache/JSON/Prisma. */
export function formatRelativeLabel(date: DateLike | null | undefined): string {
  const d = coerceDate(date);
  if (!d) return "—";
  const ms = Date.now() - d.getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 60) return `${String(mins).padStart(2, "0")} MIN AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${String(hrs).padStart(2, "0")} HRS AGO`;
  const days = Math.floor(hrs / 24);
  return `${days}D AGO`;
}

/** Clock label HH:MM:SS; accepts Date | string | number from cache/JSON/Prisma. */
export function formatClock(date: DateLike | null | undefined): string {
  const d = coerceDate(date);
  if (!d) return "--:--:--";
  return d.toISOString().slice(11, 19);
}

/** Short location for list columns — prefer place text over bare country code. */
export function shortLocationLabel(
  location: string | null | undefined,
  countryCode: string | null | undefined,
): string {
  const loc = location?.trim();
  if (loc) {
    const primary = loc.split(/[;—]/)[0]?.trim() || loc;
    if (primary.length <= 40) return primary;
    return `${primary.slice(0, 37)}…`;
  }
  const cc = countryCode?.trim();
  return cc || "—";
}

export function toHudCase(row: {
  id: string;
  caseCode: string;
  slug: string;
  title: string;
  location: string | null;
  countryCode: string | null;
  type: string;
  status: string;
  /** May be a string after `unstable_cache` / JSON serialization. */
  updatedAt: DateLike;
  priority: string;
  summary?: string | null;
  publicNotes?: string | null;
  sourceUrl?: string | null;
  sourceAttribution?: string | null;
  agency?: string | null;
}): HudCase {
  const updated = coerceDate(row.updatedAt);
  const caseCode = row.caseCode?.trim() || "—";
  const type = row.type?.trim() || "UNKNOWN";
  return {
    id: row.id,
    caseCode,
    slug: row.slug,
    title: row.title,
    location: row.location?.trim() || row.countryCode || "—",
    locationShort: shortLocationLabel(row.location, row.countryCode),
    type,
    status: row.status as HudCaseStatus,
    updatedLabel: formatRelativeLabel(updated ?? row.updatedAt),
    updatedAt: updated ? updated.toISOString() : String(row.updatedAt),
    priority: (row.priority as HudCase["priority"]) || "LOW",
    assignedTo: row.agency?.trim() || "N/A",
    overview: (row.summary ?? row.publicNotes ?? "").trim() || "No overview published.",
    sourceUrl: row.sourceUrl,
    sourceAttribution: row.sourceAttribution,
    agency: row.agency,
  };
}

export function toHudStats(
  counts: CaseStatusCounts,
  topLocations: TopLocation[],
): HudStats {
  return {
    total: counts.total,
    OPEN: counts.OPEN,
    COLD: counts.COLD,
    UNSOLVED: counts.UNSOLVED,
    CLOSED: counts.CLOSED,
    topLocations,
  };
}

export function toHudActivity(items: {
  id: string;
  /** May be a string after `unstable_cache` / JSON serialization. */
  at: DateLike;
  text: string;
  href?: string;
}[]): HudActivity[] {
  return items.map((item) => ({
    id: item.id,
    time: formatClock(item.at),
    text: item.text,
    href: item.href,
  }));
}

export function toHudDiscussions(
  rows: {
    id: string;
    body: string | null;
    /** May be a string after `unstable_cache` / JSON serialization. */
    createdAt: DateLike;
    author: { username: string };
    _count?: { comments?: number };
  }[],
): HudDiscussion[] {
  return rows.map((d) => ({
    id: d.id,
    authorUsername: d.author.username,
    avatarInitial: (d.author.username[0] ?? "?").toUpperCase(),
    createdLabel: formatRelativeLabel(d.createdAt),
    body: d.body ?? "",
    replyCount: d._count?.comments ?? 0,
  }));
}
