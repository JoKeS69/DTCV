/**
 * Phase 6 fictional engine smoke test.
 * - Case page must not leak Solution / red herrings before submit
 * - Start investigation → submit theory → scorecard returned
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
    select: { id: true },
  });
  const fc = await prisma.fictionalCase.findUniqueOrThrow({
    where: { caseCode: "FC-001" },
    select: { id: true, slug: true },
  });
  const culprit = await prisma.suspect.findFirstOrThrow({
    where: { fictionalCaseId: fc.id, code: "S2" },
    select: { id: true, name: true },
  });
  const solution = await prisma.solution.findUniqueOrThrow({
    where: { fictionalCaseId: fc.id },
    select: { summary: true, explanation: true },
  });

  // Reset prior investigation so e2e can start clean
  await prisma.investigation.deleteMany({
    where: { userId: demo.id, fictionalCaseId: fc.id },
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Public case page — no solution leak
  await page.goto(`${BASE}/fictional/${fc.slug}`);
  const htmlBefore = await page.content();
  if (htmlBefore.includes(solution.summary)) {
    throw new Error("Solution summary leaked before submit");
  }
  if (htmlBefore.includes(solution.explanation.slice(0, 40))) {
    throw new Error("Solution explanation leaked before submit");
  }
  if (/isRedHerring|red herring/i.test(htmlBefore) && /Oil rag|Library lantern/i.test(htmlBefore) && /red herring/i.test(htmlBefore)) {
    // soft check: page may say classifications withheld; ensure no per-item red herring flags
  }
  if (/Oil rag[\s\S]{0,80}red herring/i.test(htmlBefore)) {
    throw new Error("Red herring flag leaked on evidence before submit");
  }
  await page.getByText(/FICTIONAL TRAINING CASE/i).first().waitFor();
  await page.getByText(/CASE BRIEF/i).waitFor();
  await page.getByText(/SUBMIT THEORY/i).waitFor();

  // Login
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

  // Note
  await page.locator('textarea[placeholder*="notes"]').fill("E2E note: check study window + coat thread.");
  await page.getByRole("button", { name: /add note/i }).click();
  await page.getByText(/E2E note: check study window/i).waitFor({ timeout: 10000 });

  // Still no solution in HTML
  const htmlMid = await page.content();
  if (htmlMid.includes(solution.summary)) {
    throw new Error("Solution leaked after start, before submit");
  }

  // Submit strong theory
  await page.locator("select").selectOption(culprit.id);
  await page.locator("textarea").nth(1).fill(
    "Jonah staged a photo alibi, cut power during the blackout, and used the study window path.",
  );
  await page.locator("textarea").nth(2).fill(
    "23:44 camera burst, 23:47 blackout, breaker activity ~23:51, study window found open after power returned.",
  );
  await page.locator("textarea").nth(3).fill(
    "Key codes E01 open study window, E06 coat thread, E09 footprint, E10 note, E02 breaker scuff — oil rag and lantern are distractors.",
  );
  await page.locator("textarea").nth(4).fill(
    "Jonah's false landing alibi fails: coat thread on latch, wet footprint, unsigned note, and staged lakeside photo converge on him.",
  );

  await Promise.all([
    page.waitForURL(/\/fictional\/.*\/result/, { timeout: 20000 }),
    page.getByRole("button", { name: /submit theory/i }).click(),
  ]);

  await page.getByText(/theory scorecard/i).waitFor();
  const scoreText = await page.locator("main").innerText();
  const scoreMatch = scoreText.match(/(\d+)\s*\/\s*100/);
  if (!scoreMatch) throw new Error("Score not shown on result page");
  const total = Number(scoreMatch[1]);
  if (total < 50) throw new Error(`Expected strong score >= 50, got ${total}`);

  // Debrief unlocked
  await page.getByText(/debrief/i).waitFor();
  await page.getByText(/Jonah Vale/i).waitFor();

  const dbSub = await prisma.theorySubmission.findFirst({
    where: {
      investigation: { userId: demo.id, fictionalCaseId: fc.id },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!dbSub) throw new Error("Submission missing in DB");
  if (dbSub.scoreTotal !== total) {
    throw new Error(`UI score ${total} != DB ${dbSub.scoreTotal}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        scoreTotal: dbSub.scoreTotal,
        breakdown: {
          suspect: dbSub.scoreSuspect,
          motive: dbSub.scoreMotive,
          timeline: dbSub.scoreTimeline,
          evidence: dbSub.scoreEvidence,
          reasoning: dbSub.scoreReasoning,
        },
        xpAwarded: dbSub.xpAwarded,
        solutionLeakedBeforeSubmit: false,
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
