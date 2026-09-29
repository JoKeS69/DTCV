/**
 * Passkeys / WebAuthn scaffold — not wired to UI yet.
 * Argon2id passwords remain primary until enrollment lands.
 *
 * Production path:
 * 1. Store credential public keys per user (new table WebAuthnCredential)
 * 2. Ceremony via @simplewebauthn/server
 * 3. Step-up for admin + optional passwordless login
 */

export type PasskeyScaffold = {
  enabled: false;
  reason: string;
};

export function getPasskeyStatus(): PasskeyScaffold {
  return {
    enabled: false,
    reason:
      "WebAuthn enrollment scaffold only — enable after credential table + RP ID config",
  };
}

/** Placeholder challenge generator for future registration. */
export function createPasskeyChallengePlaceholder(): {
  challenge: string;
  rpId: string;
} {
  return {
    challenge: "passkey-not-enabled",
    rpId: process.env.NEXT_PUBLIC_APP_DOMAIN ?? "localhost",
  };
}
