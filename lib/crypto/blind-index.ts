import { createHmac } from "node:crypto";
import { getBlindIndexKey } from "@/lib/crypto/secrets";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Deterministic HMAC blind index for equality lookup (not reversible). */
export function emailBlindIndex(
  email: string,
  key = getBlindIndexKey(),
): string {
  const normalized = normalizeEmail(email);
  return createHmac("sha256", key).update(normalized).digest("base64url");
}
