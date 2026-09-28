import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config (no Prisma / Node-only imports).
 * Credentials authorize lives in auth.ts for the Node runtime.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname === "/profile" || pathname.startsWith("/profile/");
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
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
