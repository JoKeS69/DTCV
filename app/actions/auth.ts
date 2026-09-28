"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { getPrisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createRawToken, hashToken } from "@/lib/tokens";

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username: letters, numbers, underscore")
    .transform((value) => value.toLowerCase()),
  email: z.string().trim().email("Valid email required").max(254),
  displayName: z.string().trim().max(64).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export type AuthActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  resetUrl?: string;
  verifyUrl?: string;
};

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    displayName: formData.get("displayName") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { username, email, password } = parsed.data;
  const displayName = parsed.data.displayName || username;
  const prisma = getPrisma();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: email.toLowerCase() }] },
  });
  if (existing) {
    return { ok: false, error: "Username or email already registered" };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      email: email.toLowerCase(),
      displayName,
      passwordHash,
    },
  });

  const rawVerify = createRawToken();
  await prisma.emailVerificationToken.create({
    data: {
      tokenHash: hashToken(rawVerify),
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const site = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const verifyUrl = `${site}/verify-email?token=${rawVerify}`;

  try {
    await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        ok: true,
        message: "Account created. Sign in to continue.",
        verifyUrl,
      };
    }
    throw error;
  }

  redirect("/profile");
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (username.length < 3 || password.length < 8) {
    return { ok: false, error: "Invalid credentials" };
  }

  const callbackUrl = String(formData.get("callbackUrl") || "/profile");

  try {
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    if (result && typeof result === "object" && "error" in result && result.error) {
      return { ok: false, error: "Invalid username or password" };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Invalid username or password" };
    }
    throw error;
  }

  redirect(callbackUrl.startsWith("/") ? callbackUrl : "/profile");
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!z.string().email().safeParse(email).success) {
    return { ok: false, error: "Enter a valid email" };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success-shaped response to avoid email enumeration.
  if (!user) {
    return {
      ok: true,
      message:
        "If that email is registered, a reset link was issued. Email delivery is a Phase 2 placeholder — check the reset URL below when shown in development.",
    };
  }

  const raw = createRawToken();
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(raw),
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });

  const site = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const resetUrl = `${site}/reset-password?token=${raw}`;

  return {
    ok: true,
    message:
      "Password reset token created. Email provider is not configured — use the development reset link below.",
    resetUrl,
  };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!token || password.length < 8) {
    return { ok: false, error: "Invalid reset request" };
  }

  const prisma = getPrisma();
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "Reset link is invalid or expired" };
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true, message: "Password updated. You can sign in." };
}

export async function verifyEmailAction(token: string): Promise<AuthActionState> {
  if (!token) return { ok: false, error: "Missing verification token" };

  const prisma = getPrisma();
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: "Verification link is invalid or expired" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true, message: "Email verified." };
}

export async function updateProfileAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName || displayName.length > 64) {
    return { ok: false, error: "Display name required (max 64)" };
  }

  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Not authenticated" };
  }

  await getPrisma().user.update({
    where: { id: session.user.id },
    data: { displayName },
  });

  return { ok: true, message: "Profile updated. Sign in again to refresh session display name." };
}
