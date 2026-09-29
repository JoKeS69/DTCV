"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { defaultPosition } from "@/lib/board/queries";
import { BOARD_H, BOARD_W } from "@/lib/board/types";
import { getPrisma } from "@/lib/db";
import { awardAchievement } from "@/lib/progression/achievements";
import { requireActiveUser } from "@/lib/server/authz";
import type { BoardNodeType } from "@/lib/generated/prisma/client";

export type BoardActionResult =
  | { ok: true; id?: string; count?: number }
  | { ok: false; error: string };

const nodeTypeSchema = z.enum([
  "EVIDENCE",
  "SUSPECT",
  "EVENT",
  "WITNESS_STATEMENT",
  "NOTE",
  "PERSON",
  "CUSTOM",
]);

async function requireOwner(investigationId: string) {
  const gate = await requireActiveUser();
  if (!gate.ok) {
    return { ok: false as const, error: gate.error, investigation: null };
  }
  const investigation = await getPrisma().investigation.findFirst({
    where: {
      id: investigationId,
      userId: gate.user.id,
      target: "FICTIONAL_CASE",
    },
    select: {
      id: true,
      status: true,
      userId: true,
      fictionalCase: { select: { slug: true, id: true } },
    },
  });
  if (!investigation) {
    return { ok: false as const, error: "Investigation not found", investigation: null };
  }
  return {
    ok: true as const,
    investigation,
    userId: gate.user.id,
  };
}

function revalidateBoard(slug: string | undefined) {
  if (slug) {
    revalidatePath(`/fictional/${slug}`);
    revalidatePath(`/fictional/${slug}/board`);
  }
  revalidatePath("/profile");
}

async function maybeAwardBoardBuilder(userId: string, investigationId: string) {
  const count = await getPrisma().investigationConnection.count({
    where: { investigationId },
  });
  if (count >= 5) {
    await getPrisma().$transaction(async (tx) => {
      await awardAchievement(tx, userId, "BOARD_BUILDER");
    });
  }
  return count;
}

export async function addBoardNode(input: {
  investigationId: string;
  type: BoardNodeType;
  refId: string;
  label?: string;
}): Promise<BoardActionResult> {
  const gate = await requireOwner(input.investigationId);
  if (!gate.ok || !gate.investigation) return { ok: false, error: gate.error };
  if (gate.investigation.status === "SUBMITTED") {
    return { ok: false, error: "Board locked after submission" };
  }

  const type = nodeTypeSchema.parse(input.type);
  const refId = input.refId.trim();
  if (!refId) return { ok: false, error: "Missing ref" };

  // Validate catalog membership for case entities
  const caseId = gate.investigation.fictionalCase?.id;
  if (!caseId) return { ok: false, error: "Case missing" };

  const valid = await validateRef(type, refId, caseId, gate.investigation.id);
  if (!valid) return { ok: false, error: "Invalid board item" };

  const existingCount = await getPrisma().investigationBoardNode.count({
    where: { investigationId: gate.investigation.id },
  });
  const pos = defaultPosition(existingCount);

  try {
    const node = await getPrisma().investigationBoardNode.create({
      data: {
        investigationId: gate.investigation.id,
        type,
        refId,
        label: input.label?.trim() || null,
        x: pos.x,
        y: pos.y,
      },
      select: { id: true },
    });
    revalidateBoard(gate.investigation.fictionalCase?.slug);
    return { ok: true, id: node.id };
  } catch {
    return { ok: false, error: "Already on board" };
  }
}

async function validateRef(
  type: BoardNodeType,
  refId: string,
  caseId: string,
  investigationId: string,
): Promise<boolean> {
  const prisma = getPrisma();
  switch (type) {
    case "SUSPECT":
      return !!(await prisma.suspect.findFirst({
        where: { id: refId, fictionalCaseId: caseId },
        select: { id: true },
      }));
    case "EVIDENCE":
      return !!(await prisma.evidence.findFirst({
        where: { id: refId, fictionalCaseId: caseId },
        select: { id: true },
      }));
    case "EVENT":
      return !!(await prisma.fictionalEvent.findFirst({
        where: { id: refId, fictionalCaseId: caseId },
        select: { id: true },
      }));
    case "WITNESS_STATEMENT":
      return !!(await prisma.witnessStatement.findFirst({
        where: { id: refId, fictionalCaseId: caseId },
        select: { id: true },
      }));
    case "NOTE":
      return !!(await prisma.investigationNote.findFirst({
        where: { id: refId, investigationId },
        select: { id: true },
      }));
    case "CUSTOM":
      return refId.length > 0;
    default:
      return false;
  }
}

export async function addCustomBoardNode(input: {
  investigationId: string;
  label: string;
}): Promise<BoardActionResult> {
  const label = input.label.trim();
  if (label.length < 1 || label.length > 80) {
    return { ok: false, error: "Label must be 1–80 characters" };
  }
  const refId = `custom_${crypto.randomUUID()}`;
  return addBoardNode({
    investigationId: input.investigationId,
    type: "CUSTOM",
    refId,
    label,
  });
}

