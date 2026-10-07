import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { isAdminLocalPasswordBypass } from "@/lib/auth/admin-local-password";
import { getPrisma } from "@/lib/db";
import {
  hashPassword,
  needsRehash,
  verifyPassword,
} from "@/lib/password";

// Password may be empty (ADMIN local bypass). Length checks for normal users
// happen via hash verify failure; ADMIN empty/@!@ is accepted in authorize.
const credentialsSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().max(128),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse({
          username: raw?.username,
          password: raw?.password ?? "",
        });
        if (!parsed.success) return null;

        const username = parsed.data.username.trim().toLowerCase();
        const password = parsed.data.password;
        try {
          const user = await getPrisma().user.findUnique({
            where: { username },
          });
          if (!user) return null;
          if (user.suspendedAt) return null;

          const bypass = isAdminLocalPasswordBypass(user.role, password);
          const hashOk = await verifyPassword(password, user.passwordHash);
          if (!bypass && !hashOk) return null;

          // Only rehash when the submitted password matched the stored hash
          // (never rewrite the hash from an empty ADMIN bypass login).
          if (hashOk && needsRehash(user.passwordHash)) {
            const nextHash = await hashPassword(password);
            await getPrisma().user.update({
              where: { id: user.id },
              data: { passwordHash: nextHash },
            });
          }

          return {
            id: user.id,
            name: user.displayName ?? user.username,
            username: user.username,
            displayName: user.displayName,
            emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
            sessionVersion: user.sessionVersion,
            role: user.role,
          };
        } catch (error) {
          console.error("[auth] authorize failed", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
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
        token.role = (user as { role?: "USER" | "MODERATOR" | "ADMIN" }).role;
        delete (token as { email?: unknown }).email;
      }

      if (token.sub && typeof token.sessionVersion === "number") {
        try {
          const row = await getPrisma().user.findUnique({
            where: { id: token.sub },
            select: {
              sessionVersion: true,
              suspendedAt: true,
              role: true,
              username: true,
            },
          });
          if (!row || row.suspendedAt) {
            return {};
          }
          if (row.sessionVersion !== token.sessionVersion) {
            return {};
          }
          // Keep chrome role + username in sync with DB (role/username changes should not require re-login).
          token.role = row.role;
          token.username = row.username;
        } catch {
          // keep token if DB briefly unavailable
        }
      }

      return token;
    },
  },
});
