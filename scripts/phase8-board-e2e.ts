/**
 * Phase 8 board smoke test: add nodes, connect, move+save, reload persistence.
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
    include: {
      suspects: { take: 2, orderBy: { sortOrder: "asc" } },
      evidence: { take: 1, orderBy: { sortOrder: "asc" } },
    },
  });

  await prisma.investigation.deleteMany({
    where: { userId: demo.id, fictionalCaseId: fc.id },
  });

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
  await page.getByRole("button", { name: /start investigation/i }).click();
  await page.getByText(/status:\s*active/i).waitFor({ timeout: 10000 });

  await page.goto(`${BASE}/fictional/${fc.slug}/board`);
  await page.getByText(/BOARD · FC-001/i).waitFor({ timeout: 15000 });
  await page.getByText(/0 NODES/i).waitFor();

  const investigation = await prisma.investigation.findFirstOrThrow({
    where: { userId: demo.id, fictionalCaseId: fc.id },
    select: { id: true },
  });

  // Add specific catalog rows by label
  const labels = [
    `${fc.suspects[0]!.code} · ${fc.suspects[0]!.name}`,
    `${fc.suspects[1]!.code} · ${fc.suspects[1]!.name}`,
    `${fc.evidence[0]!.code} · ${fc.evidence[0]!.title}`,
  ];

  for (const label of labels) {
    await page.getByRole("button", { name: new RegExp(`^\\+\\s*${escapeRegExp(label)}$`, "i") }).click();
    await page.getByRole("button", { name: new RegExp(`^✓\\s*${escapeRegExp(label)}$`, "i") }).waitFor({
      timeout: 10000,
    });
  }

  const nodeCount = await prisma.investigationBoardNode.count({
    where: { investigationId: investigation.id },
  });
  if (nodeCount < 3) throw new Error(`Expected >=3 nodes, got ${nodeCount}`);

  // Link first two pins
  await page.getByRole("button", { name: /^Link$/ }).click();
  const pins = page.locator(".cursor-crosshair");
  await pins.nth(0).waitFor({ timeout: 5000 });
  await pins.nth(0).click();
  await page.getByText(/Link from:/i).waitFor({ timeout: 5000 });
  await pins.nth(1).click();
  await page.waitForTimeout(800);

  const connCount = await prisma.investigationConnection.count({
    where: { investigationId: investigation.id },
  });
  if (connCount < 1) throw new Error("Connection not persisted");

  // Move pin
  await page.getByRole("button", { name: /^Move$/ }).click();
  const movePins = page.locator(".cursor-grab");
  const first = await prisma.investigationBoardNode.findFirstOrThrow({
    where: { investigationId: investigation.id },
    orderBy: { createdAt: "asc" },
  });
  const box = await movePins.nth(0).boundingBox();
  if (!box) throw new Error("No pin to drag");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 140, box.y + 90, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(1000);

  const afterMove = await prisma.investigationBoardNode.findUniqueOrThrow({
    where: { id: first.id },
  });
  if (afterMove.x === first.x && afterMove.y === first.y) {
    throw new Error("Position did not persist after drag");
  }

  await page.reload();
  await page.getByText(/BOARD · FC-001/i).waitFor({ timeout: 15000 });
  await page.getByText(new RegExp(`${nodeCount} NODES`, "i")).waitFor();
  await page.getByText(new RegExp(`${connCount} LINKS`, "i")).waitFor();

  const persisted = await prisma.investigationBoardNode.findUniqueOrThrow({
    where: { id: first.id },
  });
  if (persisted.x !== afterMove.x || persisted.y !== afterMove.y) {
    throw new Error("Moved position not stable after reload");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        nodes: nodeCount,
        connections: connCount,
        moved: { x: persisted.x, y: persisted.y },
      },
      null,
      2,
    ),
  );

  await browser.close();
  await prisma.$disconnect();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
