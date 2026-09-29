/**
 * CASE//NET HUD mock dataset — API-ready shape matching desktop/mobile mockups.
 * Swap the loader for a real API without changing panel components.
 */

export type HudCaseStatus = "OPEN" | "COLD" | "UNSOLVED" | "CLOSED";

export type HudCase = {
  id: string;
  caseCode: string;
  slug: string;
  title: string;
  /** Full location for detail panel */
  location: string;
  /** Country / short location for table */
  locationShort: string;
  type: string;
  status: HudCaseStatus;
  /** Relative label as shown in mockup */
  updatedLabel: string;
  /** Absolute time for sorting */
  updatedAt: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignedTo: string;
  overview: string;
};

export type HudDiscussion = {
  id: string;
  authorUsername: string;
  avatarInitial: string;
  createdLabel: string;
  body: string;
  replyCount: number;
};

export type HudActivity = {
  id: string;
  time: string;
  text: string;
  href?: string;
};

export type HudStats = {
  total: number;
  OPEN: number;
  COLD: number;
  UNSOLVED: number;
  CLOSED: number;
  topLocations: { country: string; count: number }[];
};

/** Fixed mockup clock reference for stable visual QA */
export const HUD_CLOCK_DESKTOP = "28 SEP 2026  18:21";
export const HUD_CLOCK_MOBILE = "28 SEP 2026 18:24";

export const HUD_STATS: HudStats = {
  total: 2481,
  OPEN: 892,
  COLD: 648,
  UNSOLVED: 521,
  CLOSED: 420,
  topLocations: [
    { country: "USA", count: 472 },
    { country: "UK", count: 287 },
    { country: "FRANCE", count: 241 },
    { country: "GERMANY", count: 198 },
    { country: "JAPAN", count: 176 },
  ],
};

/** Default selected case in mockups */
export const HUD_DEFAULT_SELECT = "25-00217";

/** Mockup row order (desktop.jpeg) — first five are the mobile brief rows */
export const HUD_CASES: HudCase[] = [
  {
    id: "hud-24-01982",
    caseCode: "24-01982",
    slug: "missing-person-emily-carter",
    title: "Missing Person - Emily Carter",
    location: "Manchester, UK",
    locationShort: "UK",
    type: "MISSING",
    status: "OPEN",
    updatedLabel: "02:14 AGO",
    updatedAt: "2026-09-28T16:07:00.000Z",
    priority: "HIGH",
    assignedTo: "N/A",
    overview:
      "Emily Carter, 29, was last seen leaving a late shift near Piccadilly Station. Personal effects recovered; no confirmed sightings after 02:14 local.",
  },
  {
    id: "hud-23-10441",
    caseCode: "23-10441",
    slug: "unsolved-homicide-riverside",
    title: "Unsolved Homicide - Riverside",
    location: "Lyon, France",
    locationShort: "FRANCE",
    type: "HOMICIDE",
    status: "COLD",
    updatedLabel: "3 DAYS AGO",
    updatedAt: "2026-09-25T12:00:00.000Z",
    priority: "MEDIUM",
    assignedTo: "N/A",
    overview:
      "Riverside homicide file reopened for digital forensics review. Autopsy report annexed; primary scene still cold.",
  },
  {
    id: "hud-25-00217",
    caseCode: "25-00217",
    slug: "disappearance-yuki-tanaka",
    title: "Disappearance - Yuki Tanaka",
    location: "Tokyo, Japan",
    locationShort: "JAPAN",
    type: "DISAPPEARANCE",
    status: "OPEN",
    updatedLabel: "6 HRS AGO",
    updatedAt: "2026-09-28T12:21:00.000Z",
    priority: "MEDIUM",
    assignedTo: "N/A",
    overview:
      "Yuki Tanaka, 24, was last seen near Shinjuku Station at approximately 22:40 local time. CCTV coverage ends at the south exit plaza. Phone last pinged 1.2 km east before going dark. No ransom contact. Family reports atypical silence on work channels.",
  },
  {
    id: "hud-22-88401",
    caseCode: "22-88401",
    slug: "unknown-incident-usa",
    title: "Unknown Incident - Harbor District",
    location: "Boston, USA",
    locationShort: "USA",
    type: "UNKNOWN",
    status: "UNSOLVED",
    updatedLabel: "12 DAYS AGO",
    updatedAt: "2026-09-16T10:00:00.000Z",
    priority: "LOW",
    assignedTo: "N/A",
    overview:
      "Harbor district incident with conflicting witness statements. Classification remains UNKNOWN pending source verification.",
  },
  {
    id: "hud-24-33210",
    caseCode: "24-33210",
    slug: "accident-germany",
    title: "Industrial Accident - Dresden",
    location: "Dresden, Germany",
    locationShort: "GERMANY",
    type: "ACCIDENT",
    status: "CLOSED",
    updatedLabel: "1 WEEK AGO",
    updatedAt: "2026-09-21T09:00:00.000Z",
    priority: "LOW",
    assignedTo: "Unit 12",
    overview:
      "Industrial accident file closed after regulatory review. Archived for pattern analysis only.",
  },
  {
    id: "hud-21-55102",
    caseCode: "21-55102",
    slug: "stolen-artifacts-italy",
    title: "Stolen Artifacts - Florence Vault",
    location: "Florence, Italy",
    locationShort: "ITALY",
    type: "THEFT",
    status: "UNSOLVED",
    updatedLabel: "2 WEEKS AGO",
    updatedAt: "2026-09-14T08:00:00.000Z",
    priority: "MEDIUM",
    assignedTo: "N/A",
    overview:
      "Vault breach with selective artifact removal. Cross-border fencing pathways under review.",
  },
  {
    id: "hud-20-77110",
    caseCode: "20-77110",
    slug: "cold-trail-canada",
    title: "Cold Trail - Northern Corridor",
    location: "Ontario, Canada",
    locationShort: "CANADA",
    type: "MISSING",
    status: "COLD",
    updatedLabel: "4 WEEKS AGO",
    updatedAt: "2026-08-31T08:00:00.000Z",
    priority: "LOW",
    assignedTo: "N/A",
    overview:
      "Long-running missing person corridor case. Seasonal tip line reactivated; no new physical evidence.",
  },
  {
    id: "hud-25-00890",
    caseCode: "25-00890",
    slug: "open-file-brazil",
    title: "Open File - São Paulo Transit",
    location: "São Paulo, Brazil",
    locationShort: "BRAZIL",
    type: "DISAPPEARANCE",
    status: "OPEN",
    updatedLabel: "1 DAY AGO",
    updatedAt: "2026-09-27T18:00:00.000Z",
    priority: "HIGH",
    assignedTo: "N/A",
    overview:
      "Transit-adjacent disappearance with partial camera coverage. Active canvass in progress.",
  },
];

