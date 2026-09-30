/**
 * CASE//NET HUD view types — presentation shape for command-deck panels.
 * Populated from Prisma (or empty). Never hardcode fabricated real crimes here.
 */

export type HudCaseStatus = "OPEN" | "COLD" | "UNSOLVED" | "CLOSED";

export type HudCase = {
  id: string;
  caseCode: string;
  slug: string;
  title: string;
  location: string;
  locationShort: string;
  type: string;
  status: HudCaseStatus;
  updatedLabel: string;
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

/** Published case with real WGS84 coords for the GLOBAL CASES map. */
export type HudMapMarker = {
  id: string;
  caseCode: string;
  slug: string;
  title: string;
  status: HudCaseStatus;
  lat: number;
  lng: number;
};
