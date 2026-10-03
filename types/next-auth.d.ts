import "next-auth";
import "next-auth/jwt";

/** Mirrors Prisma UserRole — kept as string union for edge-safe typings. */
export type SessionUserRole = "USER" | "MODERATOR" | "ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      username: string;
      displayName?: string | null;
      emailVerifiedAt?: string | null;
      sessionVersion?: number;
      /** DB role mirrored onto the session for chrome/UI; gates remain server-side. */
      role?: SessionUserRole;
    };
  }

  interface User {
    username?: string;
    displayName?: string | null;
    emailVerifiedAt?: string | null;
    sessionVersion?: number;
    role?: SessionUserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    displayName?: string | null;
    emailVerifiedAt?: string | null;
    sessionVersion?: number;
    role?: SessionUserRole;
  }
}
