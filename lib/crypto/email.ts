import { encryptString, decryptString } from "@/lib/crypto/aead";
import { emailBlindIndex, normalizeEmail } from "@/lib/crypto/blind-index";

export type SealedEmail = {
  emailEncrypted: string;
  emailBlindIndex: string;
};

export function sealEmail(email: string): SealedEmail {
  const normalized = normalizeEmail(email);
  return {
    emailEncrypted: encryptString(normalized),
    emailBlindIndex: emailBlindIndex(normalized),
  };
}

/** Owner/staff only — never send to public APIs or SEO. */
export function openEmail(emailEncrypted: string): string {
  return decryptString(emailEncrypted);
}

export function lookupEmailBlindIndex(email: string): string {
  return emailBlindIndex(normalizeEmail(email));
}
