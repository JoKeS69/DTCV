/**
 * Laptop DX: print effective ADMIN_USERNAME and every ADMIN row in the main DB.
 * Does not read cookies — for session username open /profile while logged in.
 *
 * Usage: npx tsx scripts/pb-case-whoami.ts
 */
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import {
  getAdminUsername,
  isPbCaseAdminUsername,
} from "../lib/pb-case/admin-username";

// Prefer .env.local (Next.js laptop convention) then .env
loadEnv({ path: ".env.local" });
loadEnv();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set (check .env / .env.local).");
    process.exit(1);
  }

  const adminUsername = getAdminUsername();
  console.log(`ADMIN_USERNAME (effective): ${adminUsername}`);
  console.log(
    `env ADMIN_USERNAME raw: ${JSON.stringify(process.env.ADMIN_USERNAME ?? "(unset)")}`,
  );
  console.log(`DATABASE_URL host/db: ${redactDbUrl(connectionString)}`);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: {
        username: true,
        role: true,
        suspendedAt: true,
        publicId: true,
      },
      orderBy: { username: "asc" },
    });

    if (admins.length === 0) {
      console.log("No ADMIN users in this database.");
      return;
    }

    console.log("ADMIN users:");
    for (const row of admins) {
      const pb = isPbCaseAdminUsername(row.username) && !row.suspendedAt;
      const sus = row.suspendedAt ? " suspended" : "";
      console.log(
        `  - ${row.username} | ${row.role}${sus} | publicId=${row.publicId} | /pb-case=${pb ? "YES" : "no"}`,
      );
    }
    console.log(
      "Session username: open http://localhost:3000/profile (Identity card) while logged in.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

function redactDbUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
