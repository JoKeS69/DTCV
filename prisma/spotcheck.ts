/**
 * Phase 3 spot-check — counts seeded fictional entities.
 * Does not print solution contents.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL required");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const fc = await prisma.fictionalCase.findUnique({
    where: { caseCode: "FC-001" },
    select: {
      caseCode: true,
      title: true,
      isFictional: true,
      _count: {
        select: {
          suspects: true,
          evidence: true,
          events: true,
          witnessStatements: true,
        },
      },
    },
  });

  const solutionExists = fc
    ? (await prisma.solution.count({
        where: { fictionalCase: { caseCode: "FC-001" } },
      })) === 1
    : false;

  const summary = {
    fictionalCase: fc,
    solutionPresent: solutionExists,
    demoUser: await prisma.user.findUnique({
      where: { username: "demo_detective" },
      select: { username: true, detectiveRank: true, detectiveXP: true },
    }),
    totals: {
      users: await prisma.user.count(),
      achievements: await prisma.achievement.count(),
      realCases: await prisma.case.count(),
      discussions: await prisma.discussion.count(),
    },
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!fc || !fc.isFictional) {
    throw new Error("FC-001 missing or not marked fictional");
  }
  if (fc._count.suspects !== 5) throw new Error("expected 5 suspects");
  if (fc._count.evidence !== 10) throw new Error("expected 10 evidence");
  if (fc._count.events !== 8) throw new Error("expected 8 events");
  if (fc._count.witnessStatements !== 5) {
    throw new Error("expected 5 witness statements");
  }
  if (!solutionExists) throw new Error("expected 1 solution");
  const crimeCases = await prisma.case.count({ where: { isDevStub: false } });
  if (crimeCases !== 0) {
    throw new Error("Must not seed non-dev real-crime case rows");
  }

  console.log("spotcheck OK");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
