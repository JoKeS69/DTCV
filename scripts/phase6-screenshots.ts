import "dotenv/config";
import path from "node:path";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const BASE = process.env.AUTH_URL || "http://127.0.0.1:3000";
const OUT = "/cursor/stores/self/media";
const connectionString = process.env.DATABASE_URL!;
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
    select: { id: true },
  });

  await prisma.investigation.deleteMany({
    where: { userId: demo.id, fictionalCaseId: fc.id },
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${BASE}/fictional`);
  await page.getByText(/fictional case files/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase6-fictional-list.png"),
    fullPage: false,
  });

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', "demo_detective");
  await page.fill('input[name="password"]', "detective-demo-2026");
  await Promise.all([
    page.waitForURL(/\/(profile|cases|fictional)/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE}/fictional/${fc.slug}`);
  await page.getByRole("button", { name: /start investigation/i }).click();
  await page.getByText(/status:\s*active/i).waitFor();
  await page.locator("text=> Case brief").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(OUT, "phase6-case-brief.png"),
    fullPage: false,
  });

  await page.locator("text=> Suspects").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(OUT, "phase6-case-suspects.png"),
    fullPage: false,
  });

  await page.locator("text=> Submit theory").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(OUT, "phase6-submit-theory.png"),
    fullPage: false,
  });

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
  await page.screenshot({
    path: path.join(OUT, "phase6-result.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/fictional/${fc.slug}`);
  await page.screenshot({
    path: path.join(OUT, "phase6-case-mobile.png"),
    fullPage: false,
  });

  console.log("Screenshots written to", OUT);
  await browser.close();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
