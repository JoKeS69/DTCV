import { createHash, createHmac, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/db";
import {
  CONSENT_COOKIE,
  LEGAL_POLICY_VERSION,
  VISITOR_COOKIE,
} from "@/lib/legal/policy";

function consentPepper(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-only-consent-pepper"
  );
}

export function hashIpOptional(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHmac("sha256", consentPepper())
    .update(`consent-ip|${ip}`)
    .digest("base64url")
    .slice(0, 32);
}

export function newVisitorKey(): string {
  return randomBytes(24).toString("base64url");
}

export async function hasValidConsent(
  visitorKey: string | undefined,
): Promise<boolean> {
  if (!visitorKey) return false;
  const row = await getPrisma().consentLog.findFirst({
    where: {
      visitorKey,
      policyVersion: LEGAL_POLICY_VERSION,
    },
    orderBy: { createdAt: "desc" },
  });
  return Boolean(row);
}

export async function recordConsent(input: {
  visitorKey: string;
  ipHash?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await getPrisma().consentLog.create({
    data: {
      visitorKey: input.visitorKey,
      policyVersion: LEGAL_POLICY_VERSION,
      ipHash: input.ipHash ?? null,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
    },
  });
}

export function consentCookieNames() {
  return { CONSENT_COOKIE, VISITOR_COOKIE, LEGAL_POLICY_VERSION };
}

/** Stable contact hash for takedown forms (main or cases). */
export function hashContact(value: string): string {
  return createHash("sha256").update(`contact|${value.trim().toLowerCase()}`).digest("hex");
}