export const HUD_ACTIVITY: HudActivity[] = [
  {
    id: "a1",
    time: "18:19:44",
    text: "Case 24-01982 updated / New evidence added (photo)",
    href: "/cases?select=24-01982",
  },
  {
    id: "a2",
    time: "18:17:02",
    text: "Case 25-00217 / Discussion reply from user: detective_73",
    href: "/cases?select=25-00217",
  },
  {
    id: "a3",
    time: "18:12:31",
    text: "Case 23-10441 / New document uploaded (autopsy report)",
    href: "/cases?select=23-10441",
  },
  {
    id: "a4",
    time: "18:04:11",
    text: "Training case completed / Module 3 - Forensic Analysis",
    href: "/fictional",
  },
  {
    id: "a5",
    time: "17:58:27",
    text: "Case 24-33210 / Status changed to Closed",
    href: "/cases?select=24-33210",
  },
  {
    id: "a6",
    time: "17:51:09",
    text: "Case 22-88401 / Source citation added (harbor CCTV)",
    href: "/cases?select=22-88401",
  },
  {
    id: "a7",
    time: "17:44:02",
    text: "Case 21-55102 / New discussion thread opened",
    href: "/cases?select=21-55102",
  },
];

export const HUD_DISCUSSIONS: Record<string, HudDiscussion[]> = {
  "25-00217": [
    {
      id: "d1",
      authorUsername: "detective_73",
      avatarInitial: "D",
      createdLabel: "6h ago",
      body: "South exit plaza cameras cut at 22:41 — anyone mapped the alley cameras east of that ping?",
      replyCount: 12,
    },
    {
      id: "d2",
      authorUsername: "kaito",
      avatarInitial: "K",
      createdLabel: "5h ago",
      body: "Work Slack shows last read at 22:18. No outbound messages after. Checking badge logs.",
      replyCount: 4,
    },
    {
      id: "d3",
      authorUsername: "mira_field",
      avatarInitial: "M",
      createdLabel: "3h ago",
      body: "Family statement uploaded. Corroborates atypical silence on the project channel.",
      replyCount: 2,
    },
  ],
};

export type HudFilterInput = {
  q?: string;
  type?: string;
  status?: string;
  sort?: string;
  select?: string;
};

export function filterHudCases(input: HudFilterInput): {
  items: HudCase[];
  selected: HudCase;
} {
  const q = (input.q ?? "").trim().toLowerCase();
  const type = input.type && input.type !== "ALL" ? input.type.toUpperCase() : null;
  const status =
    input.status && input.status !== "ALL" ? input.status.toUpperCase() : null;

  let items = HUD_CASES.filter((c) => {
    if (type && c.type !== type) return false;
    if (status && c.status !== status) return false;
    if (!q) return true;
    const hay = `${c.caseCode} ${c.title} ${c.location} ${c.locationShort} ${c.type}`.toLowerCase();
    return hay.includes(q);
  });

  const sort = input.sort ?? "updated";
  // Default "updated" preserves mockup row order (source-of-truth layout).
  if (sort === "code") {
    items = [...items].sort((a, b) => a.caseCode.localeCompare(b.caseCode));
  } else if (sort === "title") {
    items = [...items].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === "recent") {
    items = [...items].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  const selectKey = input.select ?? HUD_DEFAULT_SELECT;
  const selected =
    items.find((c) => c.caseCode === selectKey || c.slug === selectKey) ??
    items[0] ??
    HUD_CASES.find((c) => c.caseCode === HUD_DEFAULT_SELECT)!;

  return { items, selected };
}
