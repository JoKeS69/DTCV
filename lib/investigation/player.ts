import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { sanitizeDisplayName } from "./sanitize";

const COOKIE = "inv_player_v1";
const MAX_AGE = 60 * 60 * 24 * 180;

export type PlayerIdentity = {
  playerKey: string;
  userId: string | null;
  displayName: string | null;
  guestToken: string | null;
};

export async function resolvePlayerIdentity(): Promise<PlayerIdentity> {
  const session = await auth();
  if (session?.user?.id) {
    return {
      playerKey: `user:${session.user.id}`,
      userId: session.user.id,
      displayName: session.user.name ?? session.user.email ?? null,
      guestToken: null,
    };
  }

  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && /^[a-zA-Z0-9_-]{16,64}$/.test(existing)) {
    return {
      playerKey: `guest:${existing}`,
      userId: null,
      displayName: null,
      guestToken: existing,
    };
  }

  // Do not set cookies during render — guest token is minted in actions.
  return {
    playerKey: "guest:anonymous",
    userId: null,
    displayName: null,
    guestToken: null,
  };
}

/** Ensure a stable guest cookie exists (call from Server Actions only). */
export async function ensureGuestPlayerToken(): Promise<PlayerIdentity> {
  const session = await auth();
  if (session?.user?.id) {
    return {
      playerKey: `user:${session.user.id}`,
      userId: session.user.id,
      displayName: session.user.name ?? session.user.email ?? null,
      guestToken: null,
    };
  }

  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && /^[a-zA-Z0-9_-]{16,64}$/.test(existing)) {
    return {
      playerKey: `guest:${existing}`,
      userId: null,
      displayName: null,
      guestToken: existing,
    };
  }

  const token = randomBytes(18).toString("base64url");
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return {
    playerKey: `guest:${token}`,
    userId: null,
    displayName: null,
    guestToken: token,
  };
}

export function normalizeDisplayNameInput(input: unknown): string | null {
  const name = sanitizeDisplayName(input);
  return name || null;
}
