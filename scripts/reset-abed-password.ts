/**
 * LOCAL ONLY — reset (or create) the owner admin `abed` password in the main
 * Postgres DB (DATABASE_URL). Does not touch CASES_DATABASE_URL / research SQLite.
 *
 * Password source (first match):
 *   1. ADMIN_BOOTSTRAP_PASSWORD from .env.local / .env
 *   2. documented local default detective-abed-2026
 *
 * Usage: npm run db:reset-abed
 */
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { sealEmail } from "../lib/crypto/email";
import { generatePublicDetectiveId } from "../lib/identity/public-id";
import { hashPassword } from "../lib/password";
import { getAdminUsername } from "../lib/pb-case/admin-username";

loadEnv({ path: ".env.local" });
loadEnv();

const DEFAULT_LOCAL_PASSWORD = "detective-abed-2026";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set (check .env.local / .env).");
    process.exit(1);
  }

  const username = getAdminUsername(); // default abed
  const fromEnv = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();
  const password = fromEnv && fromEnv.length >= 8 ? fromEnv : DEFAULT_LOCAL_PASSWORD;
  const usedEnv = Boolean(fromEnv && fromEnv.length >= 8);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const passwordHash = await hashPassword(password);
    const sealed = sealEmail(`${username}@detective.local`);

    await prisma.user.upsert({
      where: { username },
      update: {
        role: "ADMIN",
        passwordHash,
        email: null,
        emailEncrypted: sealed.emailEncrypted,
        emailBlindIndex: sealed.emailBlindIndex,
        emailVerifiedAt: new Date(),
        suspendedAt: null,
        displayName: username === "abed" ? "Abed" : username,
      },
      create: {
        username,
        email: null,
        emailEncrypted: sealed.emailEncrypted,
        emailBlindIndex: sealed.emailBlindIndex,
        displayName: username === "abed" ? "Abed" : username,
        passwordHash,
        emailVerifiedAt: new Date(),
        role: "ADMIN",
        publicId: generatePublicDetectiveId(),
        detectiveXP: 0,
        detectiveRank: "NOVICE",
        bio: "Local owner ADMIN (reset via db:reset-abed).",
      },
    });

    console.log(`Reset ADMIN user: ${username}`);
    console.log(
      usedEnv
        ? "Password set from ADMIN_BOOTSTRAP_PASSWORD (.env.local / .env)."
        : `Password set to local default: ${DEFAULT_LOCAL_PASSWORD}`,
    );
    console.log("Sign in at /login with that username + password.");
    console.log("(Auth uses main Postgres DATABASE_URL — not CASES_DATABASE_URL.)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
