import type { BoardNodeType } from "@/lib/generated/prisma/client";

export type BoardCatalogItem = {
  type: BoardNodeType;
  refId: string;
  label: string;
  detail?: string;
};

export type BoardNodeDTO = {
  id: string;
  type: BoardNodeType;
  refId: string;
  label: string;
  detail?: string;
  x: number;
  y: number;
};

export type BoardConnectionDTO = {
  id: string;
  fromType: BoardNodeType;
  fromId: string;
  toType: BoardNodeType;
  toId: string;
  label: string | null;
};

export const NODE_W = 160;
export const NODE_H = 72;
export const BOARD_W = 1200;
export const BOARD_H = 800;

export function nodeKey(type: BoardNodeType | string, refId: string) {
  return `${type}:${refId}`;
}
