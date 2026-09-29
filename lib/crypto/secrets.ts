/**
 * Key material access — env today, KMS adapter later.
 * Never persist keys in DB or git.
 *
 * Production: inject via secret manager / KMS-wrapped DEKs.
 * See SECURITY.md § Key location.
 */

import { createHash } from "node:crypto";

function deriveKey(material: string): Buffer {
  return createHash("sha256").update(material).digest();
}

function requireEnv(name: string, minLen = 16): string {
  const raw = process.env[name];
  if (!raw || raw.length < minLen) {
    throw new Error(
      `${name} must be set to a high-entropy secret (≥${minLen} chars). Generate: openssl rand -base64 32`,
    );
  }
  return raw;
}

export function tryEnv(name: string, minLen = 16): string | null {
  const raw = process.env[name];
  if (!raw || raw.length < minLen) return null;
  return raw;
}

function isProd(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

/** Field encryption key (AES-256-GCM). Env: ENCRYPTION_KEY */
export function getEncryptionKey(): Buffer {
  const raw = tryEnv("ENCRYPTION_KEY");
  if (raw) return deriveKey(raw);
  if (isProd()) throw new Error("ENCRYPTION_KEY is required in production");
  const auth = tryEnv("AUTH_SECRET");
  if (!auth) {
    throw new Error("Set ENCRYPTION_KEY or AUTH_SECRET for local field encryption");
  }
  return deriveKey(`enc-dev:${auth}`);
}

/** Blind-index HMAC key for email lookup. Env: EMAIL_BLIND_INDEX_KEY */
export function getBlindIndexKey(): Buffer {
  const raw = tryEnv("EMAIL_BLIND_INDEX_KEY");
  if (raw) return deriveKey(raw);
  if (isProd()) throw new Error("EMAIL_BLIND_INDEX_KEY is required in production");
  const auth = tryEnv("AUTH_SECRET");
  if (!auth) {
    throw new Error("Set EMAIL_BLIND_INDEX_KEY or AUTH_SECRET for local blind indexes");
  }
  return deriveKey(`blind-dev:${auth}`);
}

/** Pepper for short-TTL network rate-limit keys (never log raw IP). */
export function getRateLimitPepper(): Buffer {
  const raw = tryEnv("RATE_LIMIT_PEPPER");
  if (raw) return deriveKey(raw);
  const auth = process.env.AUTH_SECRET ?? "dev-rate-limit-pepper-not-for-prod";
  return deriveKey(`rl:${auth}`);
}

/** Stub KMS interface — swap for AWS KMS / GCP KMS / Vault in production. */
export type KmsAdapter = {
  decryptDataKey(ciphertext: Buffer): Promise<Buffer>;
  encryptDataKey(plaintext: Buffer): Promise<Buffer>;
};

/** Env-mode adapter: secret manager already unwrapped the DEK into ENCRYPTION_KEY. */
export const envKmsAdapter: KmsAdapter = {
  async decryptDataKey(ciphertext) {
    return ciphertext;
  },
  async encryptDataKey(plaintext) {
    return plaintext;
  },
};

export function assertProductionSecrets(): void {
  if (!isProd()) return;
  requireEnv("ENCRYPTION_KEY");
  requireEnv("EMAIL_BLIND_INDEX_KEY");
  requireEnv("AUTH_SECRET");
}
