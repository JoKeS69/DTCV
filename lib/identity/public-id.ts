import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

/** Opaque public detective id: DET-XXXXXXXX */
export function generatePublicDetectiveId(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return `DET-${out}`;
}

export function formatPublicDetectiveId(publicId: string): string {
  return publicId.startsWith("DET-") ? publicId : `DET-${publicId}`;
}

/** @deprecated sequential badges — use formatPublicDetectiveId */
export function formatDetectiveBadge(badgeNumber: number): string {
  return `INTERNAL-${String(badgeNumber).padStart(4, "0")}`;
}
