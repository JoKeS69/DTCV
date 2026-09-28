import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { getPrisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const credentialsSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128),
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
          password: raw?.password,
        });
        if (!parsed.success) return null;

        const username = parsed.data.username.trim().toLowerCase();
        try {
          const user = await getPrisma().user.findUnique({ where: { username } });
          if (!user) return null;
          if (user.suspendedAt) return null;

          const valid = await verifyPassword(
            parsed.data.password,
            user.passwordHash,
          );
          if (!valid) return null;

          return {
            id: user.id,
            name: user.displayName ?? user.username,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          };
        } catch (error) {
          console.error("[auth] authorize failed", error);
          return null;
        }
      },
    }),
  ],
});
