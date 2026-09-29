/**
 * Production DB readiness check (Phase 14).
 * Verifies DATABASE_URL and basic connectivity via Prisma (no raw SQL).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }
  if (/USER:PASSWORD/.test(connectionString)) {
    console.warn(
      "WARN: DATABASE_URL looks like .env.example — confirm production credentials.",
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const [users, cases, fictional] = await Promise.all([
      prisma.user.count(),
      prisma.case.count({ where: { published: true } }),
      prisma.fictionalCase.count({ where: { published: true } }),
    ]);

    console.log(
      JSON.stringify(
        {
          ok: true,
          users,
          publishedCases: cases,
          publishedFictional: fictional,
          hint: "Run `npx prisma migrate deploy` before first production traffic.",
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
