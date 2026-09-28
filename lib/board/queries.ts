import type { BoardNodeType } from "@/lib/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import type {
  BoardCatalogItem,
  BoardConnectionDTO,
  BoardNodeDTO,
} from "@/lib/board/types";

export async function getBoardState(investigationId: string, userId: string) {
  const investigation = await getPrisma().investigation.findFirst({
    where: {
      id: investigationId,
      userId,
      target: "FICTIONAL_CASE",
    },
    select: {
      id: true,
      status: true,
      fictionalCaseId: true,
      fictionalCase: {
        select: {
          id: true,
          caseCode: true,
          title: true,
          slug: true,
          suspects: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, code: true, name: true, occupation: true },
          },
          evidence: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, code: true, title: true, type: true },
          },
          events: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, occurredAt: true },
          },
          witnessStatements: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, code: true, witnessName: true },
          },
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        select: { id: true, body: true },
      },
      boardNodes: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          refId: true,
          label: true,
          x: true,
          y: true,
        },
      },
      connections: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fromType: true,
          fromId: true,
          toType: true,
          toId: true,
          label: true,
        },
      },
    },
  });

  if (!investigation?.fictionalCase) return null;
  const caseFile = investigation.fictionalCase;

  const catalog = buildCatalog({
    notes: investigation.notes,
    fictionalCase: caseFile,
  });
  const labelByKey = new Map(
    catalog.map((c) => [`${c.type}:${c.refId}`, c] as const),
  );

  const nodes: BoardNodeDTO[] = investigation.boardNodes.map((n) => {
    const cat = labelByKey.get(`${n.type}:${n.refId}`);
    return {
      id: n.id,
      type: n.type,
      refId: n.refId,
      label: n.label ?? cat?.label ?? `${n.type} ${n.refId.slice(0, 6)}`,
      detail: cat?.detail,
      x: n.x,
      y: n.y,
    };
  });

  const connections: BoardConnectionDTO[] = investigation.connections;

  return {
    investigationId: investigation.id,
    status: investigation.status,
    locked: investigation.status === "SUBMITTED",
    caseFile: {
      caseCode: caseFile.caseCode,
      title: caseFile.title,
      slug: caseFile.slug,
    },
    catalog,
    nodes,
    connections,
  };
}

function buildCatalog(investigation: {
  notes: { id: string; body: string }[];
  fictionalCase: {
    suspects: { id: string; code: string; name: string; occupation: string | null }[];
    evidence: { id: string; code: string; title: string; type: string }[];
    events: { id: string; title: string; occurredAt: Date }[];
    witnessStatements: { id: string; code: string; witnessName: string }[];
  };
}): BoardCatalogItem[] {
  const items: BoardCatalogItem[] = [];

  for (const s of investigation.fictionalCase.suspects) {
    items.push({
      type: "SUSPECT",
      refId: s.id,
      label: `${s.code} · ${s.name}`,
      detail: s.occupation ?? undefined,
    });
  }
  for (const e of investigation.fictionalCase.evidence) {
    items.push({
      type: "EVIDENCE",
      refId: e.id,
      label: `${e.code} · ${e.title}`,
      detail: e.type,
    });
  }
  for (const ev of investigation.fictionalCase.events) {
    items.push({
      type: "EVENT",
      refId: ev.id,
      label: ev.title,
      detail: ev.occurredAt.toISOString().slice(0, 16).replace("T", " "),
    });
  }
  for (const w of investigation.fictionalCase.witnessStatements) {
    items.push({
      type: "WITNESS_STATEMENT",
      refId: w.id,
      label: `${w.code} · ${w.witnessName}`,
    });
  }
  for (const n of investigation.notes) {
    items.push({
      type: "NOTE",
      refId: n.id,
      label: n.body.slice(0, 48) + (n.body.length > 48 ? "…" : ""),
      detail: "Note",
    });
  }

  return items;
}

export function defaultPosition(index: number): { x: number; y: number } {
  const col = index % 5;
  const row = Math.floor(index / 5);
  return { x: 40 + col * 200, y: 40 + row * 110 };
}

export type { BoardNodeType };