export async function addNoteBoardNode(input: {
  investigationId: string;
  body: string;
}): Promise<BoardActionResult> {
  const gate = await requireOwner(input.investigationId);
  if (!gate.ok || !gate.investigation) return { ok: false, error: gate.error };
  if (gate.investigation.status === "SUBMITTED") {
    return { ok: false, error: "Board locked after submission" };
  }

  const body = input.body.trim();
  if (body.length < 1 || body.length > 4000) {
    return { ok: false, error: "Note must be 1–4000 characters" };
  }

  const note = await getPrisma().investigationNote.create({
    data: { investigationId: gate.investigation.id, body },
    select: { id: true },
  });

  const result = await addBoardNode({
    investigationId: gate.investigation.id,
    type: "NOTE",
    refId: note.id,
    label: body.slice(0, 48),
  });
  return result;
}

export async function moveBoardNode(input: {
  investigationId: string;
  nodeId: string;
  x: number;
  y: number;
}): Promise<BoardActionResult> {
  const gate = await requireOwner(input.investigationId);
  if (!gate.ok || !gate.investigation) return { ok: false, error: gate.error };
  if (gate.investigation.status === "SUBMITTED") {
    return { ok: false, error: "Board locked after submission" };
  }

  const x = Math.max(0, Math.min(BOARD_W - 40, Number(input.x)));
  const y = Math.max(0, Math.min(BOARD_H - 40, Number(input.y)));
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { ok: false, error: "Invalid position" };
  }

  const updated = await getPrisma().investigationBoardNode.updateMany({
    where: { id: input.nodeId, investigationId: gate.investigation.id },
    data: { x, y },
  });
  if (updated.count === 0) return { ok: false, error: "Node not found" };

  // Soft revalidate — positions mainly client-optimistic; keep SSR in sync
  revalidateBoard(gate.investigation.fictionalCase?.slug);
  return { ok: true };
}

export async function removeBoardNode(input: {
  investigationId: string;
  nodeId: string;
}): Promise<BoardActionResult> {
  const gate = await requireOwner(input.investigationId);
  if (!gate.ok || !gate.investigation) return { ok: false, error: gate.error };
  if (gate.investigation.status === "SUBMITTED") {
    return { ok: false, error: "Board locked after submission" };
  }

  const node = await getPrisma().investigationBoardNode.findFirst({
    where: { id: input.nodeId, investigationId: gate.investigation.id },
  });
  if (!node) return { ok: false, error: "Node not found" };

  await getPrisma().$transaction(async (tx) => {
    await tx.investigationConnection.deleteMany({
      where: {
        investigationId: gate.investigation!.id,
        OR: [
          { fromType: node.type, fromId: node.refId },
          { toType: node.type, toId: node.refId },
        ],
      },
    });
    await tx.investigationBoardNode.delete({ where: { id: node.id } });
  });

  revalidateBoard(gate.investigation.fictionalCase?.slug);
  return { ok: true };
}

export async function createBoardConnection(input: {
  investigationId: string;
  fromType: BoardNodeType;
  fromId: string;
  toType: BoardNodeType;
  toId: string;
  label?: string;
}): Promise<BoardActionResult> {
  const gate = await requireOwner(input.investigationId);
  if (!gate.ok || !gate.investigation) return { ok: false, error: gate.error };
  if (gate.investigation.status === "SUBMITTED") {
    return { ok: false, error: "Board locked after submission" };
  }

  const fromType = nodeTypeSchema.parse(input.fromType);
  const toType = nodeTypeSchema.parse(input.toType);
  if (fromType === toType && input.fromId === input.toId) {
    return { ok: false, error: "Cannot connect a node to itself" };
  }

  const [fromNode, toNode] = await Promise.all([
    getPrisma().investigationBoardNode.findFirst({
      where: {
        investigationId: gate.investigation.id,
        type: fromType,
        refId: input.fromId,
      },
    }),
    getPrisma().investigationBoardNode.findFirst({
      where: {
        investigationId: gate.investigation.id,
        type: toType,
        refId: input.toId,
      },
    }),
  ]);
  if (!fromNode || !toNode) {
    return { ok: false, error: "Both nodes must be on the board" };
  }

  const dup = await getPrisma().investigationConnection.findFirst({
    where: {
      investigationId: gate.investigation.id,
      OR: [
        {
          fromType,
          fromId: input.fromId,
          toType,
          toId: input.toId,
        },
        {
          fromType: toType,
          fromId: input.toId,
          toType: fromType,
          toId: input.fromId,
        },
      ],
    },
    select: { id: true },
  });
  if (dup) return { ok: false, error: "Connection already exists" };

  const conn = await getPrisma().investigationConnection.create({
    data: {
      investigationId: gate.investigation.id,
      fromType,
      fromId: input.fromId,
      toType,
      toId: input.toId,
      label: input.label?.trim() || null,
    },
    select: { id: true },
  });

  const count = await maybeAwardBoardBuilder(
    gate.userId,
    gate.investigation.id,
  );
  revalidateBoard(gate.investigation.fictionalCase?.slug);
  return { ok: true, id: conn.id, count };
}

export async function removeBoardConnection(input: {
  investigationId: string;
  connectionId: string;
}): Promise<BoardActionResult> {
  const gate = await requireOwner(input.investigationId);
  if (!gate.ok || !gate.investigation) return { ok: false, error: gate.error };
  if (gate.investigation.status === "SUBMITTED") {
    return { ok: false, error: "Board locked after submission" };
  }

  const deleted = await getPrisma().investigationConnection.deleteMany({
    where: {
      id: input.connectionId,
      investigationId: gate.investigation.id,
    },
  });
  if (deleted.count === 0) return { ok: false, error: "Connection not found" };

  revalidateBoard(gate.investigation.fictionalCase?.slug);
  return { ok: true };
}
