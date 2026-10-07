/**
 * LOCAL ONLY — reset (or create) the owner admin `abed` password in the main
 * Postgres DB (DATABASE_URL). Does not touch CASES_DATABASE_URL / research SQLite.
 *
 * Password source (first match):
 *   1. ADMIN_BOOTSTRAP_PASSWORD from .env.local / .env (may be empty or `@!@`)
 *   2. documented local default `@!@`
 *
 * Credentials authorize also accepts an empty password for any ADMIN role user
 * (local convenience). Access gates still use role/flags only — never hardcode
 * usernames in general gates.
 *
 * Usage: npm run db:reset-abed
 */
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { ADMIN_LOCAL_SPECIAL_PASSWORD } from "../lib/auth/admin-local-password";
import { sealEmail } from "../lib/crypto/email";
import { generatePublicDetectiveId } from "../lib/identity/public-id";
import { hashPassword } from "../lib/password";
import { getAdminUsername } from "../lib/pb-case/admin-username";

loadEnv({ path: ".env.local" });
loadEnv();

const DEFAULT_LOCAL_PASSWORD = ADMIN_LOCAL_SPECIAL_PASSWORD; // "@!@"

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set (check .env.local / .env).");
    process.exit(1);
  }

  const username = getAdminUsername(); // default abed
  const usedEnv = process.env.ADMIN_BOOTSTRAP_PASSWORD !== undefined;
  const password = usedEnv
    ? process.env.ADMIN_BOOTSTRAP_PASSWORD!
    : DEFAULT_LOCAL_PASSWORD;

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    // Hash `@!@` (or env override). Empty ADMIN_BOOTSTRAP_PASSWORD hashes "".
    // Authorize still accepts empty OR `@!@` for role ADMIN regardless of hash.
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
    if (usedEnv) {
      console.log(
        password === ""
          ? "Password hash set from empty ADMIN_BOOTSTRAP_PASSWORD."
          : "Password set from ADMIN_BOOTSTRAP_PASSWORD (.env.local / .env).",
      );
    } else {
      console.log(`Password set to local default: ${DEFAULT_LOCAL_PASSWORD}`);
    }
    console.log(
      "Sign in at /login: username + empty password, or @!@, or the hashed password above.",
    );
    console.log("(Auth uses main Postgres DATABASE_URL — not CASES_DATABASE_URL.)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
