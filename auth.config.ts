import type { NextAuthConfig } from "next-auth";

/** 8 hours — shorter than Auth.js 30d default. */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 8;
const SESSION_UPDATE_AGE_SEC = 60 * 60;

/**
 * Edge-safe Auth.js config (no Prisma / Node-only imports).
 * Credentials authorize lives in auth.ts for the Node runtime.
 *
 * Cookie flags: Auth.js defaults httpOnly + sameSite=lax;
 * `secure` when AUTH_URL/useSecureCookies is HTTPS.
 */
export const authConfig = {
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SEC,
    updateAge: SESSION_UPDATE_AGE_SEC,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SEC,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname === "/profile" ||
        pathname.startsWith("/profile/") ||
        pathname.startsWith("/admin") ||
        pathname === "/billing" ||
        pathname.startsWith("/billing/") ||
        pathname.startsWith("/checkout/");
      if (isProtected) return !!auth;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.username = (user as { username?: string }).username;
        token.displayName = (user as { displayName?: string | null }).displayName;
        token.emailVerifiedAt = (
          user as { emailVerifiedAt?: string | null }
        ).emailVerifiedAt;
        token.sessionVersion =
          (user as { sessionVersion?: number }).sessionVersion ?? 0;
        delete (token as { email?: unknown }).email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.username = (token.username as string) ?? "";
        session.user.displayName =
          (token.displayName as string | null | undefined) ?? null;
        session.user.emailVerifiedAt =
          (token.emailVerifiedAt as string | null | undefined) ?? null;
        session.user.sessionVersion =
          (token.sessionVersion as number | undefined) ?? 0;
        // Never expose email on the session surface (AEAD / private).
        (session.user as { email?: string | null }).email = null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
