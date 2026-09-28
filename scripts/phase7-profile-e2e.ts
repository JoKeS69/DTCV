/**
 * Phase 7 profile/XP smoke test.
 * Completes a fictional case then asserts /profile shows XP, rank, achievements.
 */
import "dotenv/config";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const BASE = process.env.AUTH_URL || "http://127.0.0.1:3000";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL required");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const demo = await prisma.user.findUniqueOrThrow({
    where: { username: "demo_detective" },
    select: { id: true, detectiveXP: true },
  });
  const fc = await prisma.fictionalCase.findUniqueOrThrow({
    where: { caseCode: "FC-001" },
    select: { id: true, slug: true },
  });
  const culprit = await prisma.suspect.findFirstOrThrow({
    where: { fictionalCaseId: fc.id, code: "S2" },
    select: { id: true },
  });

  // Fresh investigation + clear score-based achievements so awards fire again
  await prisma.investigation.deleteMany({
    where: { userId: demo.id, fictionalCaseId: fc.id },
  });
  const clearCodes = ["HOUSE_1147", "SHARP_EYE", "PERFECT_CASE"];
  const achievements = await prisma.achievement.findMany({
    where: { code: { in: clearCodes } },
    select: { id: true },
  });
  await prisma.userAchievement.deleteMany({
    where: {
      userId: demo.id,
      achievementId: { in: achievements.map((a) => a.id) },
    },
  });

  const xpBefore = (
    await prisma.user.findUniqueOrThrow({
      where: { id: demo.id },
      select: { detectiveXP: true },
    })
  ).detectiveXP;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', "demo_detective");
  await page.fill('input[name="password"]', "detective-demo-2026");
  await Promise.all([
    page.waitForURL(/\/(profile|cases|fictional)/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE}/fictional/${fc.slug}`);
  await page.getByRole("button", { name: /start investigation/i }).click();
  await page.getByText(/status:\s*active/i).waitFor({ timeout: 10000 });

  await page.locator("select").selectOption(culprit.id);
  await page.locator("textarea").nth(1).fill(
    "Jonah staged a photo alibi, cut power during the blackout, and used the study window path.",
  );
  await page.locator("textarea").nth(2).fill(
    "23:44 camera burst, 23:47 blackout, breaker ~23:51, study window open after power returned.",
  );
  await page.locator("textarea").nth(3).fill(
    "E01 study window, E06 coat thread, E09 footprint, E10 note, E02 breaker scuff.",
  );
  await page.locator("textarea").nth(4).fill(
    "Jonah's false landing alibi fails: coat thread, footprint, note, and staged photo converge.",
  );
  await Promise.all([
    page.waitForURL(/\/result/, { timeout: 20000 }),
    page.getByRole("button", { name: /submit theory/i }).click(),
  ]);
  await page.getByText(/theory scorecard/i).waitFor();

  await page.goto(`${BASE}/profile`);
  await page.getByText(/DETECTIVE #/i).waitFor();
  await page.getByText(/Observer|Investigator|Detective|Recruit|Senior Detective|Master Detective/i).first().waitFor();
  await page.getByText(/XP from fictional ops/i).waitFor();
  await page.getByText(/Statistics \(fictional ops\)/i).waitFor();
  await page.getByText("The House at 11:47", { exact: true }).waitFor();
  await page.getByText(/Perfect Case/i).first().waitFor();
  await page.getByText(/Investigation history/i).waitFor();
  await page.getByRole("link", { name: /FC-001/i }).first().waitFor();

  const body = await page.locator("main").innerText();
  if (!/\d+\s*XP/i.test(body)) throw new Error("XP not visible on profile");

  const after = await prisma.user.findUniqueOrThrow({
    where: { id: demo.id },
    select: { detectiveXP: true, detectiveRank: true },
  });
  if (after.detectiveXP <= xpBefore) {
    throw new Error(`XP did not increase (${xpBefore} → ${after.detectiveXP})`);
  }

  const earned = await prisma.userAchievement.count({
    where: {
      userId: demo.id,
      achievement: { code: { in: clearCodes } },
    },
  });
  if (earned < 2) throw new Error(`Expected score achievements, got ${earned}`);

  await page.goto(`${BASE}/detectives/demo_detective`);
  await page.getByText(/DETECTIVE #/i).waitFor();
  await page.getByText(/Statistics \(fictional ops\)/i).waitFor();

  await page.goto(`${BASE}/fictional/rankings`);
  await page.getByText(/Fictional rankings/i).waitFor();
  await page.getByText(/demo_detective|Demo Detective/i).first().waitFor();

  console.log(
    JSON.stringify(
      {
        ok: true,
        xpBefore,
        xpAfter: after.detectiveXP,
        rank: after.detectiveRank,
        scoreAchievements: earned,
      },
      null,
      2,
    ),
  );

  await browser.close();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
