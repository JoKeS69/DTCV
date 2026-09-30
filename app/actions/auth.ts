"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { lookupEmailBlindIndex } from "@/lib/crypto/email";
import { getPrisma } from "@/lib/db";
import { generatePublicDetectiveId } from "@/lib/identity/public-id";
import { hashPassword } from "@/lib/password";
import {
  AUTH_LIMITS,
  networkRateKey,
  rateLimit,
} from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/server/authz";
import {
  allowDevAuthLinks,
  safeCallbackPath,
} from "@/lib/security/callback";
import { createRawToken, hashToken } from "@/lib/tokens";

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username: letters, numbers, underscore")
    .transform((value) => value.toLowerCase()),
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

async function networkKey(prefix: string) {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || h.get("x-real-ip") || "unknown";
  return networkRateKey(prefix, ip);
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const rl = rateLimit(await networkKey("auth:register"), AUTH_LIMITS.register);
  if (!rl.ok) {
    return {
      ok: false,
      error: `Too many registrations. Retry in ${rl.retryAfterSec}s.`,
    };
  }

  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { username, password } = parsed.data;
  // Signup collects username + password only. Email is optional in schema;
  // leave sealed email columns null until a future profile/email-capture flow.
  // Display name defaults to username (editable later on profile).
  const displayName = username;
  const prisma = getPrisma();
  const publicId = generatePublicDetectiveId();

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { ok: false, error: "Username already registered" };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      username,
      email: null,
      emailEncrypted: null,
      emailBlindIndex: null,
      displayName,
      passwordHash,
      publicId,
    },
  });

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

  const rl = rateLimit(await networkKey("auth:login"), AUTH_LIMITS.login);
  if (!rl.ok) {
    return {
      ok: false,
      error: `Too many login attempts. Retry in ${rl.retryAfterSec}s.`,
    };
  }

  if (username.length < 3 || password.length < 8) {
    return { ok: false, error: "Invalid credentials" };
  }

  const callbackUrl = safeCallbackPath(
    String(formData.get("callbackUrl") || "/profile"),
  );

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

  redirect(callbackUrl);
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

  const rl = rateLimit(
    await networkKey("auth:reset"),
    AUTH_LIMITS.passwordReset,
  );
  if (!rl.ok) {
    return {
      ok: false,
      error: `Too many reset requests. Retry in ${rl.retryAfterSec}s.`,
    };
  }

  if (!z.string().email().safeParse(email).success) {
    return { ok: false, error: "Enter a valid email" };
  }

  const prisma = getPrisma();
  const blind = lookupEmailBlindIndex(email);
  const user =
    (await prisma.user.findUnique({ where: { emailBlindIndex: blind } })) ??
    (await prisma.user.findUnique({ where: { email } }));

  const genericMessage = allowDevAuthLinks()
    ? "If that email is registered, a reset link was issued. Development email placeholder is on — use the reset link below when shown."
    : "If that email is registered, a password reset was requested. Check your email when delivery is configured.";

  if (!user) {
    return { ok: true, message: genericMessage };
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

  if (allowDevAuthLinks()) {
    console.info("[auth] reset placeholder link", resetUrl);
    return {
      ok: true,
      message: genericMessage,
      resetUrl,
    };
  }

  console.info("[auth] password reset token issued (email not configured)");
  return { ok: true, message: genericMessage };
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
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
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

  const gate = await requireActiveUser();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }

  await getPrisma().user.update({
    where: { id: gate.user.id },
    data: { displayName },
  });

  return {
    ok: true,
    message:
      "Profile updated. Sign in again to refresh session display name.",
  };
}
