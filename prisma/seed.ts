/**
 * Production-safe seed — NO fabricated real crimes, NO demo user passwords.
 *
 * Seeds achievement catalog only (needed for fictional training awards when
 * that catalog is loaded separately).
 *
 * For local/CI demo users, DEV-* stubs, and FC-001/FC-002 training content:
 *   npm run db:seed:dev
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log("Production seed — achievements only (no real-case data)…");

  const achievements = [
    {
      code: "FIRST_BRIEFING",
      title: "First Briefing",
      description: "Open your first fictional case file.",
      xpReward: 25,
    },
    {
      code: "BOARD_BUILDER",
      title: "Board Builder",
      description: "Create five investigation connections.",
      xpReward: 50,
    },
    {
      code: "HOUSE_1147",
      title: "The House at 11:47",
      description: "Complete fictional case FC-001 with a passing score.",
      xpReward: 75,
    },
    {
      code: "SHARP_EYE",
      title: "Sharp Eye",
      description: "Score 90+ on a fictional case.",
      xpReward: 40,
    },
    {
      code: "PERFECT_CASE",
      title: "Perfect Case",
      description: "Score a perfect 100 on a fictional case.",
      xpReward: 60,
    },
    {
      code: "STREAK_3",
      title: "Three-Day Watch",
      description: "Maintain a 3-day fictional investigation streak.",
      xpReward: 35,
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: achievement,
      create: achievement,
    });
  }

  const counts = {
    achievements: await prisma.achievement.count(),
    realCases: await prisma.case.count({ where: { isDevStub: false } }),
    publishedCases: await prisma.case.count({
      where: { published: true, isDevStub: false },
    }),
    users: await prisma.user.count(),
    fictionalCases: await prisma.fictionalCase.count(),
  };

  console.log("Production seed complete:", counts);
  console.log(
    "Real Case table left untouched (no fabricated crimes). For local training/demo data run: npm run db:seed:dev",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
