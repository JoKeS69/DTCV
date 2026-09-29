import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getEncryptionKey } from "@/lib/crypto/secrets";

const PREFIX = "v1";

/**
 * AES-256-GCM AEAD. Wire format: `v1:<iv_b64>:<tag_b64>:<ct_b64>`
 */
export function encryptString(plaintext: string, key = getEncryptionKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptString(payload: string, key = getEncryptionKey()): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error("Invalid ciphertext format");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64!, "base64url");
  const tag = Buffer.from(tagB64!, "base64url");
  const ciphertext = Buffer.from(ctB64!, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export function isEncryptedPayload(value: string): boolean {
  return value.startsWith(`${PREFIX}:`) && value.split(":").length === 4;
}

/** Encrypt private note bodies; plaintext legacy rows still readable. */
export function sealPrivateText(plaintext: string): string {
  return encryptString(plaintext);
}

export function openPrivateText(stored: string): string {
  if (isEncryptedPayload(stored)) return decryptString(stored);
  return stored;
}
