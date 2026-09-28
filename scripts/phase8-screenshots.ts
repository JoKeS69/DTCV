import "dotenv/config";
import path from "node:path";
import { chromium } from "playwright";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const BASE = process.env.AUTH_URL || "http://127.0.0.1:3000";
const OUT = "/cursor/stores/self/media";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const demo = await prisma.user.findUniqueOrThrow({
    where: { username: "demo_detective" },
    select: { id: true },
  });
  const fc = await prisma.fictionalCase.findUniqueOrThrow({
    where: { caseCode: "FC-001" },
    include: {
      suspects: { take: 3, orderBy: { sortOrder: "asc" } },
      evidence: { take: 3, orderBy: { sortOrder: "asc" } },
      events: { take: 2, orderBy: { sortOrder: "asc" } },
    },
  });

  // Keep existing investigation if ACTIVE with nodes; else reset
  const inv = await prisma.investigation.findFirst({
    where: { userId: demo.id, fictionalCaseId: fc.id, status: "ACTIVE" },
    include: { boardNodes: true, connections: true },
  });
  if (!inv || inv.boardNodes.length < 2) {
    await prisma.investigation.deleteMany({
      where: { userId: demo.id, fictionalCaseId: fc.id },
    });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', "demo_detective");
  await page.fill('input[name="password"]', "detective-demo-2026");
  await Promise.all([
    page.waitForURL(/\/(profile|cases|fictional)/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);

  await page.goto(`${BASE}/fictional/${fc.slug}`);
  const start = page.getByRole("button", { name: /start investigation|continue investigation/i });
  if (await start.count()) {
    await start.click();
    await page.getByText(/status:\s*active/i).waitFor({ timeout: 10000 });
  }

  await page.goto(`${BASE}/fictional/${fc.slug}/board`);
  await page.getByText(/BOARD · FC-001/i).waitFor();

  // Ensure a few pins for a rich screenshot
  const toAdd = [
    ...fc.suspects.map((s) => `${s.code} · ${s.name}`),
    ...fc.evidence.map((e) => `${e.code} · ${e.title}`),
    ...fc.events.map((e) => e.title),
  ];
  for (const label of toAdd) {
    const btn = page.getByRole("button", {
      name: new RegExp(`^\\+\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(350);
    }
  }

  await page.getByRole("button", { name: /^Link$/ }).click();
  const pins = page.locator(".cursor-crosshair");
  if ((await pins.count()) >= 2) {
    await pins.nth(0).click();
    await page.waitForTimeout(150);
    await pins.nth(1).click();
    await page.waitForTimeout(500);
    if ((await pins.count()) >= 3) {
      await pins.nth(1).click();
      await page.waitForTimeout(150);
      await pins.nth(2).click();
      await page.waitForTimeout(500);
    }
  }
  await page.getByRole("button", { name: /^Move$/ }).click();

  await page.screenshot({
    path: path.join(OUT, "phase8-board-desktop.png"),
    fullPage: false,
  });

  await page.locator("aside").screenshot({
    path: path.join(OUT, "phase8-board-catalog.png"),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/fictional/${fc.slug}/board`);
  await page.getByText(/BOARD · FC-001/i).waitFor();
  await page.screenshot({
    path: path.join(OUT, "phase8-board-mobile.png"),
    fullPage: false,
  });

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`${BASE}/fictional/${fc.slug}`);
  await page.locator("text=> Investigation board").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(OUT, "phase8-case-board-link.png"),
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
