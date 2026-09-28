/**
 * Phase 9 admin e2e:
 * - non-admin blocked from /admin
 * - admin can manage case publish + report resolve
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

async function login(
  page: import("playwright").Page,
  username: string,
  password: string,
) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(/\/(profile|cases|fictional|admin)/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { username: "admin_ops" },
    select: { id: true, role: true },
  });
  if (admin.role !== "ADMIN") {
    throw new Error("admin_ops must have ADMIN role — run npm run db:seed");
  }

  const demo = await prisma.user.findUniqueOrThrow({
    where: { username: "demo_detective" },
    select: { id: true },
  });

  // Ensure a case exists to toggle publish
  let caseRow = await prisma.case.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, caseCode: true, published: true, slug: true },
  });
  if (!caseRow) {
    caseRow = await prisma.case.create({
      data: {
        caseCode: "DEV-ADMIN-E2E",
        title: "Admin E2E Stub Case",
        slug: "admin-e2e-stub-case",
        summary:
          "Seeded stub for Phase 9 admin e2e. Not a real crime. Label: REPORTED.",
        type: "UNKNOWN",
        status: "OPEN",
        priority: "LOW",
        contentLabel: "REPORTED",
        published: false,
        isDevStub: true,
      },
      select: { id: true, caseCode: true, published: true, slug: true },
    });
  }

  // Ensure an open report for moderation
  let report = await prisma.report.findFirst({
    where: { status: "OPEN" },
    select: { id: true },
  });
  if (!report) {
    report = await prisma.report.create({
      data: {
        reporterId: demo.id,
        targetType: "USER",
        targetId: demo.id,
        reason: "Phase 9 e2e open report",
        details: "Synthetic report for admin moderation test",
        status: "OPEN",
      },
      select: { id: true },
    });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // ── Non-admin blocked ──────────────────────────────────────────────────────
  await login(page, "demo_detective", "detective-demo-2026");
  await page.goto(`${BASE}/admin`);
  await page.waitForURL(/\/cases/, { timeout: 15000 });
  if (page.url().includes("/admin")) {
    throw new Error("Non-admin reached /admin");
  }
  console.log("OK non-admin blocked from /admin");

  // Clear session
  await page.context().clearCookies();

  // ── Admin manages case + report ────────────────────────────────────────────
  await login(page, "admin_ops", "detective-admin-2026");
  await page.goto(`${BASE}/admin`);
  await page.getByRole("heading", { name: /Command overview/i }).waitFor({
    timeout: 15000,
  });
  await page.getByText(/Command deck · ADMIN/i).waitFor();

  await page.goto(`${BASE}/admin/cases`);
  await page.getByRole("heading", { name: /^Real cases$/i }).waitFor({
    timeout: 10000,
  });

  const before = await prisma.case.findUniqueOrThrow({
    where: { id: caseRow.id },
    select: { published: true },
  });
  const publishLabel = before.published ? /^Unpublish$/i : /^Publish$/i;
  // Click first matching publish/unpublish on the list (scoped near case code if possible)
  const row = page.locator("tr", { hasText: caseRow.caseCode }).first();
  if ((await row.count()) > 0) {
    await row.getByRole("button", { name: publishLabel }).click();
  } else {
    await page.getByRole("button", { name: publishLabel }).first().click();
  }
  await page.waitForTimeout(1200);

  const after = await prisma.case.findUniqueOrThrow({
    where: { id: caseRow.id },
    select: { published: true },
  });
  if (after.published === before.published) {
    throw new Error("Case publish toggle did not persist");
  }
  console.log(
    `OK case ${caseRow.caseCode} published: ${before.published} → ${after.published}`,
  );

  // Toggle back to leave seed state roughly intact
  await page.reload();
  const revertLabel = after.published ? /^Unpublish$/i : /^Publish$/i;
  const row2 = page.locator("tr", { hasText: caseRow.caseCode }).first();
  if ((await row2.count()) > 0) {
    await row2.getByRole("button", { name: revertLabel }).click();
  } else {
    await page.getByRole("button", { name: revertLabel }).first().click();
  }
  await page.waitForTimeout(800);

  await page.goto(`${BASE}/admin/moderation`);
  await page.getByRole("heading", { name: /^Moderation$/i }).waitFor({
    timeout: 10000,
  });
  await page.getByRole("button", { name: /^Resolve$/i }).first().click();
  await page.waitForTimeout(1200);

  const resolved = await prisma.report.findUniqueOrThrow({
    where: { id: report.id },
    select: { status: true },
  });
  if (resolved.status !== "RESOLVED") {
    throw new Error(`Expected report RESOLVED, got ${resolved.status}`);
  }
  console.log("OK admin resolved report");

  await browser.close();
  await prisma.$disconnect();
  console.log("Phase 9 admin e2e passed");
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
