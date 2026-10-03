import { getCasesPrisma } from "@/lib/cases-db";
import type { PlayerStatus, PublicCaseCard } from "./types";
import {
  discoveredClueNodes,
  isSolutionReveal,
  parseBoardConnections,
  parseCaseLog,
  parseChatHistory,
  parseFieldAgents,
  parseStringIdArray,
  parseVictims,
  rowToDraft,
  toPublicLocations,
  toPublicSuspects,
} from "./serialize";
import { resolvePlayerIdentity } from "./player";

export async function listPublishedInvestigationCards(): Promise<
  PublicCaseCard[]
> {
  const db = getCasesPrisma();
  const identity = await resolvePlayerIdentity();
  const rows = await db.investigationCase.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });

  const states = await db.investigationPlayerState.findMany({
    where: {
      playerKey: identity.playerKey,
      caseId: { in: rows.map((r) => r.id) },
    },
  });
  const byCase = new Map(states.map((s) => [s.caseId, s]));

  return rows.map((r) => {
    const st = byCase.get(r.id);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      teaser: r.teaser,
      victims: parseVictims(r.victims),
      location: r.location,
      darkerTheme: r.darkerTheme,
      playerStatus: (st?.status as PlayerStatus | undefined) ?? null,
      wrongAccusations: st?.wrongAccusations ?? 0,
    };
  });
}

export async function listDraftInvestigationCases() {
  const db = getCasesPrisma();
  return db.investigationCase.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function getInvestigationPlayPayload(slug: string) {
  // Never send suspects/clues/solution without fictional access.
  const { checkFictionalAccess } = await import("@/lib/billing/gate");
  const access = await checkFictionalAccess();
  if (!access.ok) return null;

  const db = getCasesPrisma();
  const row = await db.investigationCase.findFirst({
    where: { slug, status: "published" },
  });
  if (!row) return null;

  const identity = await resolvePlayerIdentity();
  const state = await db.investigationPlayerState.findUnique({
    where: {
      caseId_playerKey: { caseId: row.id, playerKey: identity.playerKey },
    },
  });

  const draft = rowToDraft(row);
  const inspected = parseStringIdArray(state?.inspectedLocationIds);
  const reviewed = parseStringIdArray(state?.reviewedSuspectIds);
  const closed = Boolean(state?.closedAt && state.status !== "unsolved");

  return {
    case: {
      id: row.id,
      slug: row.slug,
      title: row.title,
      teaser: row.teaser,
      victims: draft.victims,
      location: draft.location,
      discoveryReport: draft.discoveryReport,
      // Weapon name/trait are discoverable via scenes — show name only as catalog label after close, else generic.
      weaponLabel: closed
        ? `${draft.weapon.name} (${draft.weapon.trait})`
        : "On file (inspect scenes)",
      darkerTheme: row.darkerTheme,
      fieldAgents: parseFieldAgents(row.fieldAgents),
      suspects: toPublicSuspects(draft.suspects, reviewed),
      locations: toPublicLocations(draft.locations, inspected),
      clueNodes: discoveredClueNodes(draft.locations, inspected),
    },
    player: {
      displayName: state?.displayName ?? identity.displayName,
      status: (state?.status as PlayerStatus | undefined) ?? "unsolved",
      wrongAccusations: state?.wrongAccusations ?? 0,
      inspectedLocationIds: inspected,
      reviewedSuspectIds: reviewed,
      backgroundCheckedIds: parseStringIdArray(state?.backgroundCheckedIds),
      alibiVerifiedIds: parseStringIdArray(state?.alibiVerifiedIds),
      boardConnections: parseBoardConnections(state?.boardConnections),
      caseLog: parseCaseLog(state?.caseLog),
      chatHistory: parseChatHistory(state?.chatHistory),
      solutionReveal:
        closed && isSolutionReveal(state?.solutionReveal)
          ? state!.solutionReveal
          : null,
      hasSession: Boolean(state),
    },
    llmOfflineHint: !process.env.INVESTIGATION_OPENAI_API_KEY && !process.env.OPENAI_API_KEY,
  };
}

export async function getInvestigationCaseRow(idOrSlug: string) {
  const db = getCasesPrisma();
  return db.investigationCase.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
  });
}
