import type {
  HudActivity,
  HudCase,
  HudCaseStatus,
  HudDiscussion,
  HudStats,
} from "@/lib/cases/hud-types";
import type { CaseStatusCounts, TopLocation } from "@/lib/cases/dashboard";

function formatRelativeLabel(date: Date): string {
  const ms = Date.now() - date.getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 60) return `${String(mins).padStart(2, "0")} MIN AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${String(hrs).padStart(2, "0")} HRS AGO`;
  const days = Math.floor(hrs / 24);
  return `${days}D AGO`;
}

function formatClock(date: Date): string {
  return date.toISOString().slice(11, 19);
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
  updatedAt: Date;
  priority: string;
  summary?: string | null;
  publicNotes?: string | null;
  sourceUrl?: string | null;
  sourceAttribution?: string | null;
  agency?: string | null;
}): HudCase {
  return {
    id: row.id,
    caseCode: row.caseCode,
    slug: row.slug,
    title: row.title,
    location: row.location?.trim() || row.countryCode || "—",
    locationShort: row.countryCode?.trim() || "—",
    type: row.type,
    status: row.status as HudCaseStatus,
    updatedLabel: formatRelativeLabel(row.updatedAt),
    updatedAt: row.updatedAt.toISOString(),
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
  at: Date;
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
    createdAt: Date;
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
